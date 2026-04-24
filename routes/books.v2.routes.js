import { getBooksV2 } from "#controllers";
import { bookQueryV2Schema } from "#schemas";

export default async function booksV2Routes(fastify) {
  fastify.get("/books", {
    schema: {
      querystring: bookQueryV2Schema,
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "Book#" } },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
      },
    },
    handler: getBooksV2,
  });
}
