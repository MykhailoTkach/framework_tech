"use strict";

const bookParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "integer", minimum: 1 },
  },
};

module.exports = bookParamsSchema;
