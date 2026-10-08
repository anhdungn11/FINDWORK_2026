import "reflect-metadata";
import {
  BadRequestException,
  type ExecutionContext,
  ForbiddenException,
  type INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AuthorizationRepository } from "../src/modules/authorization/authorization.repository";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { RequireCompanyPermissions } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import {
  type CompanyAuthorizedRequest,
  CompanyPermissionGuard,
} from "../src/modules/authorization/guards/company-permission.guard";
import { PermissionResolverService } from "../src/modules/authorization/services/permission-resolver.service";

const TEST_PERMISSION_CODE =
  "phase4.2.company.job.manage";
const TEST_PERMISSION_PREFIX = "phase4.2.";
const TEST_USER_DOMAIN =
  "@company-authorization.test";
const TEST_ROLE_PREFIX = "phase42_";
const TEST_COMPANY_SLUG_PREFIX = "phase42-";

class CompanyAuthorizationTestController {
  @RequireCompanyPermissions(TEST_PERMISSION_CODE)
  protectedRoute(): void {}
}

function executionContextFor(
  request: CompanyAuthorizedRequest,
): ExecutionContext {
  return {
    getHandler: () =>
      CompanyAuthorizationTestController.prototype
        .protectedRoute,
    getClass: () =>
      CompanyAuthorizationTestController,
    switchToHttp: () =>
      ({
        getRequest: () => request,
      }) as ReturnType<
        ExecutionContext["switchToHttp"]
      >,
  } as unknown as ExecutionContext;
}

