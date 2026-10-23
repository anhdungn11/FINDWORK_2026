import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("Employer Workspace Functional Completion Regression", () => {
  it("EmployerLocationsPage implements add, edit, and updateLocation API connection", () => {
    const locSrc = readFileSync(
      new URL("../../../pages/employer/EmployerLocationsPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      locSrc.includes("companyWorkspaceApi.createLocation"),
      "Must call companyWorkspaceApi.createLocation"
    );
    assert.ok(
      locSrc.includes("companyWorkspaceApi.updateLocation"),
      "Must call companyWorkspaceApi.updateLocation for editing"
    );
    assert.ok(
      locSrc.includes("handleStartEdit") || locSrc.includes("editingLocation"),
      "Must support editing existing location"
    );
    assert.ok(
      locSrc.includes("Chỉnh sửa địa điểm làm việc"),
      "Must provide Edit Location form/modal"
    );
  });

  it("EmployerLocationsPage enforces safe headquarters behavior and disables delete for active HQ with branches", () => {
    const locSrc = readFileSync(
      new URL("../../../pages/employer/EmployerLocationsPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      locSrc.includes("cannotDeleteHQ") || locSrc.includes("totalLocations > 1"),
      "Must compute whether headquarters can be safely deleted"
    );
    assert.ok(
      locSrc.includes("Không thể xóa trụ sở chính khi còn chi nhánh khác"),
      "Must explain to the user why headquarters deletion is blocked"
    );
    assert.ok(
      locSrc.includes("companyWorkspaceApi.promoteHeadquarters"),
      "Must call promoteHeadquarters API"
    );
  });

  it("EmployerLocationsPage integrates accessible in-app ConfirmationModal for destructive and promote actions", () => {
    const locSrc = readFileSync(
      new URL("../../../pages/employer/EmployerLocationsPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      locSrc.includes("ConfirmationModal"),
      "EmployerLocationsPage must render ConfirmationModal"
    );
    assert.ok(
      !locSrc.includes("window.confirm"),
      "Must not use primitive browser window.confirm"
    );
  });

  it("EmployerProfilePage implements comprehensive field validation for brand and legal profiles", () => {
    const profileSrc = readFileSync(
      new URL("../../../pages/employer/EmployerProfilePage.tsx", import.meta.url),
      "utf8"
    );

    // Validation functions and field errors
    assert.ok(
      profileSrc.includes("validateBrandForm"),
      "Must implement validateBrandForm"
    );
    assert.ok(
      profileSrc.includes("validateLegalForm"),
      "Must implement validateLegalForm"
    );
    assert.ok(
      profileSrc.includes("new Date().getFullYear()"),
      "Must validate foundedYear against current year"
    );
    assert.ok(
      profileSrc.includes("errors.name") && profileSrc.includes("errors.website"),
      "Must expose inline field errors for brand fields"
    );
    assert.ok(
      profileSrc.includes("errors.legalName") && profileSrc.includes("errors.taxCode"),
      "Must expose inline field errors for legal fields"
    );
  });

  it("EmployerProfilePage truthfully displays brand identity and disables upload until backend contract exists", () => {
    const profileSrc = readFileSync(
      new URL("../../../pages/employer/EmployerProfilePage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      profileSrc.includes("Hình ảnh & Nhận diện thương hiệu"),
      "Must declare brand identity and media section"
    );
    assert.ok(
      profileSrc.includes("Lưu ý về định dạng nhận diện thương hiệu"),
      "Must preserve truthful documentation about server media persistence"
    );
    assert.ok(
      profileSrc.includes("Sắp ra mắt khi Backend hoàn tất hợp đồng Media Storage") ||
        profileSrc.includes("Chờ Backend Media Contract"),
      "Must clearly communicate pending backend upload contract"
    );
  });

  it("EmployerMembersPage replaces window.confirm with ConfirmationModal for removals, ownership transfer, and revocations", () => {
    const membersSrc = readFileSync(
      new URL("../../../pages/employer/EmployerMembersPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      membersSrc.includes("ConfirmationModal"),
      "EmployerMembersPage must render ConfirmationModal"
    );
    assert.ok(
      !membersSrc.includes("window.confirm"),
      "Must not use primitive browser window.confirm"
    );
    assert.ok(
      membersSrc.includes("Chuyển giao quyền Chủ sở hữu (Owner)"),
      "Must explain ownership transfer consequence in modal"
    );
  });

  it("ConfirmationModal adheres to WAI-ARIA dialog standards and handles keyboard escape", () => {
    const modalSrc = readFileSync(
      new URL("../../../components/ui/ConfirmationModal.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      modalSrc.includes('role="dialog"'),
      "ConfirmationModal must have role='dialog'"
    );
    assert.ok(
      modalSrc.includes('aria-modal="true"'),
      "ConfirmationModal must have aria-modal='true'"
    );
    assert.ok(
      modalSrc.includes('aria-labelledby="confirm-modal-title"'),
      "ConfirmationModal must have aria-labelledby"
    );
    assert.ok(
      modalSrc.includes("Escape"),
      "ConfirmationModal must handle Escape key"
    );
  });
});
