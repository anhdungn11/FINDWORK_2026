import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { CompanyInvitationsRepository } from "../modules/company/company-invitations.repository";
import { InvitationMaintenanceModule } from "./invitation-maintenance.module";
import { InvitationCleanupScheduler } from "./invitation-cleanup.scheduler";

async function start(): Promise<void> {
  // This process performs database maintenance only. It does not require the
  // invitation delivery flag, verification worker settings, or a provider call.
  const app = await NestFactory.createApplicationContext(InvitationMaintenanceModule, { logger: ["error", "warn"] });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const cleanup = new InvitationCleanupScheduler(app.get(CompanyInvitationsRepository), () => {
      process.stderr.write("Invitation cleanup failed; retry scheduled.\n");
    });
    while (!stopping) {
      const result = await cleanup.runDue();
      // A full batch gets another bounded pass; normal and failed passes wait.
      await new Promise<void>((resolve) => setTimeout(resolve, result === "more" ? 250 : 1500));
    }
  } finally {
    await app.close();
  }
}

void start().catch(() => {
  process.stderr.write("Invitation maintenance stopped: check safe configuration and database connectivity.\n");
  process.exitCode = 1;
});
