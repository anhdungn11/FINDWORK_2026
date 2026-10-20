import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AuthService } from "../src/modules/auth/auth.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

describe("account status and session lifecycle", () => {
  it("locks and rechecks ACTIVE status before creating a login session", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ status: "ACTIVE" }]),
      authSession: { create: jest.fn().mockResolvedValue({ id: sessionId }) },
    };
    const db = { $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)) };
    const repo = new AuthRepository(db as never);
    const input = { id: sessionId, userId, refreshTokenHash: "hash", expiresAt: new Date(Date.now() + 60_000) };

    await expect(repo.createSession(input)).resolves.toEqual({ id: sessionId });
    const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join("");
    expect(sql).toContain('FROM "User"');
    expect(sql).toContain("FOR UPDATE");
    expect(tx.$queryRaw.mock.calls[0][1]).toBe(userId);
    expect(tx.authSession.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, id: sessionId }) });

    tx.$queryRaw.mockResolvedValueOnce([{ status: "SUSPENDED" }]);
    await expect(repo.createSession(input)).rejects.toMatchObject({
      status: 403, response: { code: "AUTH_ACCOUNT_UNAVAILABLE" },
    });
    expect(tx.authSession.create).toHaveBeenCalledTimes(1);
  });

  it("rejects old access sessions while suspended and after reactivation if revoked", async () => {
    const session = {
      id: sessionId, userId, revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: userId, email: "candidate@example.test", status: "SUSPENDED", emailVerifiedAt: null },
    };
    const repo = { findAccessSession: jest.fn().mockResolvedValue(session) };
    const token = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: userId, sid: sessionId }) };
    const guard = new AccessTokenGuard(token as never, repo as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: "Bearer valid-token" } }) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401, response: { code: "AUTH_SESSION_INVALID" },
    });
    session.user.status = "ACTIVE";
    session.revokedAt = new Date();
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401, response: { code: "AUTH_SESSION_INVALID" },
    });
  });

  it("rejects refresh while suspended without rotating or issuing an access token", async () => {
    const repo = {
      findSessionWithUser: jest.fn().mockResolvedValue({
        id: sessionId, userId, revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
        refreshTokenHash: "hash", user: { id: userId, status: "SUSPENDED" },
      }),
      rotateRefreshToken: jest.fn(),
    };
    const token = {
      parseRefreshToken: jest.fn().mockReturnValue({ sessionId, secret: "secret" }),
      signAccessToken: jest.fn(),
    };
    const service = new AuthService(repo as never, {} as never, token as never,
      { getOrThrow: jest.fn().mockReturnValue(7) } as never);
    await expect(service.refresh("refresh-token")).rejects.toMatchObject({
      status: 401, response: { code: "AUTH_SESSION_INVALID" },
    });
    expect(repo.rotateRefreshToken).not.toHaveBeenCalled();
    expect(token.signAccessToken).not.toHaveBeenCalled();
  });
});
