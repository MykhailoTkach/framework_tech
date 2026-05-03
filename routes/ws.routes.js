import { bookEvents, EVENTS } from "../src/events/bookEvents.js";
import * as db from "#data";

export default async function wsRoutes(fastify) {
  fastify.get("/ws", { websocket: true }, async (socket) => {
    // При підключенні — надсилаємо поточний список
    const books = await db.getAll();
    socket.send(JSON.stringify({ event: "init", data: books }));

    const onCreated = (book) => {
      socket.send(JSON.stringify({ event: "created", data: book }));
    };
    const onUpdated = (book) => {
      socket.send(JSON.stringify({ event: "updated", data: book }));
    };
    const onDeleted = ({ id }) => {
      socket.send(JSON.stringify({ event: "deleted", id }));
    };

    bookEvents.on(EVENTS.CREATED, onCreated);
    bookEvents.on(EVENTS.UPDATED, onUpdated);
    bookEvents.on(EVENTS.DELETED, onDeleted);

    socket.on("close", () => {
      bookEvents.off(EVENTS.CREATED, onCreated);
      bookEvents.off(EVENTS.UPDATED, onUpdated);
      bookEvents.off(EVENTS.DELETED, onDeleted);
    });
  });
}
