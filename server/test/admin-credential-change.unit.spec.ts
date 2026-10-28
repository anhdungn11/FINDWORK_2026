const { assertPasswordPolicy, parsePrivatePassword, assertDbUrl } =
  require("../scripts/change-demo-admin-credentials.cjs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

describe("restricted demo Admin credential change", () => {
  it("requires a 16–128 character password with no surrounding whitespace or controls", () => {
    expect(() => assertPasswordPolicy("short")) .toThrow();
    expect(() => assertPasswordPolicy("x".repeat(129))).toThrow();
    expect(() => assertPasswordPolicy(" 1234567890123456")).toThrow();
    expect(() => assertPasswordPolicy("1234567890123456\n")) .toThrow();
    expect(() => assertPasswordPolicy("1234567890123456")).not.toThrow();
  });

  it("accepts exactly one private password entry without exposing its value", () => {
    expect(parsePrivatePassword("NEW_ADMIN_PASSWORD=1234567890123456\n")).toHaveLength(16);
    expect(() => parsePrivatePassword("NEW_ADMIN_PASSWORD=1234567890123456\nOTHER=x\n")).toThrow();
    expect(() => parsePrivatePassword("ADMIN_PASSWORD=1234567890123456\n")).toThrow();
  });

  it("pins the protected local database and public schema", () => {
    const valid = "postgresql://operator@127.0.0.1:5432/findwork_employer_media_3002?schema=public";
    expect(() => assertDbUrl(valid)).not.toThrow();
    for (const bad of [
      valid.replace("127.0.0.1", "localhost"),
      valid.replace(":5432", ":55432"),
      valid.replace("findwork_employer_media_3002", "findwork_test"),
      valid.replace("schema=public", "schema=other"),
    ]) expect(() => assertDbUrl(bad)).toThrow();
  });

  it("rejects apply before loading private input without the explicit gate", () => {
    const script = path.resolve(__dirname, "../scripts/change-demo-admin-credentials.cjs");
    const child = spawnSync(process.execPath, [script, "--apply"], {
      encoding: "utf8", env: { ...process.env, FINDWORK_ADMIN_CREDENTIAL_CHANGE_APPLY: "" },
    });
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain("APPLY_GATE");
  });
});
