import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DataScope,
  Prisma,
  PrismaClient,
  RoleKind,
} from "../src/generated/prisma/client";
import { PERMISSIONS } from "./seed-data/permissions";
import {
  JOB_CATEGORIES,
  LANGUAGES,
  SKILL_CATEGORIES,
} from "./seed-data/reference-data";
import { SYSTEM_ROLES } from "./seed-data/system-roles";

const SUPER_ADMIN_CODE = "SUPER_ADMIN";
const SEED_TRANSACTION_MAX_WAIT_MS = 10_000;
const SEED_TRANSACTION_TIMEOUT_MS = 120_000;

type Db = Prisma.TransactionClient;

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error("DATABASE_URL is required to seed FINDWORK.");
  }

  return value;
}

const adapter = new PrismaPg({
  connectionString: getDatabaseUrl(),
});
const prisma = new PrismaClient({ adapter });

function assertUniqueCodes(
  label: string,
  items: ReadonlyArray<{ code: string }>,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    const code = item.code.trim();

    if (!code) {
      throw new Error(`${label} contains an empty code.`);
    }

    if (seen.has(code)) {
      throw new Error(`${label} contains duplicate code: ${code}.`);
    }

    seen.add(code);
  }
}

function validatePermissions(): void {
  assertUniqueCodes("PERMISSIONS", PERMISSIONS);

  const resourcePattern = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;
  const actionPattern = /^[a-z0-9_]+$/;

  for (const permission of PERMISSIONS) {
    if (!resourcePattern.test(permission.resource)) {
      throw new Error(
        `Invalid permission resource '${permission.resource}' for ${permission.code}.`,
      );
    }

    if (!actionPattern.test(permission.action)) {
      throw new Error(
        `Invalid permission action '${permission.action}' for ${permission.code}.`,
      );
    }

    const expectedCode = `${permission.resource}.${permission.action}`;

    if (permission.code !== expectedCode) {
      throw new Error(
        `Permission code '${permission.code}' must equal '${expectedCode}'.`,
      );
    }
  }
}

function validateSystemRoles(): void {
  const permissionCodes = new Set(PERMISSIONS.map((item) => item.code));
  const systemCodes = new Set<string>();

  for (const role of SYSTEM_ROLES) {
    const systemCode = role.systemCode.trim();

    if (!systemCode) {
      throw new Error("SYSTEM_ROLES contains an empty systemCode.");
    }

    if (systemCode === SUPER_ADMIN_CODE) {
      throw new Error(
        `${SUPER_ADMIN_CODE} is managed separately and must not appear in SYSTEM_ROLES.`,
      );
    }

    if (systemCodes.has(systemCode)) {
      throw new Error(`Duplicate system role code: ${systemCode}.`);
    }

    systemCodes.add(systemCode);

    const rolePermissionCodes = new Set<string>();

    for (const permission of role.permissions) {
      if (!permissionCodes.has(permission.code)) {
        throw new Error(
          `System role ${systemCode} references unknown permission ${permission.code}.`,
        );
      }

      if (rolePermissionCodes.has(permission.code)) {
        throw new Error(
          `System role ${systemCode} contains duplicate permission ${permission.code}.`,
        );
      }

      rolePermissionCodes.add(permission.code);

      if (permission.scope !== "OWN" && permission.scope !== "SYSTEM") {
        throw new Error(
          `System role ${systemCode} cannot use ${permission.scope} scope for ${permission.code}.`,
        );
      }
    }
  }
}

function validateReferenceData(): void {
  assertUniqueCodes("JOB_CATEGORIES", JOB_CATEGORIES);
  assertUniqueCodes("SKILL_CATEGORIES", SKILL_CATEGORIES);
  assertUniqueCodes("LANGUAGES", LANGUAGES);

  const skillCategoriesByCode = new Map(
    SKILL_CATEGORIES.map((category) => [category.code, category] as const),
  );

  for (const category of SKILL_CATEGORIES) {
    if (!category.parentCode) {
      continue;
    }

    if (category.parentCode === category.code) {
      throw new Error(
        `Skill category ${category.code} cannot be its own parent.`,
      );
    }

    if (!skillCategoriesByCode.has(category.parentCode)) {
      throw new Error(
        `Skill category ${category.code} references missing parent ${category.parentCode}.`,
      );
    }
  }

  for (const category of SKILL_CATEGORIES) {
    const visited = new Set<string>();
    let current = category;

    while (current.parentCode) {
      if (visited.has(current.code)) {
        throw new Error(
          `Skill category hierarchy contains a cycle involving ${current.code}.`,
        );
      }

      visited.add(current.code);

      const parent = skillCategoriesByCode.get(current.parentCode);

      if (!parent) {
        break;
      }

      current = parent;
    }
  }
}

function validateSeedSource(): void {
  validatePermissions();
  validateSystemRoles();
  validateReferenceData();
}

