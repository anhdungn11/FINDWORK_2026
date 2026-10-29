import "reflect-metadata";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { REQUIRED_PLATFORM_CAPABILITY_KEY } from "../src/modules/authorization/decorators/require-platform-capability.decorator";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { CompanyMessagingController } from "../src/modules/messaging/messaging.controller";

const companyId = "11111111-1111-4111-8111-111111111111";
const methods = ["list", "messages", "send", "read"] as const;

describe("company messaging platform capability", () => {
  const reflector = new Reflector();
  const authorization = { resolveRequiredCompanyPermissions: jest.fn() };
  const db = { companyPlatformCapability: { findUnique: jest.fn() } };
  const guard = new CompanyPermissionGuard(
    reflector,
    authorization as unknown as AuthorizationService,
    db as unknown as PrismaService,
  );

  const context = (method: typeof methods[number], request: Record<string, unknown>) => ({
    getHandler: () => CompanyMessagingController.prototype[method],
    getClass: () => CompanyMessagingController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    authorization.resolveRequiredCompanyPermissions.mockResolvedValue({
      allowed: true, context: { companyId, permissions: {} },
    });
  });

  it.each(methods)("requires application.view capability for %s", async (method) => {
    const handler = CompanyMessagingController.prototype[method];
    expect(reflector.getAllAndOverride(REQUIRED_PLATFORM_CAPABILITY_KEY,
      [handler, CompanyMessagingController])).toBe("application.view");
    db.companyPlatformCapability.findUnique.mockResolvedValue({
      isGranted: false, company: { status: "ACTIVE" },
    });
    const request = { auth: { userId: "owner", user: { accountType: "EMPLOYER" } },
      params: { companyId } };
    await expect(guard.canActivate(context(method, request))).rejects.toMatchObject({
      response: expect.objectContaining({ code: "PLATFORM_CAPABILITY_DENIED" }),
    });
    expect(db.companyPlatformCapability.findUnique).toHaveBeenCalledWith({
      where: { companyId_capabilityCode: { companyId, capabilityCode: "application.view" } },
      select: { isGranted: true, company: { select: { status: true } } },
    });
  });

  it("allows an active company with the existing capability", async () => {
    db.companyPlatformCapability.findUnique.mockResolvedValue({
      isGranted: true, company: { status: "ACTIVE" },
    });
    const request: Record<string, unknown> = {
      auth: { userId: "owner", user: { accountType: "EMPLOYER" } }, params: { companyId },
    };
    await expect(guard.canActivate(context("messages", request))).resolves.toBe(true);
    expect(request.companyAuthorization).toMatchObject({ companyId });
  });

  it("rejects a foreign company before checking capabilities", async () => {
    authorization.resolveRequiredCompanyPermissions.mockResolvedValue({ allowed: false, context: null });
    const request = { auth: { userId: "owner", user: { accountType: "EMPLOYER" } },
      params: { companyId } };
    await expect(guard.canActivate(context("messages", request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.companyPlatformCapability.findUnique).not.toHaveBeenCalled();
  });
});