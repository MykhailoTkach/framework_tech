"use strict";

const envSchema = require("./env.schema");
const { createBookSchema, updateBookSchema } = require("./book.body.schema");
const bookQuerySchema = require("./book.query.schema");
const bookParamsSchema = require("./book.params.schema");

module.exports = {
  envSchema,
  createBookSchema,
  updateBookSchema,
  bookQuerySchema,
  bookParamsSchema,
};
