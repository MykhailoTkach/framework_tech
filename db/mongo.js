import fp from "fastify-plugin";
import mongoose from "mongoose";
import { createBookRepository } from "../data/books.data.js";
import "./models/book.model.js"; // реєструємо модель

async function mongoPlugin(fastify) {
  try {
    await mongoose.connect(fastify.config.MONGO_URL, {
      dbName: fastify.config.MONGO_DB_NAME,
    });
    fastify.log.info("MongoDB connected");
    fastify.decorate("mongoose", mongoose);
    fastify.decorate("bookRepo", createBookRepository(mongoose));
  } catch (err) {
    fastify.log.error(err, "MongoDB connection error");
    process.exit(1); // при помилці завершуємо процес
  }

  // закриття через хук onClose
  fastify.addHook("onClose", async () => {
    await mongoose.connection.close();
    fastify.log.info("MongoDB connection closed");
  });
}

export default fp(mongoPlugin);
