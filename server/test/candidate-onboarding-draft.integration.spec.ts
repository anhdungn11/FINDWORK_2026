import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { PasswordService } from "../src/modules/auth/services/password.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

const URL = "/api/v1/candidate/onboarding-draft";
const draftData = () => ({
  personal: { fullName: "Tester", email: "test@findwork.local" },
  education: [], experience: [], skills: [], languages: [],
  preferences: { desiredPositions: [] },
  resume: { createLater: true },
  privacy: { searchableProfile: false },
});

describe("candidate private onboarding draft", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: TokenService;
  let passwords: PasswordService;
  let fixturePrefix: string;
  const ownedUserIds = new Set<string>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await assertSafeIntegrationDatabase(prisma, config);
    tokens = app.get(TokenService);
    passwords = app.get(PasswordService);
  });

  async function cleanup() {
    const ids = [...ownedUserIds];
    if (ids.length) {
      await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.candidateOnboardingDraft.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      ownedUserIds.clear();
    }
  }
  beforeEach(() => { fixturePrefix = `phase-onboarding-draft.${randomUUID()}.`; });
  afterEach(cleanup);
  afterAll(async () => app?.close());

  async function user() {
    const email = `${fixturePrefix}${randomUUID()}@findwork.local`;
    const created = await prisma.user.create({
      data: { email, emailNormalized: email, passwordHash: await passwords.hash("TestStrongPassword123!"), status: "ACTIVE" },
    });
    ownedUserIds.add(created.id);
    const sessionId = randomUUID();
    await prisma.authSession.create({
      data: { id: sessionId, userId: created.id, refreshTokenHash: randomUUID(), expiresAt: new Date(Date.now() + 3600_000) },
    });
    return { userId: created.id, email, token: await tokens.signAccessToken(created.id, sessionId) };
  }
  const withAuth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const getCookie = (response: { headers: Record<string, unknown> }): string => {
    const raw = response.headers["set-cookie"];
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (typeof first !== "string") throw new Error("Expected refresh cookie");
    const cookie = first.split(";")[0];
    if (!cookie) throw new Error("Expected refresh cookie value");
    return cookie;
  };

  it("rejects anonymous reads and writes", async () => {
    await request(app.getHttpServer()).get(URL).expect(401);
    await request(app.getHttpServer()).put(URL).send({ data: draftData(), stepIndex: 0, version: 0 }).expect(401);
  });

  it("persists all sections and step across a new HTTP request", async () => {
    const { token } = await user();
    await request(app.getHttpServer()).get(URL).set(withAuth(token)).expect(200).expect(({ body, text }) => { expect(text ?? "").toBe(""); expect(body).toEqual({}); });
    const created = await request(app.getHttpServer()).put(URL).set(withAuth(token))
      .send({ data: draftData(), stepIndex: 3, version: 0 }).expect(200);
    expect(created.body.version).toBe(1);
    expect(created.body.stepIndex).toBe(3);
    const loaded = await request(app.getHttpServer()).get(URL).set(withAuth(token)).expect(200);
    expect(loaded.body.data.personal.fullName).toBe("Tester");
    expect(loaded.body.stepIndex).toBe(3);
    const updated = await request(app.getHttpServer()).put(URL).set(withAuth(token))
      .send({ data: { ...draftData(), education: [{ school: "TDMU" }] }, stepIndex: 4, version: 1 }).expect(200);
    expect(updated.body.version).toBe(2);
    expect(updated.body.data.education[0].school).toBe("TDMU");
  });

  it("keeps the draft after login, refresh, logout, and a new login", async () => {
    const account = await user();
    const authUrl = "/api/v1/auth";
    const login = await request(app.getHttpServer()).post(`${authUrl}/login`)
      .send({ email: account.email, password: "TestStrongPassword123!" }).expect(200);
    const accessToken = login.body.accessToken as string;
    const loginCookie = getCookie(login);
    await request(app.getHttpServer()).put(URL).set(withAuth(accessToken))
      .send({ data: draftData(), stepIndex: 2, version: 0 }).expect(200);

    const refreshed = await request(app.getHttpServer()).post(`${authUrl}/refresh`)
      .set("Cookie", loginCookie).expect(200);
    const refreshedCookie = getCookie(refreshed);
    await request(app.getHttpServer()).post(`${authUrl}/logout`)
      .set("Cookie", refreshedCookie).expect(204);
    await request(app.getHttpServer()).get(URL).set(withAuth(refreshed.body.accessToken as string)).expect(401);
    await request(app.getHttpServer()).post(`${authUrl}/refresh`)
      .set("Cookie", refreshedCookie).expect(401);

    const nextLogin = await request(app.getHttpServer()).post(`${authUrl}/login`)
      .send({ email: account.email, password: "TestStrongPassword123!" }).expect(200);
    const savedDraft = await request(app.getHttpServer()).get(URL)
      .set(withAuth(nextLogin.body.accessToken as string)).expect(200);
    expect(savedDraft.body.data.personal.fullName).toBe("Tester");
    expect(savedDraft.body.stepIndex).toBe(2);
  });

  it("never leaks a different user's draft", async () => {
    const a = await user();
    const b = await user();
    await request(app.getHttpServer()).put(URL).set(withAuth(a.token))
      .send({ data: draftData(), stepIndex: 1, version: 0 }).expect(200);
    const viewB = await request(app.getHttpServer()).get(URL).set(withAuth(b.token)).expect(200);
    expect(viewB.text ?? "").toBe("");
    expect(viewB.body).toEqual({});
  });

  it("rejects stale versions and malformed data", async () => {
    const a = await user();
    await request(app.getHttpServer()).put(URL).set(withAuth(a.token))
      .send({ data: draftData(), stepIndex: 0, version: 0 }).expect(200);
    await request(app.getHttpServer()).put(URL).set(withAuth(a.token))
      .send({ data: draftData(), stepIndex: 1, version: 0 }).expect(409);
    await request(app.getHttpServer()).put(URL).set(withAuth(a.token))
      .send({ data: { personal: {} }, stepIndex: 0, version: 1 }).expect(400);
    await request(app.getHttpServer()).put(URL).set(withAuth(a.token))
      .send({ data: draftData(), stepIndex: 7, version: 1 }).expect(400);
  });
});
