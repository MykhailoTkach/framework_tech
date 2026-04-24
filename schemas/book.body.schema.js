import { CURRENT_YEAR } from "#constants";

export const createBookSchema = {
  type: "object",
  required: ["title", "author", "year"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    author: { type: "string", minLength: 1 },
    year: { type: "integer", minimum: 0, maximum: CURRENT_YEAR },
    genre: { type: "string", minLength: 1 },
    pagecount: { type: "integer", minimum: 0 },
  },
};

export const updateBookSchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    title: { type: "string", minLength: 1 },
    author: { type: "string", minLength: 1 },
    year: { type: "integer", minimum: 0, maximum: CURRENT_YEAR },
    genre: { type: "string", minLength: 1 },
    pagecount: { type: "integer", minimum: 0 },
  },
};
