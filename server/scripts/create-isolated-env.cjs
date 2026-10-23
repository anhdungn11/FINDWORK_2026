// One-time local setup. Writes only the ignored integration env file; never logs secrets.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const dotenv = require("dotenv");

const sourceFile = process.env.FINDWORK_SOURCE_ENV_FILE;
const storage = process.env.FINDWORK_MEDIA_STORAGE_DIR;
if (!sourceFile || !storage) throw new Error("Source env file and media storage path are required");
const sourceUrl = dotenv.parse(fs.readFileSync(sourceFile)).DATABASE_URL;
const url = new URL(sourceUrl);
if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
    url.port !== "5432" || url.pathname !== "/findwork_dev") {
  throw new Error("Unexpected source database credential identity");
}
const normalized = path.resolve(storage);
const repo = path.resolve(__dirname, "..", "..");
if (normalized.toLowerCase().startsWith(repo.toLowerCase() + path.sep) ||
    !path.isAbsolute(storage) || !fs.statSync(normalized).isDirectory() ||
    fs.lstatSync(normalized).isSymbolicLink()) {
  throw new Error("Media storage must be an existing private directory outside the repository");
}
url.pathname = "/findwork_employer_media_3002";
const destination = path.resolve(__dirname, "..", ".env.employer-media.local");
if (fs.existsSync(destination)) throw new Error("Local integration environment already exists; refusing overwrite");
const settings = {
  NODE_ENV: "test", PORT: "3002", API_PREFIX: "api/v1",
  CORS_ORIGINS: "http://127.0.0.1:5177,http://localhost:5177",
  COMPANY_MEDIA_STORAGE_DIR: normalized, DATABASE_URL: url.toString(),
  JWT_ACCESS_SECRET: randomBytes(48).toString("hex"),
  REFRESH_TOKEN_PEPPER: randomBytes(48).toString("hex"),
  EMAIL_DELIVERY_MODE: "disabled", EMAIL_WORKER_ENABLED: "false",
  EMAIL_INVITATION_DELIVERY_ENABLED: "false",
};
fs.writeFileSync(destination, Object.entries(settings).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
console.log("CREATED ignored isolated environment for Backend 3002, Frontend 5177, and the dedicated database");
