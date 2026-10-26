import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { ApiExceptionFilter } from "./common/exceptions/api-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  app.use(cookieParser());

  const apiPrefix = config.getOrThrow<string>("API_PREFIX");
  const corsOrigins = config.getOrThrow<string[]>("CORS_ORIGINS");
  const port = config.getOrThrow<number>("PORT");
  const nodeEnv = config.getOrThrow<string>("NODE_ENV");
  const expectedDatabase = config.get<string>("FINDWORK_EXPECTED_DATABASE");
  if (expectedDatabase) {
    const rows = await app.get(PrismaService).$queryRaw<Array<{ name: string; schema: string }>>
      `SELECT current_database() AS name, current_schema() AS schema`;
    if (rows[0]?.name !== expectedDatabase || rows[0]?.schema !== "public") {
      throw new Error("Connected database identity does not match FINDWORK_EXPECTED_DATABASE/public schema.");
    }
  }

  app.enableShutdownHooks();
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new ApiExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("FINDWORK API")
    .setDescription("FINDWORK REST API v1")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "access-token",
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup("docs", app, swaggerDocument, {
    useGlobalPrefix: true,
  });

  if (nodeEnv === "test") {
    await app.listen(port, "127.0.0.1");
  } else {
    await app.listen(port);
  }
}

void bootstrap();
