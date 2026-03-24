import { buildApp } from "./app.js";

const start = async () => {
  const fastify = await buildApp();
  await fastify.listen({
    port: fastify.config.PORT,
    host: fastify.config.HOSTNAME,
  });
};

start();
