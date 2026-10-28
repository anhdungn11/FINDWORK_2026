const { validateRecruitmentApplicationUrl, DEMO_APPLICATION_URL } =
  require("../scripts/recruitment-application-url.cjs");

describe("one-job application URL policy", () => {
  it("accepts only the exact same-machine demo route over HTTP in test", () => {
    expect(validateRecruitmentApplicationUrl(DEMO_APPLICATION_URL, "test").href)
      .toBe(DEMO_APPLICATION_URL);
    for (const candidate of [
      "http://localhost:5177/candidate/applications",
      "http://127.0.0.1:5178/candidate/applications",
      "http://127.0.0.1:5177/candidate/applications/",
      "http://127.0.0.1:5177/candidate/applications?next=/admin",
      "http://127.0.0.1:5177/candidate/applications#fragment",
      "http://user@127.0.0.1:5177/candidate/applications",
      "http://127.0.0.2:5177/candidate/applications",
    ]) {
      expect(() => validateRecruitmentApplicationUrl(candidate, "test")).toThrow();
    }
  });

  it("requires HTTPS outside test and rejects unsafe HTTPS components", () => {
    expect(() => validateRecruitmentApplicationUrl(DEMO_APPLICATION_URL, "production")).toThrow();
    expect(() => validateRecruitmentApplicationUrl(DEMO_APPLICATION_URL, "development")).toThrow();
    expect(validateRecruitmentApplicationUrl(
      "https://demo.example.test/candidate/applications", "production").protocol).toBe("https:");
    for (const candidate of [
      "https://user@demo.example.test/candidate/applications",
      "https://demo.example.test/candidate/applications?token=x",
      "https://demo.example.test/candidate/applications#x",
      "ftp://demo.example.test/candidate/applications",
    ]) {
      expect(() => validateRecruitmentApplicationUrl(candidate, "production")).toThrow();
    }
  });
});
