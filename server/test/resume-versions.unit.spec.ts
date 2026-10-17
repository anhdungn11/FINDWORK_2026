import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CandidateResumesController } from "../src/modules/candidate/candidate-resumes.controller";
import { CandidateResumesService } from "../src/modules/candidate/candidate-resumes.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";

const userId = "11111111-1111-4111-8111-111111111111";
const resumeId = "22222222-2222-4222-8222-222222222222";
const input = { name: "Updated CV", builderContent: { headline: "Engineer" }, expectedVersionNumber: 1 };

function fixture() {
  const tx = {
    resume: {
      findFirst: jest.fn().mockResolvedValue({ id: resumeId, sourceType: "BUILDER", status: "READY", versions: [{ versionNumber: 1 }] }),
      update: jest.fn().mockResolvedValue({ id: resumeId }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: resumeId, versions: [{ versionNumber: 2 }] }),
    },
    resumeVersion: { create: jest.fn().mockResolvedValue({ id: "version-2" }) },
  };
  const db = { $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)) };
  return { tx, service: new CandidateResumesService(db as never) };
}

describe("builder resume version persistence", () => {
  it("requires session and own-scope update permission", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateResumesController)).toEqual([AccessTokenGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CandidateResumesController.prototype.update)).toEqual(["resume.update"]);
  });

  it("checks ownership and expected version before writing", async () => {
    const { tx, service } = fixture();
    tx.resume.findFirst.mockResolvedValueOnce(null);
    await expect(service.update(userId, resumeId, input)).rejects.toMatchObject({ status: 404 });
    expect(tx.resume.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: resumeId, candidateProfile: { userId }, deletedAt: null },
    }));
    tx.resume.findFirst.mockResolvedValueOnce({ id: resumeId, sourceType: "BUILDER", status: "READY", versions: [{ versionNumber: 2 }] });
    await expect(service.update(userId, resumeId, input)).rejects.toMatchObject({ status: 409 });
    expect(tx.resumeVersion.create).not.toHaveBeenCalled();
  });

  it("creates version N+1 and updates the name in one transaction", async () => {
    const { tx, service } = fixture();
    await expect(service.update(userId, resumeId, input)).resolves.toMatchObject({ versions: [{ versionNumber: 2 }] });
    expect(tx.resumeVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      resumeId, versionNumber: 2, builderContent: input.builderContent,
    }) });
    expect(tx.resume.update).toHaveBeenCalledWith({ where: { id: resumeId }, data: { name: input.name } });
  });
});
