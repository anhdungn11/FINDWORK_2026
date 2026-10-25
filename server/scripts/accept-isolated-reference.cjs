// Public read-only HTTP catalog contract. No registration or database writes.
const base = "http://127.0.0.1:3002/api/v1";
const expectedWardTotal = Number(process.env.FINDWORK_ACCEPT_EXPECT_WARDS ?? "126");
async function get(path) {
  const response = await fetch(base + path, { headers: { Origin: "http://127.0.0.1:5177" } });
  return { status: response.status, body: await response.json(), cors: response.headers.get("access-control-allow-origin") };
}
async function main() {
  const provinces = await get("/reference/provinces?page=1&pageSize=10");
  const accentless = await get("/reference/provinces?q=Ha%20Noi&page=1&pageSize=10");
  const accented = await get("/reference/provinces?q=H%C3%A0%20N%E1%BB%99i&page=1&pageSize=10");
  const wards = await get("/reference/wards?provinceCode=01&page=1&pageSize=10");
  const first = await get("/reference/wards?page=1&pageSize=100");
  const middle = await get("/reference/wards?page=17&pageSize=100");
  const last = await get("/reference/wards?page=34&pageSize=100");
  const beyond = await get("/reference/wards?page=35&pageSize=100");
  const unicode = await get("/reference/wards?provinceCode=38&q=Sam%20Son");
  const invalid = await get("/reference/wards?provinceCode=ZZ");
  const result = { provinceStatus: provinces.status, provinceTotal: provinces.body.pagination?.total,
    provincePageSize: provinces.body.data?.length, accentlessCode: accentless.body.data?.[0]?.code,
    accentedCode: accented.body.data?.[0]?.code, wardStatus: wards.status,
    wardTotal: wards.body.pagination?.total, nationalWardTotal: first.body.pagination?.total,
    middlePageItems: middle.body.data?.length, lastPageItems: last.body.data?.length,
    beyondPageItems: beyond.body.data?.length,
    accentlessWardCodeFound: unicode.body.data?.some((row) => row.code === "16531"),
    invalidQueryStatus: invalid.status,
    corsOrigin: provinces.cors };
  console.log(JSON.stringify(result));
  if (provinces.status !== 200 || provinces.body.pagination?.total !== 34 || provinces.body.data?.length !== 10 ||
      accentless.status !== 200 || accentless.body.data?.[0]?.code !== "01" ||
      accented.status !== 200 || accented.body.data?.[0]?.code !== "01" ||
      wards.status !== 200 || wards.body.pagination?.total !== expectedWardTotal ||
      wards.body.data?.some((row) => row.provinceCode !== "01") ||
      first.status !== 200 || first.body.pagination?.total !== 3321 || first.body.data?.length !== 100 ||
      middle.status !== 200 || middle.body.data?.length !== 100 ||
      last.status !== 200 || last.body.data?.length !== 21 ||
      beyond.status !== 200 || beyond.body.data?.length !== 0 ||
      unicode.status !== 200 || !unicode.body.data?.some((row) => row.code === "16531" && row.provinceCode === "38") ||
      invalid.status !== 400 ||
      provinces.cors !== "http://127.0.0.1:5177") throw new Error("Reference HTTP contract mismatch");
}
main().catch((error) => { console.error(`REFERENCE_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
