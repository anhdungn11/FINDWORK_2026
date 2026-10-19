import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import {
  ADMIN_ROLE_CODES, ADMIN_ROLE_DEFINITIONS, adminGrantMode, assertAdminGrantTarget,
  assertConnectedAdminGrantTarget, planAdminRoleGrants,
  type ExistingAdminRole,
} from "./seed-data/admin-role-grants";

const apply = adminGrantMode(process.argv.slice(2), process.env.ADMIN_ROLE_GRANTS_ALLOW_WRITE) === "apply";

const databaseUrl = process.env.DATABASE_URL;
assertAdminGrantTarget(process.env.NODE_ENV, databaseUrl);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });

async function main(): Promise<void> {
  const result = await prisma.$transaction(async (db) => {
    if (!apply) await db.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [identity] = await db.$queryRaw<Array<{
      database: string; schema: string; address: string | null; port: number | null;
    }>>`SELECT current_database() AS database, current_schema() AS schema,
      inet_server_addr()::text AS address, inet_server_port() AS port`;
    assertConnectedAdminGrantTarget(identity);

    const roleRows = await db.role.findMany({
      where: { systemCode: { in: [...ADMIN_ROLE_CODES] } },
      select: { id: true, systemCode: true, kind: true, companyId: true, normalizedName: true,
        isProtected: true, isActive: true, _count: { select: { systemUsers: true } },
        permissions: { select: { dataScope: true, permission: { select: { code: true } } } } },
    });
    const codes = [...new Set(ADMIN_ROLE_DEFINITIONS.flatMap((role) => role.permissions.map((grant) => grant.code)))];
    const permissionRows = await db.permission.findMany({
      where: { code: { in: codes } }, select: { id: true, code: true, isDeprecated: true },
    });
    const roles: ExistingAdminRole[] = roleRows.map((role) => ({
      id: role.id, systemCode: role.systemCode, kind: role.kind, companyId: role.companyId,
      normalizedName: role.normalizedName, isProtected: role.isProtected, isActive: role.isActive,
      assignedUserCount: role._count.systemUsers,
      grants: role.permissions.map((grant) => ({ code: grant.permission.code, scope: grant.dataScope })),
    }));
    const plan = planAdminRoleGrants(roles, permissionRows);
    if (apply) {
      if (!plan.canApply) throw new Error("Admin grant plan has conflicts or missing registry permissions.");
      const permissionIds = new Map(permissionRows.map((permission) => [permission.code, permission.id]));
      for (const definition of ADMIN_ROLE_DEFINITIONS) {
        const current = roles.find((role) => role.systemCode === definition.systemCode);
        const roleId = current?.id ?? (await db.role.create({
          data: { kind: "SYSTEM", companyId: null, systemCode: definition.systemCode,
            name: definition.name, normalizedName: definition.name.trim().toLowerCase(),
            isProtected: true, isActive: true }, select: { id: true },
        })).id;
        const missing = plan.roles.find((role) => role.code === definition.systemCode)!.missingGrants;
        if (missing.length > 0) {
          await db.rolePermission.createMany({ data: definition.permissions
            .filter((grant) => missing.includes(`${grant.code}:${grant.scope}`))
            .map((grant) => ({ roleId, permissionId: permissionIds.get(grant.code)!, dataScope: "SYSTEM" })) });
        }
      }
    }
    return { mode: apply ? "apply" : "dry-run", database: identity.database, schema: identity.schema, ...plan };
  }, { maxWait: 10_000, timeout: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(() => {
  process.stderr.write("Admin role grants failed; transaction rolled back or no writes attempted.\n");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