async function seedReferenceData(db: Db): Promise<void> {
  const jobCategoryCodes = JOB_CATEGORIES.map((item) => item.code);
  const skillCategoryCodes = SKILL_CATEGORIES.map((item) => item.code);
  const languageCodes = LANGUAGES.map((item) => item.code);

  await db.jobCategory.updateMany({
    where: { code: { notIn: jobCategoryCodes } },
    data: { isActive: false },
  });

  for (const [index, category] of JOB_CATEGORIES.entries()) {
    await db.jobCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        isActive: true,
        sortOrder: index,
      },
      create: {
        code: category.code,
        name: category.name,
        isActive: true,
        sortOrder: index,
      },
    });
  }

  await db.skillCategory.updateMany({
    where: { code: { notIn: skillCategoryCodes } },
    data: { isActive: false },
  });

  for (const [index, category] of SKILL_CATEGORIES.entries()) {
    await db.skillCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        parentId: null,
        isActive: true,
        sortOrder: index,
      },
      create: {
        code: category.code,
        name: category.name,
        parentId: null,
        isActive: true,
        sortOrder: index,
      },
    });
  }

  for (const category of SKILL_CATEGORIES) {
    if (!category.parentCode) {
      continue;
    }

    const parent = await db.skillCategory.findUniqueOrThrow({
      where: { code: category.parentCode },
      select: { id: true },
    });

    await db.skillCategory.update({
      where: { code: category.code },
      data: { parentId: parent.id },
    });
  }

  await db.language.updateMany({
    where: { code: { notIn: languageCodes } },
    data: { isActive: false },
  });

  for (const [index, language] of LANGUAGES.entries()) {
    await db.language.upsert({
      where: { code: language.code },
      update: {
        label: language.label,
        englishLabel: language.englishLabel,
        isActive: true,
        sortOrder: index,
      },
      create: {
        ...language,
        isActive: true,
        sortOrder: index,
      },
    });
  }
}

async function seedPermissions(db: Db): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();
  const permissionCodes = PERMISSIONS.map((item) => item.code);

  await db.permission.updateMany({
    where: { code: { notIn: permissionCodes } },
    data: { isDeprecated: true },
  });

  for (const item of PERMISSIONS) {
    const permission = await db.permission.upsert({
      where: { code: item.code },
      update: {
        resource: item.resource,
        action: item.action,
        description: item.description,
        isProtected: item.isProtected ?? false,
        isDeprecated: false,
      },
      create: {
        code: item.code,
        resource: item.resource,
        action: item.action,
        description: item.description,
        isProtected: item.isProtected ?? false,
        isDeprecated: false,
      },
      select: { id: true, code: true },
    });

    permissionIds.set(permission.code, permission.id);
  }

  return permissionIds;
}

async function syncRolePermissions(
  db: Db,
  roleId: string,
  permissions: ReadonlyArray<{ code: string; scope: keyof typeof DataScope }>,
  permissionIds: ReadonlyMap<string, string>,
): Promise<void> {
  const expectedPermissionIds: string[] = [];

  for (const permissionSeed of permissions) {
    const permissionId = permissionIds.get(permissionSeed.code);

    if (!permissionId) {
      throw new Error(
        `Missing permission seed for ${permissionSeed.code}.`,
      );
    }

    expectedPermissionIds.push(permissionId);

    await db.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {
        dataScope: DataScope[permissionSeed.scope],
      },
      create: {
        roleId,
        permissionId,
        dataScope: DataScope[permissionSeed.scope],
      },
    });
  }

  if (expectedPermissionIds.length === 0) {
    await db.rolePermission.deleteMany({ where: { roleId } });
    return;
  }

  await db.rolePermission.deleteMany({
    where: {
      roleId,
      permissionId: { notIn: expectedPermissionIds },
    },
  });
}

async function seedSystemRoles(
  db: Db,
  permissionIds: Map<string, string>,
): Promise<void> {
  const activeSystemCodes = [
    ...SYSTEM_ROLES.map((role) => role.systemCode),
    SUPER_ADMIN_CODE,
  ];

  await db.role.updateMany({
    where: {
      kind: RoleKind.SYSTEM,
      systemCode: { notIn: activeSystemCodes },
    },
    data: { isActive: false },
  });

  for (const roleSeed of SYSTEM_ROLES) {
    const role = await db.role.upsert({
      where: { systemCode: roleSeed.systemCode },
      update: {
        kind: RoleKind.SYSTEM,
        companyId: null,
        name: roleSeed.name,
        normalizedName: roleSeed.name.trim().toLowerCase(),
        isProtected: roleSeed.isProtected,
        isActive: true,
      },
      create: {
        kind: RoleKind.SYSTEM,
        companyId: null,
        systemCode: roleSeed.systemCode,
        name: roleSeed.name,
        normalizedName: roleSeed.name.trim().toLowerCase(),
        isProtected: roleSeed.isProtected,
        isActive: true,
      },
      select: { id: true },
    });

    await syncRolePermissions(
      db,
      role.id,
      roleSeed.permissions,
      permissionIds,
    );
  }

  const superAdmin = await db.role.upsert({
    where: { systemCode: SUPER_ADMIN_CODE },
    update: {
      kind: RoleKind.SYSTEM,
      companyId: null,
      name: "Super Admin",
      normalizedName: "super admin",
      isProtected: true,
      isActive: true,
    },
    create: {
      kind: RoleKind.SYSTEM,
      companyId: null,
      systemCode: SUPER_ADMIN_CODE,
      name: "Super Admin",
      normalizedName: "super admin",
      isProtected: true,
      isActive: true,
    },
    select: { id: true },
  });

  const superAdminPermissions = PERMISSIONS.map((permission) => ({
    code: permission.code,
    scope: "SYSTEM" as const,
  }));

  await syncRolePermissions(
    db,
    superAdmin.id,
    superAdminPermissions,
    permissionIds,
  );
}

async function main(): Promise<void> {
  validateSeedSource();

  await prisma.$transaction(
    async (db) => {
      await seedReferenceData(db);
      const permissionIds = await seedPermissions(db);
      await seedSystemRoles(db, permissionIds);
    },
    {
      maxWait: SEED_TRANSACTION_MAX_WAIT_MS,
      timeout: SEED_TRANSACTION_TIMEOUT_MS,
    },
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.stdout.write("FINDWORK Phase 1 seed completed.\n");
  })
  .catch(async (error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    await prisma.$disconnect();
    process.exit(1);
  });
