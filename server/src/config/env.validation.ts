export type NodeEnvironment = "development" | "test" | "production";

export interface ValidatedEnvironment {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGINS: string[];
  DATABASE_URL: string;

  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  REFRESH_TOKEN_PEPPER: string;
  EMAIL_DELIVERY_MODE: "disabled" | "resend";
  EMAIL_WORKER_ENABLED: string;
  EMAIL_ACTIVE_KEY_ID: string;
  EMAIL_KEYRING_JSON: string;
  EMAIL_VERIFY_URL: string;
  EMAIL_RESEND_API_KEY: string;
  EMAIL_FROM: string;
}

const ALLOWED_NODE_ENVIRONMENTS = new Set<NodeEnvironment>([
  "development",
  "test",
  "production",
]);

function parsePort(value: unknown): number {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function parseApiPrefix(value: unknown): string {
  const prefix = String(value ?? "api/v1")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!prefix) {
    throw new Error("API_PREFIX must not be empty.");
  }

  return prefix;
}

function parseCorsOrigins(value: unknown): string[] {
  const origins = String(value ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin.");
  }

  if (origins.includes("*")) {
    throw new Error(
      "CORS_ORIGINS must not contain wildcard (*) when credentials are enabled.",
    );
  }

  for (const origin of origins) {
    let parsed: URL;

    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        `CORS origin must be an HTTP(S) origin without path/query/hash: ${origin}`,
      );
    }
  }

  return origins;
}

function parseDatabaseUrl(value: unknown): string {
  const databaseUrl = String(value ?? "").trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }

  return databaseUrl;
}

function parsePositiveInteger(
  value: unknown,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value ?? defaultValue);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function parseSecret(
  value: unknown,
  name: string,
  nodeEnv: NodeEnvironment,
): string {
  const secret = String(value ?? "").trim();

  if (secret.length < 32) {
    throw new Error(`${name} must contain at least 32 characters.`);
  }

  if (
    nodeEnv === "production" &&
    secret.toUpperCase().includes("CHANGE_ME")
  ) {
    throw new Error(`${name} must not use a placeholder in production.`);
  }

  return secret;
}

function emailDeliveryConfig(raw: Record<string, unknown>, env: NodeEnvironment) {
  const mode = String(raw.EMAIL_DELIVERY_MODE ?? "disabled");
  if (mode !== "disabled" && mode !== "resend") throw new Error("EMAIL_DELIVERY_MODE invalid");
  const workerEnabled = String(raw.EMAIL_WORKER_ENABLED ?? "false");
  if (workerEnabled !== "true" && workerEnabled !== "false") throw new Error("EMAIL_WORKER_ENABLED invalid");
  if (workerEnabled === "true" && mode !== "resend") throw new Error("EMAIL_WORKER_ENABLED requires resend mode");
  const activeKeyId = String(raw.EMAIL_ACTIVE_KEY_ID ?? "");
  const ringJson = String(raw.EMAIL_KEYRING_JSON ?? "");
  const verifyUrl = String(raw.EMAIL_VERIFY_URL ?? "");
  const apiKey = String(raw.EMAIL_RESEND_API_KEY ?? "");
  const sender = String(raw.EMAIL_FROM ?? "");
  if (mode === "resend") {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(activeKeyId)) throw new Error("EMAIL_ACTIVE_KEY_ID invalid");
    let ring: unknown;
    try { ring = JSON.parse(ringJson); } catch { throw new Error("EMAIL_KEYRING_JSON invalid"); }
    const encoded = ring && typeof ring === "object" && !Array.isArray(ring)
      ? (ring as Record<string, unknown>)[activeKeyId] : null;
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded) ||
      Buffer.from(encoded, "base64").length !== 32 ||
      Buffer.from(encoded, "base64").toString("base64") !== encoded) {
      throw new Error("EMAIL_KEYRING_JSON missing valid active key");
    }
    let url: URL;
    try { url = new URL(verifyUrl); } catch { throw new Error("EMAIL_VERIFY_URL invalid"); }
    if ((url.protocol !== "https:" && !(env !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
      url.username || url.password || url.hash || url.searchParams.has("token")) {
      throw new Error("EMAIL_VERIFY_URL must use HTTPS and contain no token");
    }
    if (!apiKey || apiKey.length < 16 || /\s/.test(apiKey)) throw new Error("EMAIL_RESEND_API_KEY invalid");
    if (!/^[^\r\n<>]+<[^\s<>@]+@[^\s<>@]+>$|^[^\s<>@]+@[^\s<>@]+$/.test(sender)) {
      throw new Error("EMAIL_FROM invalid");
    }
  }
  return {
    EMAIL_DELIVERY_MODE: mode as "disabled" | "resend",
    EMAIL_WORKER_ENABLED: workerEnabled,
    EMAIL_ACTIVE_KEY_ID: activeKeyId,
    EMAIL_KEYRING_JSON: ringJson,
    EMAIL_VERIFY_URL: verifyUrl,
    EMAIL_RESEND_API_KEY: apiKey,
    EMAIL_FROM: sender,
  };
}

export function validateEnvironment(
  raw: Record<string, unknown>,
): ValidatedEnvironment & Record<string, unknown> {
  const nodeEnv = String(raw.NODE_ENV ?? "development") as NodeEnvironment;

  if (!ALLOWED_NODE_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error(
      "NODE_ENV must be development, test, or production.",
    );
  }

  const jwtAccessSecret = parseSecret(
    raw.JWT_ACCESS_SECRET,
    "JWT_ACCESS_SECRET",
    nodeEnv,
  );

  const refreshTokenPepper = parseSecret(
    raw.REFRESH_TOKEN_PEPPER,
    "REFRESH_TOKEN_PEPPER",
    nodeEnv,
  );

  if (jwtAccessSecret === refreshTokenPepper) {
    throw new Error(
      "JWT_ACCESS_SECRET and REFRESH_TOKEN_PEPPER must be different.",
    );
  }

  return {
    ...raw,
    NODE_ENV: nodeEnv,
    PORT: parsePort(raw.PORT),
    API_PREFIX: parseApiPrefix(raw.API_PREFIX),
    CORS_ORIGINS: parseCorsOrigins(raw.CORS_ORIGINS),
    DATABASE_URL: parseDatabaseUrl(raw.DATABASE_URL),

    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_TTL_SECONDS: parsePositiveInteger(
      raw.JWT_ACCESS_TTL_SECONDS,
      "JWT_ACCESS_TTL_SECONDS",
      900,
      60,
      3600,
    ),
    REFRESH_TOKEN_TTL_DAYS: parsePositiveInteger(
      raw.REFRESH_TOKEN_TTL_DAYS,
      "REFRESH_TOKEN_TTL_DAYS",
      30,
      1,
      90,
    ),
    REFRESH_TOKEN_PEPPER: refreshTokenPepper,
    ...emailDeliveryConfig(raw, nodeEnv),
  };
}
