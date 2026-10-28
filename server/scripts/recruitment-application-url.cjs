"use strict";
const assert = require("node:assert/strict");

const DEMO_APPLICATION_URL = "http://127.0.0.1:5177/candidate/applications";

function validateRecruitmentApplicationUrl(raw, nodeEnv) {
  assert.equal(typeof raw, "string", "Application URL must be a string");
  const url = new URL(raw);
  assert.ok(!url.username && !url.password && !url.search && !url.hash,
    "Application URL contains unexpected components");
  if (url.protocol === "http:") {
    assert.equal(nodeEnv, "test", "Loopback HTTP requires the test environment");
    assert.equal(raw, DEMO_APPLICATION_URL,
      "Loopback HTTP must match the exact same-machine demo application route");
  } else {
    assert.equal(url.protocol, "https:", "Application URL must use HTTPS");
  }
  return url;
}

module.exports = { DEMO_APPLICATION_URL, validateRecruitmentApplicationUrl };
