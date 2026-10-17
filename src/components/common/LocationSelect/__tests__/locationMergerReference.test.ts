import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  searchProvincesWithMergers,
  HISTORICAL_PROVINCE_MERGERS,
} from "../locationMergerReference";
import { VIETNAM_PROVINCES } from "../../../../data/reference/locations/provinces";

describe("locationMergerReference", () => {
  it("returns all 34 official provinces when query is empty", () => {
    const all = searchProvincesWithMergers("");
    assert.equal(all.length, VIETNAM_PROVINCES.length);
    assert.equal(all.length, 34);
  });

  it("finds official province directly by official name", () => {
    const results = searchProvincesWithMergers("Đà Nẵng");
    assert.ok(results.length > 0);
    assert.equal(results[0].name, "Thành phố Đà Nẵng");
    assert.equal(results[0].code, "48");
  });

  it("finds official province by historical merger alias 'Hà Tây'", () => {
    const results = searchProvincesWithMergers("Hà Tây");
    assert.ok(results.length > 0);
    const haNoi = results.find((r) => r.code === "01");
    assert.ok(haNoi !== undefined);
    assert.equal(haNoi?.name, "Thành phố Hà Nội");
    assert.equal(haNoi?.matchedAlias, "Hà Tây");
  });

  it("finds official province by historical merger alias 'Sông Bé'", () => {
    const results = searchProvincesWithMergers("Sông Bé");
    assert.ok(results.length > 0);
    const dongNai = results.find((r) => r.code === "75");
    assert.ok(dongNai !== undefined);
    assert.equal(dongNai?.name, "Tỉnh Đồng Nai");
    assert.equal(dongNai?.matchedAlias, "Sông Bé");
  });

  it("finds official province by historical merger alias 'Hà Nam Ninh'", () => {
    const results = searchProvincesWithMergers("Hà Nam Ninh");
    assert.ok(results.length > 0);
    const ninhBinh = results.find((r) => r.code === "37");
    assert.ok(ninhBinh !== undefined);
    assert.equal(ninhBinh?.name, "Tỉnh Ninh Bình");
    assert.equal(ninhBinh?.matchedAlias, "Hà Nam Ninh");
  });

  it("returns empty array for completely nonexistent locations", () => {
    const results = searchProvincesWithMergers("NonExistentProvinceXYZ123");
    assert.deepEqual(results, []);
  });

  it("verifies all historical mergers point to valid official provinces", () => {
    const validCodes = new Set(VIETNAM_PROVINCES.map((p) => p.code));
    for (const merger of HISTORICAL_PROVINCE_MERGERS) {
      assert.ok(
        validCodes.has(merger.officialProvinceCode),
        `Merger ${merger.alias} has invalid province code: ${merger.officialProvinceCode}`,
      );
    }
  });
});
