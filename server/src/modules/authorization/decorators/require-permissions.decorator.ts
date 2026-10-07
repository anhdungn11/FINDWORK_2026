import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSIONS_KEY =
  "authorization:required-permissions";

export function RequirePermissions(
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
      "RequirePermissions requires at least one permission code.",
    );
  }

  return SetMetadata(
    REQUIRED_PERMISSIONS_KEY,
    normalizedCodes,
  );
}
