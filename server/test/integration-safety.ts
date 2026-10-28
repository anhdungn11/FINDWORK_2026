import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

/** Run after app.init() and before any integration fixture writes. */
export async function assertSafeIntegrationDatabase(
  prisma: PrismaService,
  config: ConfigService,
): Promise<void> {
  if (process.env.NODE_ENV !== "test" || config.get<string>("NODE_ENV") !== "test") {
    throw new Error("Integration writes require NODE_ENV=test.");
  }

  const rawUrl = config.getOrThrow<string>("DATABASE_URL");
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Integration database URL is invalid.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["5432", "55432"].includes(url.port || "5432") ||
    decodeURIComponent(url.pathname.slice(1)) !== "findwork_test" ||
    url.searchParams.get("schema") !== "public"
  ) {
    throw new Error("Integration writes require local findwork_test/public on port 5432 or the verified disposable Docker port 55432.");
  }

  const [identity] = await prisma.$queryRaw<Array<{
    database: string;
    address: string | null;
    port: number | null;
  }>>`
    SELECT current_database() AS database,
           inet_server_addr()::text AS address,
           inet_server_port() AS port
  `;

  if (identity?.database !== "findwork_test" || identity.port !== 5432) {
    throw new Error("Connected PostgreSQL server is not local findwork_test.");
  }
  const loopback = ["127.0.0.1/32", "::1/128", "127.0.0.1", "::1"].includes(identity.address ?? "");
  if ((url.port || "5432") === "5432" && loopback) return;

  // Docker Desktop forwards a loopback host port to a container address. Require
  // an exact PostgreSQL cluster fingerprint supplied by the disposable test run.
  const expected = process.env.FINDWORK_TEST_DOCKER_SYSTEM_ID;
  if ((url.port || "5432") !== "55432" || !expected || !/^\d{15,20}$/.test(expected)) {
    throw new Error("Connected PostgreSQL server is not local findwork_test.");
  }
  const [cluster] = await prisma.$queryRaw<Array<{ system_identifier: bigint }>>`
    SELECT system_identifier FROM pg_control_system()
  `;
  if (String(cluster?.system_identifier) !== expected) {
    throw new Error("Disposable Docker PostgreSQL fingerprint mismatch.");
  }
}
