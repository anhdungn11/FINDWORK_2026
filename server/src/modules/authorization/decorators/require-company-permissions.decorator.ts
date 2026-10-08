import { SetMetadata } from "@nestjs/common";

export const REQUIRED_COMPANY_PERMISSIONS_KEY =
  "authorization:required-company-permissions";

export function RequireCompanyPermissions(
  ...permissionCodes: string[]
): MethodDecorator & ClassDecorator {
  const normalizedCodes = [
    ...new Set(
      permissionCodes
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];

  if (normalizedCodes.length === 0) {
    throw new Error(
      "RequireCompanyPermissions requires at least one permission code.",
    );
  }

  return SetMetadata(
    REQUIRED_COMPANY_PERMISSIONS_KEY,
    normalizedCodes,
  );
}
