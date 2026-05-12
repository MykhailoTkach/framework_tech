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

async function verifyJwt(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export default async function booksRoutes(fastify) {
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
    onRequest: [verifyJwt],
    handler: importBooks,
  });

  fastify.post("/books", {
    onRequest: [verifyJwt],
    schema: { body: createBookSchema, response: { 201: bookResponse } },
    handler: createBook,
  });

  fastify.patch("/books/:id", {
    onRequest: [verifyJwt],
    schema: {
      params: bookParamsSchema,
      body: updateBookSchema,
      response: { 200: bookResponse },
    },
    handler: patchBook,
  });

  fastify.put("/books/:id", {
    onRequest: [verifyJwt],
    schema: {
      params: bookParamsSchema,
      body: createBookSchema,
      response: { 200: bookResponse },
    },
    handler: putBook,
  });

  fastify.delete("/books/:id", {
    onRequest: [verifyJwt],
    schema: { params: bookParamsSchema },
    handler: deleteBook,
  });

  fastify.post("/books/:id/image", {
    onRequest: [verifyJwt],
    schema: { params: bookParamsSchema },
    handler: uploadImage,
  });
}
