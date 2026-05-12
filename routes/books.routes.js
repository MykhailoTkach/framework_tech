import {
  getBooks,
  getBookById,
  createBook,
  patchBook,
  putBook,
  deleteBook,
  exportBooks,
  importBooks,
  uploadImage,
  getBookDetails,
  streamBooks,
} from "#controllers";
import {
  createBookSchema,
  updateBookSchema,
  bookQuerySchema,
  bookParamsSchema,
  bookListSchema,
} from "#schemas";

const bookResponse = {
  type: "object",
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    author: { type: "string" },
    year: { type: "integer" },
    genre: { type: "string" },
    image: { type: ["string", "null"] },
  },
};

export default async function booksRoutes(fastify) {
  async function authenticate(request, reply) {
    if (!request.session.userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  }

  // GET — публічні
  fastify.get("/books/export", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          transform: { type: "string", enum: ["true", "false"] },
        },
      },
    },
    handler: exportBooks,
  });

  fastify.get("/books/stream", { handler: streamBooks });

  fastify.get("/books", {
    schema: { querystring: bookQuerySchema, response: { 200: bookListSchema } },
    handler: getBooks,
  });

  fastify.get("/books/:id", {
    schema: { params: bookParamsSchema, response: { 200: bookResponse } },
    handler: getBookById,
  });

  fastify.get("/books/:id/details", {
    schema: { params: bookParamsSchema },
    handler: getBookDetails,
  });

  fastify.post("/books/import", {
    onRequest: [authenticate],
    handler: importBooks,
  });

  fastify.post("/books", {
    onRequest: [authenticate],
    schema: { body: createBookSchema, response: { 201: bookResponse } },
    handler: createBook,
  });

  fastify.patch("/books/:id", {
    onRequest: [authenticate],
    schema: {
      params: bookParamsSchema,
      body: updateBookSchema,
      response: { 200: bookResponse },
    },
    handler: patchBook,
  });

  fastify.put("/books/:id", {
    onRequest: [authenticate],
    schema: {
      params: bookParamsSchema,
      body: createBookSchema,
      response: { 200: bookResponse },
    },
    handler: putBook,
  });

  fastify.delete("/books/:id", {
    onRequest: [authenticate],
    schema: { params: bookParamsSchema },
    handler: deleteBook,
  });

  fastify.post("/books/:id/image", {
    onRequest: [authenticate],
    schema: { params: bookParamsSchema },
    handler: uploadImage,
  });
}