describe("Company authorization integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorizationService: AuthorizationService;
  let companyPermissionGuard: CompanyPermissionGuard;

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);

    const databaseUrl =
      configService.getOrThrow<string>(
        "DATABASE_URL",
      );

    const databaseName = new URL(databaseUrl)
      .pathname
      .replace(/^\//, "");

    if (databaseName !== "findwork_test") {
      throw new Error(
        `Refusing destructive company authorization tests against ${databaseName}`,
      );
    }

    await app.init();

    prisma = app.get(PrismaService);
    authorizationService = app.get(
      AuthorizationService,
    );
    companyPermissionGuard = app.get(
      CompanyPermissionGuard,
    );
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData(): Promise<void> {
    if (!prisma) {
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        emailNormalized: {
          endsWith: TEST_USER_DOMAIN,
        },
      },
      select: {
        id: true,
      },
    });

    const userIds = users.map((user) => user.id);

    const companies =
      await prisma.company.findMany({
        where: {
          OR: [
            {
              createdByUserId: {
                in: userIds,
              },
            },
            {
              slug: {
                startsWith:
                  TEST_COMPANY_SLUG_PREFIX,
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

    const companyIds = companies.map(
      (company) => company.id,
    );

    const members =
      await prisma.companyMember.findMany({
        where: {
          OR: [
            {
              companyId: {
                in: companyIds,
              },
            },
            {
              userId: {
                in: userIds,
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

    const memberIds = members.map(
      (member) => member.id,
    );

    const roles = await prisma.role.findMany({
      where: {
        OR: [
          {
            companyId: {
              in: companyIds,
            },
          },
          {
            normalizedName: {
              startsWith: TEST_ROLE_PREFIX,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const roleIds = roles.map((role) => role.id);

    const permissions =
      await prisma.permission.findMany({
        where: {
          code: {
            startsWith:
              TEST_PERMISSION_PREFIX,
          },
        },
        select: {
          id: true,
        },
      });

    const permissionIds = permissions.map(
      (permission) => permission.id,
    );

    await prisma.systemUserPermission.deleteMany({
      where: {
        OR: [
          {
            userId: {
              in: userIds,
            },
          },
          {
            permissionId: {
              in: permissionIds,
            },
          },
          {
            assignedByUserId: {
              in: userIds,
            },
          },
        ],
      },
    });

    await prisma.companyMemberPermission.deleteMany({
      where: {
        OR: [
          {
            companyId: {
              in: companyIds,
            },
          },
          {
            companyMemberId: {
              in: memberIds,
            },
          },
          {
            permissionId: {
              in: permissionIds,
            },
          },
          {
            assignedByUserId: {
              in: userIds,
            },
          },
        ],
      },
    });

    await prisma.companyMemberRole.deleteMany({
      where: {
        OR: [
          {
            companyId: {
              in: companyIds,
            },
          },
          {
            companyMemberId: {
              in: memberIds,
            },
          },
          {
            roleId: {
              in: roleIds,
            },
          },
          {
            assignedByUserId: {
              in: userIds,
            },
          },
        ],
      },
    });

    await prisma.rolePermission.deleteMany({
      where: {
        OR: [
          {
            roleId: {
              in: roleIds,
            },
          },
          {
            permissionId: {
              in: permissionIds,
            },
          },
        ],
      },
    });

    await prisma.role.deleteMany({
      where: {
        id: {
          in: roleIds,
        },
      },
    });

    await prisma.companyMember.deleteMany({
      where: {
        id: {
          in: memberIds,
        },
      },
    });

    await prisma.company.deleteMany({
      where: {
        id: {
          in: companyIds,
        },
      },
    });

    await prisma.authSession.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    await prisma.permission.deleteMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
    });
  }

  async function createUser(localPart: string) {
    const email =
      `${localPart}${TEST_USER_DOMAIN}`;

    return prisma.user.create({
      data: {
        email,
        emailNormalized: email.toLowerCase(),
        passwordHash:
          "phase4.2-company-authorization-test-hash",
      },
    });
  }

  async function createCompany(
    creatorUserId: string,
    suffix: string,
  ) {
    return prisma.company.create({
      data: {
        createdByUserId: creatorUserId,
        name: `Phase 4.2 ${suffix}`,
        slug:
          `${TEST_COMPANY_SLUG_PREFIX}${suffix}`,
      },
    });
  }

  async function createMembership(
    userId: string,
    companyId: string,
    status:
      | "ACTIVE"
      | "INACTIVE"
      | "REMOVED" = "ACTIVE",
  ) {
    return prisma.companyMember.create({
      data: {
        userId,
        companyId,
        status,
        removedAt:
          status === "REMOVED"
            ? new Date()
            : null,
      },
    });
  }

  async function createPermission(
    options?: {
      code?: string;
      isDeprecated?: boolean;
    },
  ) {
    const code =
      options?.code ?? TEST_PERMISSION_CODE;

    return prisma.permission.create({
      data: {
        code,
        resource: "phase4_2_company_job",
        action: "manage",
        description:
          "Phase 4.2 company authorization integration test permission.",
        isProtected: true,
        isDeprecated:
          options?.isDeprecated ?? false,
      },
    });
  }

  async function createCompanyRole(
    companyId: string,
    suffix: string,
    isActive = true,
  ) {
    const normalizedName =
      `${TEST_ROLE_PREFIX}${suffix}`;

    return prisma.role.create({
      data: {
        kind: "COMPANY",
        companyId,
        name: `Phase 4.2 ${suffix}`,
        normalizedName,
        isProtected: false,
        isActive,
      },
    });
  }

  async function grantRolePermission(
    roleId: string,
    permissionId: string,
    dataScope: "ASSIGNED" | "COMPANY",
  ) {
    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
        dataScope,
      },
    });
  }

  async function assignCompanyRole(
    companyId: string,
    companyMemberId: string,
    roleId: string,
    assignedByUserId: string,
  ) {
    return prisma.companyMemberRole.create({
      data: {
        companyId,
        companyMemberId,
        roleId,
        assignedByUserId,
      },
    });
  }

  async function grantDirectPermission(
    companyId: string,
    companyMemberId: string,
    permissionId: string,
    assignedByUserId: string,
    options: {
      effect: "ALLOW" | "DENY";
      dataScope:
        | "ASSIGNED"
        | "COMPANY"
        | null;
      expiresAt?: Date | null;
    },
  ) {
    return prisma.companyMemberPermission.create({
      data: {
        companyId,
        companyMemberId,
        permissionId,
        assignedByUserId,
        effect: options.effect,
        dataScope: options.dataScope,
        expiresAt:
          options.expiresAt ?? null,
      },
    });
  }

  function authenticatedRequest(
    user: Awaited<ReturnType<typeof createUser>>,
    companyId: string,
  ): CompanyAuthorizedRequest {
    return {
      auth: {
        userId: user.id,
        sessionId:
          "00000000-0000-4000-8000-000000000042",
        user: {
          id: user.id,
          email: user.email,
          status: "ACTIVE",
          emailVerified: false,
        },
      },
      params: {
        companyId,
      },
    } as unknown as CompanyAuthorizedRequest;
  }

  it("allows an ACTIVE company member through a company role grant", async () => {
    const user = await createUser("role-allow");
    const company = await createCompany(
      user.id,
      "role-allow",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "role-allow",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(true);
    expect(result.context).toMatchObject({
      userId: user.id,
      companyId: company.id,
      companyMemberId: member.id,
    });
    expect(
      result.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "COMPANY",
      source: "ROLE",
    });
  });

  it("denies when the user has no membership in the requested company", async () => {
    const user = await createUser("no-membership");
    const creator = await createUser(
      "no-membership-creator",
    );
    const company = await createCompany(
      creator.id,
      "no-membership",
    );

    await createPermission();

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
    expect(result.context).toBeNull();
  });

  it.each(["INACTIVE", "REMOVED"] as const)(
    "denies a %s company membership",
    async (status) => {
      const user = await createUser(
        `membership-${status.toLowerCase()}`,
      );
      const company = await createCompany(
        user.id,
        `membership-${status.toLowerCase()}`,
      );
      await createMembership(
        user.id,
        company.id,
        status,
      );
      await createPermission();

      const result =
        await authorizationService.resolveRequiredCompanyPermissions(
          user.id,
          company.id,
          [TEST_PERMISSION_CODE],
        );

      expect(result.allowed).toBe(false);
      expect(result.context).toBeNull();
    },
  );

  it("keeps SYSTEM grants independent from company authorization", async () => {
    const user = await createUser("system-independent");
    const company = await createCompany(
      user.id,
      "system-independent",
    );
    await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();

    await prisma.systemUserPermission.create({
      data: {
        userId: user.id,
        permissionId: permission.id,
        effect: "ALLOW",
        dataScope: "SYSTEM",
        assignedByUserId: user.id,
      },
    });

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
    expect(result.context).toBeNull();
  });

  it("does not leak a role grant from one company into another company", async () => {
    const user = await createUser("cross-company");
    const companyA = await createCompany(
      user.id,
      "cross-company-a",
    );
    const companyB = await createCompany(
      user.id,
      "cross-company-b",
    );
    const memberA = await createMembership(
      user.id,
      companyA.id,
    );
    await createMembership(
      user.id,
      companyB.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      companyA.id,
      "cross-company",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      companyA.id,
      memberA.id,
      role.id,
      user.id,
    );

    const allowedInA =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        companyA.id,
        [TEST_PERMISSION_CODE],
      );
    const deniedInB =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        companyB.id,
        [TEST_PERMISSION_CODE],
      );

    expect(allowedInA.allowed).toBe(true);
    expect(deniedInB.allowed).toBe(false);
  });

  it("resolves COMPANY as stronger than ASSIGNED across active company roles", async () => {
    const user = await createUser("multi-role");
    const company = await createCompany(
      user.id,
      "multi-role",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const assignedRole = await createCompanyRole(
      company.id,
      "assigned-role",
    );
    const companyRole = await createCompanyRole(
      company.id,
      "company-role",
    );

    await grantRolePermission(
      assignedRole.id,
      permission.id,
      "ASSIGNED",
    );
    await grantRolePermission(
      companyRole.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      assignedRole.id,
      user.id,
    );
    await assignCompanyRole(
      company.id,
      member.id,
      companyRole.id,
      user.id,
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(true);
    expect(
      result.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "COMPANY",
      source: "ROLE",
    });
  });

  it("lets an active direct ALLOW override a stronger role scope", async () => {
    const user = await createUser("direct-allow");
    const company = await createCompany(
      user.id,
      "direct-allow",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "direct-allow",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );
    await grantDirectPermission(
      company.id,
      member.id,
      permission.id,
      user.id,
      {
        effect: "ALLOW",
        dataScope: "ASSIGNED",
      },
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(true);
    expect(
      result.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "ASSIGNED",
      source: "DIRECT",
    });
  });

  it("lets an active direct DENY override an allowing company role", async () => {
    const user = await createUser("direct-deny");
    const company = await createCompany(
      user.id,
      "direct-deny",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "direct-deny",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );
    await grantDirectPermission(
      company.id,
      member.id,
      permission.id,
      user.id,
      {
        effect: "DENY",
        dataScope: null,
      },
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
    expect(result.context).toBeNull();
    expect(result.decisions[0]?.source).toBe(
      "DIRECT",
    );
  });

  it("ignores an expired direct DENY and falls back to the role grant", async () => {
    const user = await createUser("expired-deny");
    const company = await createCompany(
      user.id,
      "expired-deny",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "expired-deny",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );
    await grantDirectPermission(
      company.id,
      member.id,
      permission.id,
      user.id,
      {
        effect: "DENY",
        dataScope: null,
        expiresAt: new Date(
          Date.now() - 60_000,
        ),
      },
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(true);
    expect(
      result.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "COMPANY",
      source: "ROLE",
    });
  });

  it("ignores an expired direct ALLOW when no role grants the permission", async () => {
    const user = await createUser("expired-allow");
    const company = await createCompany(
      user.id,
      "expired-allow",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();

    await grantDirectPermission(
      company.id,
      member.id,
      permission.id,
      user.id,
      {
        effect: "ALLOW",
        dataScope: "COMPANY",
        expiresAt: new Date(
          Date.now() - 60_000,
        ),
      },
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
    expect(result.context).toBeNull();
  });

  it("ignores inactive company role grants", async () => {
    const user = await createUser("inactive-role");
    const company = await createCompany(
      user.id,
      "inactive-role",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "inactive-role",
      false,
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
  });

  it("fails closed for deprecated company permissions", async () => {
    const user = await createUser("deprecated");
    const company = await createCompany(
      user.id,
      "deprecated",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission({
      isDeprecated: true,
    });
    const role = await createCompanyRole(
      company.id,
      "deprecated",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );

    const result =
      await authorizationService.resolveRequiredCompanyPermissions(
        user.id,
        company.id,
        [TEST_PERMISSION_CODE],
      );

    expect(result.allowed).toBe(false);
    expect(result.decisions[0]?.source).toBe(
      "DEPRECATED",
    );
  });

  it("rejects invalid company direct effect/scope combinations at the database layer", async () => {
    const user = await createUser("invalid-db");
    const company = await createCompany(
      user.id,
      "invalid-db",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();

    await expect(
      prisma.companyMemberPermission.create({
        data: {
          companyId: company.id,
          companyMemberId: member.id,
          permissionId: permission.id,
          effect: "ALLOW",
          dataScope: "OWN",
          assignedByUserId: user.id,
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.companyMemberPermission.create({
        data: {
          companyId: company.id,
          companyMemberId: member.id,
          permissionId: permission.id,
          effect: "DENY",
          dataScope: "COMPANY",
          assignedByUserId: user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("fails closed in application logic if a corrupt company scope reaches the resolver", async () => {
    const fakeRepository = {
      findCompanyPermissionGrantSnapshot:
        async () => ({
          code: TEST_PERMISSION_CODE,
          isDeprecated: false,
          directOverride: {
            effect: "ALLOW" as const,
            dataScope: "SYSTEM" as const,
            expiresAt: null,
          },
          roleScopes: [],
        }),
    } as unknown as AuthorizationRepository;

    const resolver =
      new PermissionResolverService(
        fakeRepository,
      );

    const decision =
      await resolver.resolveCompanyPermission(
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        TEST_PERMISSION_CODE,
      );

    expect(decision).toEqual({
      code: TEST_PERMISSION_CODE,
      allowed: false,
      scope: null,
      source: "INVALID",
    });
  });

  it("CompanyPermissionGuard attaches company authorization context", async () => {
    const user = await createUser("guard-allow");
    const company = await createCompany(
      user.id,
      "guard-allow",
    );
    const member = await createMembership(
      user.id,
      company.id,
    );
    const permission = await createPermission();
    const role = await createCompanyRole(
      company.id,
      "guard-allow",
    );

    await grantRolePermission(
      role.id,
      permission.id,
      "COMPANY",
    );
    await assignCompanyRole(
      company.id,
      member.id,
      role.id,
      user.id,
    );

    const request = authenticatedRequest(
      user,
      company.id,
    );

    const allowed =
      await companyPermissionGuard.canActivate(
        executionContextFor(request),
      );

    expect(allowed).toBe(true);
    expect(request.companyAuthorization).toMatchObject({
      userId: user.id,
      companyId: company.id,
      companyMemberId: member.id,
    });
    expect(
      request.companyAuthorization?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "COMPANY",
      source: "ROLE",
    });
  });

  it("CompanyPermissionGuard denies a cross-company request without a company grant", async () => {
    const user = await createUser("guard-deny");
    const company = await createCompany(
      user.id,
      "guard-deny",
    );
    await createMembership(
      user.id,
      company.id,
    );
    await createPermission();

    const request = authenticatedRequest(
      user,
      company.id,
    );

    await expect(
      companyPermissionGuard.canActivate(
        executionContextFor(request),
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("CompanyPermissionGuard requires authentication", async () => {
    const request = {
      params: {
        companyId:
          "00000000-0000-4000-8000-000000000003",
      },
    } as unknown as CompanyAuthorizedRequest;

    await expect(
      companyPermissionGuard.canActivate(
        executionContextFor(request),
      ),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("CompanyPermissionGuard rejects an invalid company route context before database authorization", async () => {
    const user = await createUser("guard-invalid-company");
    const request = authenticatedRequest(
      user,
      "not-a-uuid",
    );

    await expect(
      companyPermissionGuard.canActivate(
        executionContextFor(request),
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
