import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

jest.mock("@prisma/adapter-pg", () => ({ PrismaPg: jest.fn() }));
jest.mock("../src/generated/prisma/client", () => ({ PrismaClient: class {} }));

describe("PrismaService timestamp connection", () => {
  it("uses a UTC database session while preserving the configured URL", () => {
    const databaseUrl = "postgresql://user:password@127.0.0.1:5432/findwork_dev?schema=public";
    const config = {
      getOrThrow: jest.fn().mockReturnValue(databaseUrl),
    } as unknown as ConfigService;

    new PrismaService(config);

    expect(config.getOrThrow).toHaveBeenCalledWith("DATABASE_URL");
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: databaseUrl,
      options: "-c timezone=UTC",
    });
  });
});
