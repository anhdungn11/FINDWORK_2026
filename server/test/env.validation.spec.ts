import { validateEnvironment } from "../src/config/env.validation";

const VALID_ENV = {
  DATABASE_URL:
    "postgresql://user:password@localhost:5432/findwork_test",
  JWT_ACCESS_SECRET:
    "test-jwt-access-secret-that-is-long-enough-123456789",
  REFRESH_TOKEN_PEPPER:
    "test-refresh-token-pepper-that-is-different-987654321",
};

describe("validateEnvironment", () => {
  it("normalizes defaults for a valid PostgreSQL configuration", () => {
    const result = validateEnvironment(VALID_ENV);

    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe(3000);
    expect(result.API_PREFIX).toBe("api/v1");
    expect(result.CORS_ORIGINS).toEqual([
      "http://localhost:5173",
    ]);

    expect(result.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(result.REFRESH_TOKEN_TTL_DAYS).toBe(30);
  });

  it("rejects a missing database URL", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        DATABASE_URL: undefined,
      }),
    ).toThrow("DATABASE_URL is required");
  });

  it("rejects a short JWT access secret", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        JWT_ACCESS_SECRET: "too-short",
      }),
    ).toThrow(
      "JWT_ACCESS_SECRET must contain at least 32 characters",
    );
  });

  it("rejects a short refresh token pepper", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        REFRESH_TOKEN_PEPPER: "too-short",
      }),
    ).toThrow(
      "REFRESH_TOKEN_PEPPER must contain at least 32 characters",
    );
  });

  it("rejects identical JWT secret and refresh pepper", () => {
    const sameSecret =
      "same-secret-that-is-at-least-thirty-two-characters";

    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        JWT_ACCESS_SECRET: sameSecret,
        REFRESH_TOKEN_PEPPER: sameSecret,
      }),
    ).toThrow(
      "JWT_ACCESS_SECRET and REFRESH_TOKEN_PEPPER must be different",
    );
  });

  it("rejects wildcard CORS with credentials", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        CORS_ORIGINS: "*",
      }),
    ).toThrow(
      "CORS_ORIGINS must not contain wildcard (*) when credentials are enabled",
    );
  });

  it("rejects CORS origins containing a path", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        CORS_ORIGINS:
          "http://localhost:5173/some-path",
      }),
    ).toThrow(
      "CORS origin must be an HTTP(S) origin without path/query/hash",
    );
  });

  it("rejects production placeholder secrets", () => {
    expect(() =>
      validateEnvironment({
        ...VALID_ENV,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET:
          "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_123456789",
      }),
    ).toThrow(
      "JWT_ACCESS_SECRET must not use a placeholder in production",
    );
  });
});