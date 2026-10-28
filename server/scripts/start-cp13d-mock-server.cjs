require("reflect-metadata");
const { Test } = require("@nestjs/testing");
const { ValidationPipe } = require("@nestjs/common");
const { ConfigService } = require("@nestjs/config");
const cookieParser = require("cookie-parser");
const { AppModule } = require("../dist/app.module");
const { PrismaService } = require("../dist/infrastructure/prisma/prisma.service");
const { AiProviderService } = require("../dist/modules/ai/ai-provider.service");
const { ApiExceptionFilter } = require("../dist/common/exceptions/api-exception.filter");

const expected = process.env.FINDWORK_TEST_DOCKER_SYSTEM_ID;
const url = new URL(process.env.DATABASE_URL || "");
if (process.env.NODE_ENV !== "test" || url.hostname !== "127.0.0.1" ||
    url.port !== "55432" || url.pathname !== "/findwork_test" ||
    !/^\d{15,20}$/.test(expected || "")) {
  throw new Error("Mock acceptance server requires a fingerprinted disposable Docker database.");
}
const mockProvider = {
  isConfigured: () => true,
  modelName: () => "MOCK_PROVIDER_NO_LIVE_CREDITS",
  pricing: () => ({ inputPrice: 0.15, outputPrice: 0.6 }),
  generate: async (_history, prompt) => {
    if (!prompt.startsWith("Draft a clear, inclusive job description.")) {
      throw new Error("Mock acceptance provider only supports draft-job.");
    }
    return { text: JSON.stringify({
      title: "CP13D Browser Engineer", summary: "MOCK PROVIDER: Build reliable browser features.",
      responsibilities: ["Build accessible interfaces", "Review tests"],
      requirements: ["TypeScript experience", "Team collaboration"],
      niceToHave: [], benefits: [], suggestedSkills: ["TypeScript"],
    }), inputTokens: 80, outputTokens: 120, totalTokens: 200 };
  },
};
async function main() {
  const ref = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiProviderService).useValue(mockProvider).compile();
  const app = ref.createNestApplication();
  const config = app.get(ConfigService);
  app.use(cookieParser());
  app.setGlobalPrefix(config.getOrThrow("API_PREFIX"));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  const db = app.get(PrismaService);
  const [row] = await db.$queryRaw`SELECT current_database() AS database, system_identifier::text AS id FROM pg_control_system()`;
  if (row?.database !== "findwork_test" || row?.id !== expected) {
    await app.close();
    throw new Error("Disposable PostgreSQL fingerprint mismatch.");
  }
  await app.listen(3004, "127.0.0.1");
  process.stdout.write("CP13D MOCK PROVIDER acceptance backend listening on 127.0.0.1:3004\n");
  const stop = async () => { await app.close(); process.exit(0); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
main().catch((error) => { process.stderr.write(String(error.stack || error) + "\n"); process.exitCode = 1; });
