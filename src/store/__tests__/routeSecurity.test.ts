import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getReturnDestination } from "../../app/router/returnDestination";
import { getCandidateRouteState } from "../../app/guards/CandidateRoute";
import { parseJobId } from "../../app/router/jobId";

test("private route guard waits for refresh and denies anonymous access", () => {
  assert.equal(getCandidateRouteState("idle", false), "loading");
  assert.equal(getCandidateRouteState("loading", false), "loading");
  assert.equal(getCandidateRouteState("loggingOut", false), "loading");
  assert.equal(getCandidateRouteState("unauthenticated", false), "denied");
  assert.equal(getCandidateRouteState("authenticated", false), "denied");
  assert.equal(getCandidateRouteState("authenticated", true), "allowed");
});

test("CV and application routes use the guard while public listings remain outside it", () => {
  const router = readFileSync(new URL("../../app/router/AppRouter.tsx", import.meta.url), "utf8");
  const guardedPublicLayout = router.slice(
    router.indexOf('<Route element={<CandidateRoute />}>'),
    router.indexOf('</Route>', router.indexOf('<Route element={<CandidateRoute />}>')),
  );
  for (const route of ["jobs/:id/apply", "cv", "cv/create", "cv/:resumeId/edit", "cv/:resumeId/preview"]) {
    assert.ok(guardedPublicLayout.includes(`path="${route}"`), route);
  }
  for (const route of ["jobs", "jobs/:id", "companies", "companies/:id"]) {
    assert.ok(router.indexOf(`path="${route}"`) < router.indexOf('<Route element={<CandidateRoute />}>'), route);
  }
});

test("login return destinations remain local and preserve private deep links", () => {
  for (const path of ["/candidate", "/candidate/profile", "/candidate/onboarding?step=2#skills", "/cv", "/cv/create", "/cv/resume-1/edit?source=center", "/cv/resume-1/preview#top", "/jobs/1/apply", "/jobs/550e8400-e29b-41d4-a716-446655440000/apply"]) {
    assert.equal(getReturnDestination(path), path);
  }
  for (const path of [
    "https://evil.example", "//evil.example", "/\\evil.example", "/jobs", "/companies/1",
    "/candidate.evil", "/candidate/unknown", "/candidate/profile/extra", "/cv.evil",
    "/cv/unknown", "/cv/create/edit/extra", "/cv/x/unknown", "/jobs/0/apply",
    "/jobs/no-such-job/apply", "/jobs/1/apply/extra", "/cv//preview",
    "/cv/%2f%2fevil/preview", "/candidate/%2e%2e/admin", "/candidate/../admin",
    "/candidate?x=%5c", "/candidate#%0aevil", "/candidate?x=%ZZ",
    "/candidate\n", null,
  ]) {
    assert.equal(getReturnDestination(path), "/candidate");
  }
});

test("job IDs distinguish mock records from backend UUIDs without coercion", () => {
  assert.deepEqual(parseJobId("1"), { kind: "mock", id: 1 });
  assert.deepEqual(parseJobId("9007199254740991"), { kind: "mock", id: Number.MAX_SAFE_INTEGER });
  assert.deepEqual(parseJobId("550e8400-e29b-41d4-a716-446655440000"), {
    kind: "backend", id: "550e8400-e29b-41d4-a716-446655440000",
  });
  for (const value of [undefined, "", "0", "-1", "1.5", "01", "1e2", "9007199254740992", "not-a-job", "550e8400-e29b-41d4-a716-44665544000z", "550e8400%2de29b-41d4-a716-446655440000"]) {
    assert.deepEqual(parseJobId(value), { kind: "invalid" });
  }
});

test("application UI states explicitly that submission is unavailable", () => {
  const page = readFileSync(new URL("../../pages/candidate/JobApplicationPage/JobApplicationPage.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("Chưa hỗ trợ gửi đơn ứng tuyển"));
  assert.ok(page.includes("Chưa có đơn ứng tuyển nào được gửi"));
  assert.ok(!page.includes("applicationPrototypeService.submit"));
});

test("UUID and invalid application IDs never mount the mock application flow", () => {
  const page = readFileSync(new URL("../../pages/candidate/JobApplicationPage/JobApplicationPage.tsx", import.meta.url), "utf8");
  const mockComponent = page.indexOf("const MockJobApplicationPage =");
  assert.ok(mockComponent > 0);
  assert.ok(page.indexOf("return <MockJobApplicationPage", 0) < mockComponent);
  assert.ok(page.indexOf('parsedJobId.kind === "invalid"') < mockComponent);
  assert.ok(page.indexOf('parsedJobId.kind === "backend"') < mockComponent);
  assert.ok(!page.slice(0, mockComponent).includes("useApplicationFlow("));
  assert.ok(page.slice(mockComponent).includes("useApplicationFlow({ jobId })"));
  assert.ok(!page.includes("jobId: 0"));
});

test("public job detail preserves mock IDs and handles backend IDs explicitly", () => {
  const page = readFileSync(new URL("../../pages/public/JobDetailPage/JobDetailPage.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("parseJobId(id)"));
  assert.ok(page.includes("Chưa hỗ trợ hiển thị tin tuyển dụng này"));
  assert.ok(!page.includes("Number(id)"));
});
