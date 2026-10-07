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

const databaseName = new URL(databaseUrl)
  .pathname
  .replace(/^\//, "");

if (databaseName !== "findwork_test") {
  throw new Error(
    `Refusing to run tests against database: ${databaseName}`,
  );
}