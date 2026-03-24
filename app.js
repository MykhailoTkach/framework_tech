import { NODE_ENV } from "./config/node-env.js";

import Fastify from "fastify";
import fastifyEnv from "@fastify/env";
import fastifySensible from "@fastify/sensible";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";

import { envSchema, bookSchema } from "#schemas";
import booksRoutes from "./routes/books.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { SHUTDOWN_TIMEOUT_MS } from "#constants";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: NODE_ENV === "production" ? "error" : "info",
      transport:
        NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
    },
  });

  // 1. env — першим, fastify.config потрібен усім
  await fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  // 2. helmet — захисні заголовки для всіх відповідей
  await fastify.register(fastifyHelmet, { global: true });

  // 3. cors — залежно від середовища
  await fastify.register(fastifyCors, {
    origin:
      fastify.config.NODE_ENV === "production" ? "https://example.com" : "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  // 4. sensible — reply.notFound() тощо доступні в маршрутах
  await fastify.register(fastifySensible);

  // 5. централізована обробка помилок
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

  // 6. реєстрація схем для $ref
  fastify.addSchema(bookSchema);

  // 7. маршрути — останніми
  await fastify.register(healthRoutes);
  await fastify.register(booksRoutes);

  // хук закриття сервера
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
