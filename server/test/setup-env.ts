import { config } from "dotenv";

const result = config({
  path: ".env.test",
  override: true,
});

if (result.error) {
  throw result.error;
}

if (process.env.NODE_ENV !== "test") {
  throw new Error(
    "Integration tests require NODE_ENV=test.",
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Integration tests require DATABASE_URL.",
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//, ""));

if (databaseName !== "findwork_test" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedDatabaseUrl.hostname) ||
    (parsedDatabaseUrl.searchParams.has("schema") && parsedDatabaseUrl.searchParams.get("schema") !== "public")) {
  throw new Error(
    "Refusing to run tests outside local findwork_test.",
  );
}
