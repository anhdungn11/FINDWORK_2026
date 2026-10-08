import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type {
  CompanyPermissionGrantSnapshot,
  SystemPermissionGrantSnapshot,
} from "./types/authorization.types";

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSystemPermissionGrantSnapshot(
    userId: string,
    permissionCode: string,
  ): Promise<SystemPermissionGrantSnapshot | null> {
    const permission =
      await this.prisma.permission.findUnique({
        where: {
          code: permissionCode,
        },
        select: {
          code: true,
          isDeprecated: true,
          systemUserPermissions: {
            where: {
              userId,
            },
            select: {
              effect: true,
              dataScope: true,
              expiresAt: true,
            },
            take: 1,
          },
          rolePermissions: {
            where: {
              role: {
                is: {
                  kind: "SYSTEM",
                  isActive: true,
                  systemUsers: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            },
            select: {
              dataScope: true,
            },
          },
        },
      });

    if (!permission) {
      return null;
    }

    const directOverride =
      permission.systemUserPermissions[0] ?? null;

    return {
      code: permission.code,
      isDeprecated: permission.isDeprecated,
      directOverride: directOverride
        ? {
            effect: directOverride.effect,
            dataScope: directOverride.dataScope,
            expiresAt: directOverride.expiresAt,
          }
        : null,
      roleScopes: permission.rolePermissions.map(
        (grant) => grant.dataScope,
      ),
    };
  }

  async findActiveCompanyMember(
    userId: string,
    companyId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId,
        status: "ACTIVE",
        removedAt: null,
      },
      select: {
        id: true,
      },
    });
  }

  async findCompanyPermissionGrantSnapshot(
    companyMemberId: string,
    companyId: string,
    permissionCode: string,
  ): Promise<CompanyPermissionGrantSnapshot | null> {
    const permission =
      await this.prisma.permission.findUnique({
        where: {
          code: permissionCode,
        },
        select: {
          code: true,
          isDeprecated: true,
          companyMemberPermissions: {
            where: {
              companyId,
              companyMemberId,
            },
            select: {
              effect: true,
              dataScope: true,
              expiresAt: true,
            },
            take: 1,
          },
          rolePermissions: {
            where: {
              role: {
                is: {
                  kind: "COMPANY",
                  companyId,
                  isActive: true,
                  companyMembers: {
                    some: {
                      companyId,
                      companyMemberId,
                    },
                  },
                },
              },
            },
            select: {
              dataScope: true,
            },
          },
        },
      });

    if (!permission) {
      return null;
    }

    const directOverride =
      permission.companyMemberPermissions[0] ?? null;

    return {
      code: permission.code,
      isDeprecated: permission.isDeprecated,
      directOverride: directOverride
        ? {
            effect: directOverride.effect,
            dataScope: directOverride.dataScope,
            expiresAt: directOverride.expiresAt,
          }
        : null,
      roleScopes: permission.rolePermissions.map(
        (grant) => grant.dataScope,
      ),
    };
  }
}
