import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthState, AuthUser } from "@/store/authStore";

import { getAccountInitials, getAccountName, getHeaderAuthView, shouldCheckAuth, shouldRecheckAuth } from "./hooks/headerAuth";

const accountA: AuthUser = { id: "a", email: "a@example.test", fullName: "Nguyễn Văn A" };
const accountB: AuthUser = { id: "b", email: "b@example.test", fullName: "Trần Thị B" };

describe("Header auth presentation", () => {
  it("keeps identity and anonymous links hidden until a session is verified", () => {
    for (const status of ["idle", "loading"] as const) {
      assert.equal(getHeaderAuthView(status, accountA, "stale-token"), "checking");
    }
    assert.equal(getHeaderAuthView("authenticated", accountA, null), "checking");
    assert.equal(getHeaderAuthView("authenticated", null, "token"), "checking");
    assert.equal(getHeaderAuthView("unauthenticated", accountA, "stale-token"), "anonymous");
  });

  it("shows only the account belonging to the current verified session", () => {
    assert.equal(getHeaderAuthView("authenticated", accountA, "token-a"), "authenticated");
    assert.equal(getAccountName(accountA), "Nguyễn Văn A");
    assert.equal(getHeaderAuthView("loggingOut", accountA, "token-a"), "loggingOut");
    assert.equal(getHeaderAuthView("unauthenticated", null, null), "anonymous");
    assert.equal(getHeaderAuthView("authenticated", accountB, "token-b"), "authenticated");
    assert.equal(getAccountName(accountB), "Trần Thị B");
  });

  it("starts a session check only from idle; the auth store coalesces concurrent calls", () => {
    const statuses: AuthState["status"][] = ["idle", "loading", "authenticated", "unauthenticated", "loggingOut"];
    assert.deepEqual(statuses.map(shouldCheckAuth), [true, false, false, false, false]);
  });

  it("rechecks an active session only when visible and outside the duplicate-request window", () => {
    assert.equal(shouldRecheckAuth("authenticated", true, 60_000), true);
    assert.equal(shouldRecheckAuth("authenticated", true, 1_000), false);
    assert.equal(shouldRecheckAuth("authenticated", false, 300_000), false);
    assert.equal(shouldRecheckAuth("loggingOut", true, 300_000), false);
  });

  it("uses a bounded display name and harmless avatar initials", () => {
    assert.equal(getAccountName({ id: "x", email: "private@example.test" }), "Tài khoản");
    assert.equal(getAccountName({ id: "x", email: "x@example.test", fullName: "   " }), "Tài khoản");
    assert.equal(getAccountInitials(accountA), "NA");
    assert.equal(getAccountName({ id: "x", email: "x@example.test", fullName: " X ".repeat(100) }).length, 64);
  });
});
