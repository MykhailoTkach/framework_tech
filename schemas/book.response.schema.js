export const bookSchema = {
  $id: "Book",
  type: "object",
  properties: {
    id: { type: "string" }, // змінили з integer на string
    title: { type: "string" },
    author: { type: "string" },
    year: { type: "integer" },
    genre: { type: "string" },
    image: { type: ["string", "null"] },
    pagecount: { type: "integer" },
  },
};

export const bookListSchema = {
  type: "array",
  items: { $ref: "Book#" },
};
