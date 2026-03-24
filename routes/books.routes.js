import {
  getBooks,
  createBook,
  patchBook,
  putBook,
  deleteBook,
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
  },
};

export default async function booksRoutes(fastify) {
  fastify.get("/books", {
    schema: {
      querystring: bookQuerySchema,
      response: { 200: bookListSchema },
    },
    handler: getBooks,
  });

  fastify.post("/books", {
    schema: {
      body: createBookSchema,
      response: { 201: bookResponse },
    },
    handler: createBook,
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
    schema: {
      params: bookParamsSchema,
    },
    handler: deleteBook,
  });
}
