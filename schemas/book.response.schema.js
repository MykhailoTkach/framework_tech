export const bookSchema = {
  $id: "Book",
  type: "object",
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    author: { type: "string" },
    year: { type: "integer" },
  },
};

export const bookListSchema = {
  type: "array",
  items: { $ref: "Book#" },
};
