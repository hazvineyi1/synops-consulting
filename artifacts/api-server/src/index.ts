import app from "./app";
import { logger } from "./lib/logger";
import {
  ensureOrganizationsSeed,
  ensurePortalSeed,
  ensureDemoUsers,
  ensureDemoAcademyCurriculum,
  ensureMeridianSeed,
} from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seeds run in dependency order: the internal organization must exist (all
  // envs) before demo users can be bound to it. Demo users and Meridian data are
  // dev-only (those functions self-skip in production).
  void (async () => {
    const { internalOrgId } = await ensureOrganizationsSeed(logger);
    await ensurePortalSeed(logger);
    await ensureDemoUsers(logger, internalOrgId);
    await ensureDemoAcademyCurriculum(logger);
    await ensureMeridianSeed(logger);
  })().catch((err) => {
    logger.error({ err }, "Failed to run startup seeds");
  });
});
