import "reflect-metadata";
import {
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
import { RequirePermissions } from "../src/modules/authorization/decorators/require-permissions.decorator";
import {
  type AuthorizedRequest,
  PermissionGuard,
} from "../src/modules/authorization/guards/permission.guard";
import { PermissionResolverService } from "../src/modules/authorization/services/permission-resolver.service";

const TEST_PERMISSION_CODE = "phase3.job.view";
const TEST_USER_DOMAIN = "@authorization.test";
const TEST_ROLE_PREFIX = "PHASE3_";

class AuthorizationTestController {
  @RequirePermissions(TEST_PERMISSION_CODE)
  protectedRoute(): void {}
}

function executionContextFor(
  request: AuthorizedRequest,
): ExecutionContext {
  return {
    getHandler: () =>
      AuthorizationTestController.prototype.protectedRoute,
    getClass: () => AuthorizationTestController,
    switchToHttp: () =>
      ({
        getRequest: () => request,
      }) as ReturnType<ExecutionContext["switchToHttp"]>,
  } as unknown as ExecutionContext;
}

describe("Authorization integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorizationService: AuthorizationService;
  let permissionGuard: PermissionGuard;

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleRef.createNestApplication();

    const configService =
      app.get(ConfigService);

    const databaseUrl =
      configService.getOrThrow<string>(
        "DATABASE_URL",
      );

    const databaseName =
      new URL(databaseUrl)
        .pathname
        .replace(/^\//, "");

    if (databaseName !== "findwork_test") {
      throw new Error(
        `Refusing destructive authorization tests against ${databaseName}`,
      );
    }

    await app.init();

    prisma = app.get(PrismaService);
    authorizationService =
      app.get(AuthorizationService);
    permissionGuard =
      app.get(PermissionGuard);
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

    const roles = await prisma.role.findMany({
      where: {
        systemCode: {
          startsWith: TEST_ROLE_PREFIX,
        },
      },
      select: {
        id: true,
      },
    });

    const permissions =
      await prisma.permission.findMany({
        where: {
          code: {
            startsWith: "phase3.",
          },
        },
        select: {
          id: true,
        },
      });

    const userIds = users.map(
      (user) => user.id,
    );

    const roleIds = roles.map(
      (role) => role.id,
    );

    const permissionIds =
      permissions.map(
        (permission) => permission.id,
      );

    await prisma.authSession.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.systemUserPermission.deleteMany({
      where: {
        OR: [
          {
            userId: {
              in: userIds,
            },
          },
          {
            assignedByUserId: {
              in: userIds,
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

    await prisma.systemUserRole.deleteMany({
      where: {
        OR: [
          {
            userId: {
              in: userIds,
            },
          },
          {
            assignedByUserId: {
              in: userIds,
            },
          },
          {
            roleId: {
              in: roleIds,
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

    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });

    await prisma.role.deleteMany({
      where: {
        id: {
          in: roleIds,
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

  async function createUser(
    localPart: string,
  ) {
    const email =
      `${localPart}${TEST_USER_DOMAIN}`;

    return prisma.user.create({
      data: {
        email,
        emailNormalized:
          email.toLowerCase(),
        passwordHash:
          "phase3-authorization-test-hash",
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
      options?.code ??
      TEST_PERMISSION_CODE;

    return prisma.permission.create({
      data: {
        code,
        resource: "phase3_job",
        action: "view",
        description:
          "Phase 3 authorization integration test permission.",
        isProtected: true,
        isDeprecated:
          options?.isDeprecated ?? false,
      },
    });
  }

  async function createRole(
    systemCode: string,
    isActive = true,
  ) {
    return prisma.role.create({
      data: {
        kind: "SYSTEM",
        companyId: null,
        systemCode,
        name: systemCode,
        normalizedName:
          systemCode.toLowerCase(),
        isProtected: true,
        isActive,
      },
    });
  }

  async function assignRole(
    userId: string,
    roleId: string,
  ) {
    return prisma.systemUserRole.create({
      data: {
        userId,
        roleId,
        assignedByUserId: null,
      },
    });
  }

  async function grantRolePermission(
    roleId: string,
    permissionId: string,
    dataScope: "OWN" | "SYSTEM",
  ) {
    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
        dataScope,
      },
    });
  }

  async function grantDirectPermission(
    userId: string,
    permissionId: string,
    options: {
      effect: "ALLOW" | "DENY";
      dataScope:
        | "OWN"
        | "SYSTEM"
        | null;
      expiresAt?: Date | null;
    },
  ) {
    return prisma.systemUserPermission.create({
      data: {
        userId,
        permissionId,
        effect: options.effect,
        dataScope: options.dataScope,
        assignedByUserId: userId,
        expiresAt:
          options.expiresAt ?? null,
      },
    });
  }

  it("allows an active SYSTEM role grant", async () => {
    const user =
      await createUser("role-allow");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}ALLOW`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(true);

    expect(
      decision.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "SYSTEM",
      source: "ROLE",
    });
  });

  it("denies by default when no grant exists", async () => {
    const user =
      await createUser("no-grant");

    await createPermission();

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(false);
    expect(decision.context).toBeNull();
  });

  it("ignores inactive role grants", async () => {
    const user =
      await createUser("inactive-role");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}INACTIVE`,
        false,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(false);
  });

  it("fails closed for deprecated permissions", async () => {
    const user =
      await createUser("deprecated");

    const permission =
      await createPermission({
        isDeprecated: true,
      });

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}DEPRECATED`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(false);

    expect(
      decision.decisions[0]?.source,
    ).toBe("DEPRECATED");
  });

  it("lets an active direct ALLOW override a stronger role scope", async () => {
    const user =
      await createUser("direct-allow");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}DIRECT_ALLOW`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    await grantDirectPermission(
      user.id,
      permission.id,
      {
        effect: "ALLOW",
        dataScope: "OWN",
      },
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(true);

    expect(
      decision.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "OWN",
      source: "DIRECT",
    });
  });

  it("lets an active direct DENY override a role grant", async () => {
    const user =
      await createUser("direct-deny");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}DIRECT_DENY`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    await grantDirectPermission(
      user.id,
      permission.id,
      {
        effect: "DENY",
        dataScope: null,
      },
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(false);

    expect(
      decision.decisions[0]?.source,
    ).toBe("DIRECT");
  });

  it("ignores expired direct overrides and falls back to role grants", async () => {
    const user =
      await createUser("expired-direct");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}EXPIRED`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    await grantDirectPermission(
      user.id,
      permission.id,
      {
        effect: "DENY",
        dataScope: null,
        expiresAt: new Date(
          Date.now() - 60_000,
        ),
      },
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(true);

    expect(
      decision.context?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "SYSTEM",
      source: "ROLE",
    });
  });

  it("resolves SYSTEM as the strongest scope across multiple active roles", async () => {
    const user =
      await createUser("multi-role");

    const permission =
      await createPermission();

    const ownRole =
      await createRole(
        `${TEST_ROLE_PREFIX}OWN`,
      );

    const systemRole =
      await createRole(
        `${TEST_ROLE_PREFIX}SYSTEM`,
      );

    await grantRolePermission(
      ownRole.id,
      permission.id,
      "OWN",
    );

    await grantRolePermission(
      systemRole.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      ownRole.id,
    );

    await assignRole(
      user.id,
      systemRole.id,
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(true);

    expect(
      decision.context?.permissions[
        TEST_PERMISSION_CODE
      ]?.scope,
    ).toBe("SYSTEM");
  });

  it("allows a SUPER_ADMIN-style SYSTEM permission grant", async () => {
    const user =
      await createUser("super-admin");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}SUPER_ADMIN`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    const decision =
      await authorizationService.resolveRequiredSystemPermissions(
        user.id,
        [TEST_PERMISSION_CODE],
      );

    expect(decision.allowed).toBe(true);

    expect(
      decision.context?.permissions[
        TEST_PERMISSION_CODE
      ]?.scope,
    ).toBe("SYSTEM");
  });

  it("rejects invalid direct effect/scope combinations at the database layer", async () => {
    const user =
      await createUser("invalid-db");

    const permission =
      await createPermission();

    await expect(
      prisma.systemUserPermission.create({
        data: {
          userId: user.id,
          permissionId: permission.id,
          effect: "ALLOW",
          dataScope: "COMPANY",
          assignedByUserId: user.id,
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.systemUserPermission.create({
        data: {
          userId: user.id,
          permissionId: permission.id,
          effect: "DENY",
          dataScope: "OWN",
          assignedByUserId: user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("fails closed in application logic if a corrupt system scope reaches the resolver", async () => {
    const fakeRepository = {
      findSystemPermissionGrantSnapshot:
        async () => ({
          code: TEST_PERMISSION_CODE,
          isDeprecated: false,
          directOverride: {
            effect: "ALLOW" as const,
            dataScope: "COMPANY" as const,
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
      await resolver.resolveSystemPermission(
        "00000000-0000-0000-0000-000000000001",
        TEST_PERMISSION_CODE,
      );

    expect(decision).toEqual({
      code: TEST_PERMISSION_CODE,
      allowed: false,
      scope: null,
      source: "INVALID",
    });
  });

  it("PermissionGuard attaches authorization context for an allowed request", async () => {
    const user =
      await createUser("guard-allow");

    const permission =
      await createPermission();

    const role =
      await createRole(
        `${TEST_ROLE_PREFIX}GUARD_ALLOW`,
      );

    await grantRolePermission(
      role.id,
      permission.id,
      "SYSTEM",
    );

    await assignRole(
      user.id,
      role.id,
    );

    const request = {
      auth: {
        userId: user.id,
        sessionId:
          "00000000-0000-0000-0000-000000000001",
        user: {
          id: user.id,
          email: user.email,
          status: "ACTIVE" as const,
          emailVerified: false,
        },
      },
    } as AuthorizedRequest;

    const allowed =
      await permissionGuard.canActivate(
        executionContextFor(request),
      );

    expect(allowed).toBe(true);

    expect(
      request.authorization?.permissions[
        TEST_PERMISSION_CODE
      ],
    ).toEqual({
      scope: "SYSTEM",
      source: "ROLE",
    });
  });

  it("PermissionGuard denies a request without the required grant", async () => {
    const user =
      await createUser("guard-deny");

    await createPermission();

    const request = {
      auth: {
        userId: user.id,
        sessionId:
          "00000000-0000-0000-0000-000000000002",
        user: {
          id: user.id,
          email: user.email,
          status: "ACTIVE" as const,
          emailVerified: false,
        },
      },
    } as AuthorizedRequest;

    await expect(
      permissionGuard.canActivate(
        executionContextFor(request),
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("PermissionGuard requires authentication when permission metadata is present", async () => {
    const request =
      {} as AuthorizedRequest;

    await expect(
      permissionGuard.canActivate(
        executionContextFor(request),
      ),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
