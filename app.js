import { NODE_ENV } from "./config/node-env.js";

import Fastify from "fastify";
import fastifyEnv from "@fastify/env";
import fastifySensible from "@fastify/sensible";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs/promises";

import { envSchema, bookSchema } from "#schemas";
import booksRoutes from "./routes/books.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { SHUTDOWN_TIMEOUT_MS } from "#constants";
import { performBackup } from "./utils/backup.js";
import { computeModelHash, getSavedHash } from "./src/migrations/migrate.js";
import { BookModel } from "./src/models/book.model.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: NODE_ENV === "production" ? "error" : "info",
      transport:
        NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
    },
  });

  await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  await fastify.register(fastifyHelmet, {
    global: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await fastify.register(fastifyCors, {
    origin:
      fastify.config.NODE_ENV === "production" ? "https://example.com" : "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  await fastify.register(fastifySensible);

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

  await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), "uploads"),
    prefix: "/uploads/",
  });

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(
      { err: error, method: request.method, url: request.url },
      "Request error",
    );
    reply.status(error.statusCode ?? 500).send({
      statusCode: error.statusCode ?? 500,
      error: error.name,
      message: error.message,
    });
  });

  fastify.addSchema(bookSchema);

  // Бекап при запуску
  try {
    await performBackup(fastify.log);
  } catch (err) {
    fastify.log.error(`Backup failed: ${err.message}`);
  }

  // Перевірка міграції
  try {
    const current = computeModelHash(BookModel);
    const saved = await getSavedHash();
    if (current !== saved) {
      fastify.log.warn(
        'Data schema changed. Run "npm run migrate" to update existing files.',
      );
    }
  } catch (err) {
    fastify.log.error(`Migration check failed: ${err.message}`);
  }

  await fastify.register(healthRoutes);
  await fastify.register(booksRoutes);

  fastify.addHook("onClose", async () => {
    fastify.log.info("Server closed successfully.");
  });

  function gracefulShutdown(signal) {
    fastify.log.warn(`Received ${signal}. Starting graceful shutdown...`);
    const timer = setTimeout(() => {
      fastify.log.error("Shutdown timeout exceeded. Forcing exit.");
      process.exit(2);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    fastify.close().then(() => process.exit(0));
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("uncaughtException", (err) => {
    fastify.log.error(`Uncaught Exception: ${err.message}`);
    gracefulShutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    fastify.log.error(`Unhandled Rejection: ${msg}`);
    gracefulShutdown("unhandledRejection");
  });

  return fastify;
}
