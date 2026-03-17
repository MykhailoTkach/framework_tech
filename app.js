import http from "http";
import config from "#config";
import * as logger from "#logger";
import router from "#routes";
import { SHUTDOWN_TIMEOUT_MS } from "#constants";

const server = http.createServer(router);

function gracefulShutdown(signal) {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Shutdown timeout exceeded. Forcing exit with code 2.");
    process.exit(2);
  }, SHUTDOWN_TIMEOUT_MS);

  forceExitTimer.unref();

  server.close((err) => {
    if (err) {
      logger.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
    logger.info("Server closed successfully. Exiting with code 0.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${msg}`);
  gracefulShutdown("unhandledRejection");
});

server.listen(config.PORT, config.HOSTNAME, () => {
  logger.info(
    `Book Catalog server running at http://${config.HOSTNAME}:${config.PORT}`,
  );
  logger.info(`Mode: ${config.NODE_ENV}`);
  logger.info("Available endpoints:");
  logger.info("  GET    /health              — process health info");
  logger.info("  GET    /books?author=<n>    — list all or filter by author");
  logger.info("  POST   /books               — create a new book");
  logger.info("  PATCH  /books/:id           — partial update");
  logger.info("  PUT    /books/:id           — full update");
  logger.info("  DELETE /books/:id           — delete a book");
});
