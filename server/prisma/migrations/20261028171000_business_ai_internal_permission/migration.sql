-- A dedicated internal RBAC permission keeps AI separate from application review.
-- Platform capability ai.business.access remains denied until Super Admin grants it.
INSERT INTO "Permission" ("id", "code", "resource", "action", "description", "updatedAt")
VALUES (gen_random_uuid(), 'ai.business.generate', 'ai.business', 'generate',
        'Generate company-scoped recruiting recommendations.', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "dataScope")
SELECT r."id", p."id", 'COMPANY'::"DataScope"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."code" = 'ai.business.generate'
  AND r."kind" = 'COMPANY'::"RoleKind"
  AND r."companyId" IS NOT NULL
  AND r."normalizedName" IN ('owner', 'admin', 'hr_manager', 'recruiter', 'hiring_manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
