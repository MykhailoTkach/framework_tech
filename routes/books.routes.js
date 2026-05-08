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
    id: { type: "string" }, // змінили з integer на string
    title: { type: "string" },
    author: { type: "string" },
    year: { type: "integer" },
    genre: { type: "string" },
    image: { type: ["string", "null"] },
  },
};

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
  fastify.post("/books/import", { handler: importBooks });

  fastify.get("/books", {
    schema: { querystring: bookQuerySchema, response: { 200: bookListSchema } },
    handler: getBooks,
  });

  fastify.post("/books", {
    schema: { body: createBookSchema, response: { 201: bookResponse } },
    handler: createBook,
  });

  fastify.get("/books/:id", {
    schema: { params: bookParamsSchema, response: { 200: bookResponse } },
    handler: getBookById,
  });

  fastify.patch("/books/:id", {
    schema: {
      params: bookParamsSchema,
      body: updateBookSchema,
      response: { 200: bookResponse },
    },
    handler: patchBook,
  });

  fastify.put("/books/:id", {
    schema: {
      params: bookParamsSchema,
      body: createBookSchema,
      response: { 200: bookResponse },
    },
    handler: putBook,
  });

  fastify.delete("/books/:id", {
    schema: { params: bookParamsSchema },
    handler: deleteBook,
  });

  fastify.post("/books/:id/image", {
    schema: { params: bookParamsSchema },
    handler: uploadImage,
  });
  // s
  fastify.get("/books/:id/details", {
    schema: { params: bookParamsSchema },
    handler: getBookDetails,
  });
}
