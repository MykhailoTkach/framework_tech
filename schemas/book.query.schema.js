"use strict";

const bookQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    author: { type: "string", minLength: 1 },
  },
};

module.exports = bookQuerySchema;
