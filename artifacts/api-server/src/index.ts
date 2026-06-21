import app from "./app";
import { logger } from "./lib/logger";
import {
  pruneDevData,
  ensureOrganizationsSeed,
  ensureDemoUsers,
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

  // Seeds run in dependency order:
  // 1. pruneDevData (dev only) clears all curriculum content and removes surplus
  //    accounts/orgs so the product boots clean on every restart.
  // 2. ensureOrganizationsSeed (all envs) ensures the internal org exists.
  // 3. ensureDemoUsers (dev only) creates the two example accounts if absent.
  void (async () => {
    await pruneDevData(logger);
    const { internalOrgId } = await ensureOrganizationsSeed(logger);
    await ensureDemoUsers(logger, internalOrgId);
  })().catch((err) => {
    logger.error({ err }, "Failed to run startup seeds");
  });
});
