import assert from "node:assert/strict";
import { test } from "node:test";
import { useAuthStore } from "../authStore";
import type { ResumeBuilderContent, ResumeBuilderSettings } from "../../features/resume/types/resume.types";

test("builder CVs rehydrate after account switch, PDF blobs do not, and legacy data stays unclaimed", async () => {
  const entries = new Map<string, string>();
  const revoked: string[] = [];
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:alice-pdf";
  URL.revokeObjectURL = (url: string) => { revoked.push(url); };
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: storage } });
  entries.set("findwork.mock.builder-resumes.v7.alice", JSON.stringify([{ id: "alice-cv", sourceType: "builder" }]));
  // The old unscoped key has no owner proof and must not be silently adopted.
  entries.set("findwork.mock.builder-resumes.v7", JSON.stringify([{ id: "legacy-cv", sourceType: "builder" }]));
  try {
    useAuthStore.getState().setAuth({ id: "alice", email: "alice@example.test" }, "a-token");
    const { resumeService } = await import("../../features/resume/services/resumeService");
    assert.equal((await resumeService.list())[0]?.id, "alice-cv");

    const aliceBuilder = await resumeService.createBuilderResume({
      name: "Alice Builder",
      templateCode: "classic",
      content: { fullName: "Alice" } as ResumeBuilderContent,
      settings: { fontFamily: "sans" } as ResumeBuilderSettings,
    });
    const alicePdf = await resumeService.createUploadedResume({
      name: "Alice PDF",
      file: { name: "alice.pdf", type: "application/pdf", size: 100 } as File,
    });
    assert.equal((await resumeService.getById(alicePdf.id))?.currentVersion.file?.previewUrl, "blob:alice-pdf");
    assert.deepEqual(revoked, []);
    assert.ok(entries.get("findwork.mock.builder-resumes.v7.alice")?.includes(aliceBuilder.id));
    assert.ok(!entries.get("findwork.mock.builder-resumes.v7.alice")?.includes(alicePdf.id));

    useAuthStore.getState().clearAuth();
    assert.deepEqual(await resumeService.list(), []);
    assert.deepEqual(revoked, []); // Revoke after the old preview can unmount.
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(revoked, ["blob:alice-pdf"]);

    useAuthStore.getState().setAuth({ id: "bob", email: "bob@example.test" }, "b-token");
    assert.deepEqual(await resumeService.list(), []);
    assert.equal(entries.has("findwork.mock.builder-resumes.v7.bob"), false);
    const bobBuilder = await resumeService.createBuilderResume({
      name: "Bob Builder",
      templateCode: "classic",
      content: { fullName: "Bob" } as ResumeBuilderContent,
      settings: { fontFamily: "sans" } as ResumeBuilderSettings,
    });
    assert.deepEqual((await resumeService.list()).map((resume) => resume.id), [bobBuilder.id]);

    assert.ok(entries.has("findwork.mock.builder-resumes.v7"));
    useAuthStore.getState().setAuth({ id: "alice", email: "alice@example.test" }, "a-token");
    assert.deepEqual((await resumeService.list()).map((resume) => resume.id), [aliceBuilder.id, "alice-cv"]);
    assert.equal(await resumeService.getById(bobBuilder.id), null);
    assert.equal(await resumeService.getById(alicePdf.id), null);
  } finally {
    useAuthStore.getState().clearAuth();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    Reflect.deleteProperty(globalThis, "window");
  }
});
