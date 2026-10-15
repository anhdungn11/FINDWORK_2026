import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

describe("integration database write gate", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const query = jest.fn();
  const prisma = { $queryRaw: query } as unknown as PrismaService;
  const config = (url: string, nodeEnv = "test") => ({
    get: (key: string) => key === "NODE_ENV" ? nodeEnv : undefined,
    getOrThrow: (key: string) => key === "DATABASE_URL" ? url : undefined,
  }) as unknown as ConfigService;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    query.mockReset().mockResolvedValue([{ database: "findwork_test", address: "127.0.0.1/32", port: 5432 }]);
  });
  afterAll(() => { process.env.NODE_ENV = previousNodeEnv; });

  it.each([
    "postgresql://test:fake@127.0.0.1:5432/findwork_dev?schema=public",
    "postgresql://test:fake@remote.example:5432/findwork_test?schema=public",
    "postgresql://test:fake@127.0.0.1:5433/findwork_test?schema=public",
    "postgresql://test:fake@127.0.0.1:5432/findwork_test?schema=other",
  ])("rejects unsafe connection settings before SQL: %s", async (url) => {
    await expect(assertSafeIntegrationDatabase(prisma, config(url))).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a database identity mismatch even when the URL looks safe", async () => {
    query.mockResolvedValue([{ database: "findwork_dev", address: "127.0.0.1/32", port: 5432 }]);
    await expect(assertSafeIntegrationDatabase(prisma,
      config("postgresql://test:fake@127.0.0.1:5432/findwork_test?schema=public")))
      .rejects.toThrow("not local findwork_test");
  });

  it("requires NODE_ENV=test and accepts only the verified test identity", async () => {
    const safe = config("postgresql://test:fake@127.0.0.1:5432/findwork_test?schema=public");
    process.env.NODE_ENV = "development";
    await expect(assertSafeIntegrationDatabase(prisma, safe)).rejects.toThrow("NODE_ENV=test");
    process.env.NODE_ENV = "test";
    await expect(assertSafeIntegrationDatabase(prisma, safe)).resolves.toBeUndefined();
  });
});
