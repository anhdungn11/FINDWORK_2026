// Public read-only HTTP catalog contract. No registration or database writes.
const base = "http://127.0.0.1:3002/api/v1";
const expectedWardTotal = Number(process.env.FINDWORK_ACCEPT_EXPECT_WARDS ?? "0");
async function get(path) {
  const response = await fetch(base + path, { headers: { Origin: "http://127.0.0.1:5177" } });
  return { status: response.status, body: await response.json(), cors: response.headers.get("access-control-allow-origin") };
}
async function main() {
  const provinces = await get("/reference/provinces?page=1&pageSize=10");
  const accentless = await get("/reference/provinces?q=Ha%20Noi&page=1&pageSize=10");
  const accented = await get("/reference/provinces?q=H%C3%A0%20N%E1%BB%99i&page=1&pageSize=10");
  const wards = await get("/reference/wards?provinceCode=01&page=1&pageSize=10");
  const invalid = await get("/reference/wards?provinceCode=ZZ");
  const result = { provinceStatus: provinces.status, provinceTotal: provinces.body.pagination?.total,
    provincePageSize: provinces.body.data?.length, accentlessCode: accentless.body.data?.[0]?.code,
    accentedCode: accented.body.data?.[0]?.code, wardStatus: wards.status,
    wardTotal: wards.body.pagination?.total, invalidQueryStatus: invalid.status,
    corsOrigin: provinces.cors };
  console.log(JSON.stringify(result));
  if (provinces.status !== 200 || provinces.body.pagination?.total !== 34 || provinces.body.data?.length !== 10 ||
      accentless.status !== 200 || accentless.body.data?.[0]?.code !== "01" ||
      accented.status !== 200 || accented.body.data?.[0]?.code !== "01" ||
      wards.status !== 200 || wards.body.pagination?.total !== expectedWardTotal || invalid.status !== 400 ||
      provinces.cors !== "http://127.0.0.1:5177") throw new Error("Reference HTTP contract mismatch");
}
main().catch((error) => { console.error(`REFERENCE_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
