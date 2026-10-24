// Real HTTP acceptance. Creates test-owned identities/company only in the isolated DB.
const { randomUUID } = require("node:crypto");
const base = process.env.FINDWORK_ACCEPT_BASE || "http://127.0.0.1:3002/api/v1";
const origin = "http://127.0.0.1:5177";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pX8AAAAASUVORK5CYII=", "base64");

async function call(method, path, { token, json, form } = {}) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const res = await fetch(base + path, { method, headers, body: json ? JSON.stringify(json) : form });
  const content = res.headers.get("content-type") || "";
  const body = content.includes("application/json") ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, body };
}
function expectStatus(result, status, name) {
  if (result.status !== status) throw new Error(`${name}: expected ${status}, got ${result.status}, code=${result.body?.code || "none"}`);
  console.log(`${name}: HTTP ${status}${result.body?.code ? ` ${result.body.code}` : ""}`);
}
async function main() {
  const health = await call("GET", "/health");
  expectStatus(health, 200, "health");
  if (health.body.database !== "up") throw new Error("Database unavailable");
  const suffix = randomUUID().slice(0, 8);
  const password = `Integration-${randomUUID()}!`;
  async function register(type, label) {
    const result = await call("POST", "/auth/register/v2", {
      json: { email: `integration-${label}-${suffix}@example.invalid`, password, accountType: type },
    });
    expectStatus(result, 201, `register ${label}`);
    if (result.body.user.accountType !== type) throw new Error(`Wrong persisted account type for ${label}`);
    return result.body.accessToken;
  }
  const owner = await register("EMPLOYER", "owner");
  const outsider = await register("EMPLOYER", "outsider");
  const candidate = await register("CANDIDATE", "candidate");
  const created = await call("POST", "/companies", {
    token: owner, json: { name: `Integration Media ${suffix}`, slug: `integration-media-${suffix}` },
  });
  expectStatus(created, 201, "company create");
  const companyId = created.body.id ?? created.body.data?.id;
  if (!companyId) throw new Error("Company ID missing from create response");
  if (created.body.verificationStatus !== "UNVERIFIED") throw new Error("Company was incorrectly verified");
  const mine = await call("GET", "/companies/me", { token: owner });
  expectStatus(mine, 200, "OWNER membership read");
  if (!JSON.stringify(mine.body).includes(companyId)) throw new Error("New company missing from owner's workspace");
  expectStatus(await call("GET", `/companies/${companyId}/profile`, { token: owner }), 200, "company profile read");
  const updatedProfile = await call("PATCH", `/companies/${companyId}/profile`, {
    token: owner, json: {
      legalName: `Integration Media Legal ${suffix}`,
      taxCode: String(Date.now()).slice(-10),
      description: "Isolated integration test company profile",
    },
  });
  expectStatus(updatedProfile, 200, "company profile update");
  const reloadedProfile = await call("GET", `/companies/${companyId}/profile`, { token: owner });
  expectStatus(reloadedProfile, 200, "company profile persistence");
  if (reloadedProfile.body.description !== "Isolated integration test company profile") {
    throw new Error("Updated company profile did not persist");
  }
  const invalidProvince = await call("POST", `/companies/${companyId}/locations`, {
    token: owner, json: { countryCode: "VN", provinceId: randomUUID(), addressLine: "Invalid province" },
  });
  expectStatus(invalidProvince, 400, "invalid province location denied");
  if (invalidProvince.body.code !== "COMPANY_LOCATION_REFERENCE_INVALID") throw new Error("Invalid reference accepted");
  const emptyLocation = await call("POST", `/companies/${companyId}/locations`, { token: owner, json: {} });
  expectStatus(emptyLocation, 400, "empty location denied");
  if (emptyLocation.body.code !== "COMPANY_LOCATION_EMPTY") throw new Error("Empty location accepted");
  const location = await call("POST", `/companies/${companyId}/locations`, {
    token: owner, json: { addressLine: "Isolated integration location" },
  });
  expectStatus(location, 201, "company location create");
  if (!location.body.isHeadquarters) throw new Error("First location was not headquarters");
  expectStatus(await call("GET", `/companies/${companyId}/locations`, { token: owner }), 200, "company locations read");
  const legal = await call("PATCH", `/companies/${companyId}/legal`, { token: owner,
    json: { registeredAddress: "1 Integration Street, Ha Noi, Viet Nam", representativeName: "Integration Owner",
      representativeTitle: "Director", contactEmail: `legal-${suffix}@example.invalid`, contactPhone: "+84901234567" } });
  expectStatus(legal, 200, "legal entity update");
  const evidenceForm = new FormData();
  evidenceForm.append("kind", "BUSINESS_REGISTRATION");
  evidenceForm.append("file", new Blob([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n")],
    { type: "application/pdf" }), "business-registration.pdf");
  expectStatus(await call("POST", `/companies/${companyId}/legal/evidence`, { token: outsider, form: evidenceForm }), 403, "cross-company legal evidence denied");
  expectStatus(await call("POST", `/companies/${companyId}/legal/evidence`, { token: owner, form: evidenceForm }), 201, "private legal evidence upload");
  const verification = await call("POST", `/companies/${companyId}/verification-request`, { token: owner });
  expectStatus(verification, 200, "legal verification request");
  if (verification.body.verificationStatus !== "PENDING") throw new Error("Verification request must remain pending");
  const path = `/companies/${companyId}/media/logo`;
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "integration-logo.png");
  expectStatus(await call("PUT", path, { token: candidate, form }), 403, "candidate upload denied");
  expectStatus(await call("PUT", path, { token: outsider, form }), 403, "cross-company upload denied");
  const uploaded = await call("PUT", path, { token: owner, form });
  expectStatus(uploaded, 200, "owner multipart upload");
  if (uploaded.body.kind !== "logo" || uploaded.body.available !== true) throw new Error("Upload response mismatch");
  const publicProfile = await call("GET", `/companies/${companyId}`);
  expectStatus(publicProfile, 200, "public company response");
  if (publicProfile.body.logoUrl !== `/api/v1/companies/${companyId}/media/logo`) throw new Error("Public logo URL missing");
  for (const label of ["public GET", "public GET after refresh"]) {
    const fetched = await call("GET", path);
    expectStatus(fetched, 200, label);
    if (fetched.headers.get("content-type") !== "image/png" ||
        fetched.headers.get("cache-control") !== "no-store" || !fetched.body.equals(png)) {
      throw new Error(`${label}: image bytes or safe headers mismatch`);
    }
  }
  expectStatus(await call("PUT", path, { token: owner, form }), 200, "owner logo replacement");
  expectStatus(await call("GET", path), 200, "public GET after replacement");
  expectStatus(await call("DELETE", path, { token: outsider }), 403, "cross-company delete denied");
  const removed = await call("DELETE", path, { token: owner });
  expectStatus(removed, 200, "owner delete");
  if (removed.body.available !== false) throw new Error("Delete response mismatch");
  expectStatus(await call("GET", path), 404, "public GET after delete");
  const coverPath = `/companies/${companyId}/media/cover`;
  expectStatus(await call("PUT", coverPath, { token: owner, form }), 200, "owner cover upload");
  const cover = await call("GET", coverPath);
  expectStatus(cover, 200, "public cover GET");
  if (cover.headers.get("content-type") !== "image/png" || !cover.body.equals(png)) {
    throw new Error("Cover media bytes or type mismatch");
  }
  expectStatus(await call("DELETE", coverPath, { token: owner }), 200, "owner cover delete");
  expectStatus(await call("GET", coverPath), 404, "public cover GET after delete");
  console.log(`MEDIA_ACCEPTANCE_PASS company=${companyId}; fixtures remain isolated in findwork_employer_media_3002`);
}
main().catch((error) => { console.error(`MEDIA_ACCEPTANCE_FAIL ${error.message}`); process.exitCode = 1; });
