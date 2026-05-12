import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";
import { createBookRepository } from "../data/books.data.js";

async function drizzlePlugin(fastify) {
  if (!fastify.mysql) {
    throw new Error("MySQL pool is not registered.");
  }

  const db = drizzle(fastify.mysql, { schema, mode: "default" });
  fastify.decorate("drizzle", db);
  // bookRepo через DI поверх drizzle
  fastify.decorate("bookRepo", createBookRepository(db));

  fastify.addHook("onClose", async () => {
    fastify.log.info("Drizzle layer closed");
  });
}

export default fp(drizzlePlugin, {
  name: "drizzle-plugin",
  dependencies: ["mysql-plugin"],
});
