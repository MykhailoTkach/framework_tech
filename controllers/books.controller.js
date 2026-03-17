import Ajv from "ajv";

import send from "#utils/send";
import getBody from "#utils/getBody";
import { parseQuery } from "#utils/parseUrl";
import * as db from "#data";
import {
  createBookSchema,
  updateBookSchema,
  bookQuerySchema,
  bookParamsSchema,
} from "#schemas";

const ajv = new Ajv({ allErrors: true });
const validateCreate = ajv.compile(createBookSchema);
const validateUpdate = ajv.compile(updateBookSchema);
const validateQuery = ajv.compile(bookQuerySchema);
const validateParams = ajv.compile(bookParamsSchema);

function formatErrors(errs) {
  return errs.map((e) => `${e.instancePath} ${e.message}`.trim());
}

function handleGetBooks(req, res) {
  const query = parseQuery(req.url);

  const valid = validateQuery(query);
  if (!valid) {
    return send(res, 400, { errors: formatErrors(validateQuery.errors) });
  }

  if (query.author !== undefined) {
    const result = db
      .getAll()
      .filter((b) => b.author.toLowerCase() === query.author.toLowerCase());
    return send(res, 200, result);
  }

  send(res, 200, db.getAll());
}

async function handlePostBook(req, res) {
  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  const valid = validateCreate(body);
  if (!valid)
    return send(res, 400, { errors: formatErrors(validateCreate.errors) });

  const book = {
    id: db.getNextId(),
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  };

  db.push(book);
  send(res, 201, book);
}

async function handlePatchBook(req, res, id) {
  const paramsValid = validateParams({ id });
  if (!paramsValid)
    return send(res, 400, { errors: formatErrors(validateParams.errors) });

  const book = db.findById(id);
  if (!book) return send(res, 404, { error: `Book with id ${id} not found.` });

  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  if ("id" in body)
    return send(res, 400, { error: 'Updating "id" is not allowed.' });

  const valid = validateUpdate(body);
  if (!valid)
    return send(res, 400, { errors: formatErrors(validateUpdate.errors) });

  if (body.title !== undefined) book.title = body.title.trim();
  if (body.author !== undefined) book.author = body.author.trim();
  if (body.year !== undefined) book.year = body.year;

  send(res, 200, book);
}

async function handlePutBook(req, res, id) {
  const paramsValid = validateParams({ id });
  if (!paramsValid)
    return send(res, 400, { errors: formatErrors(validateParams.errors) });

  const index = db.findIndexById(id);
  if (index === -1)
    return send(res, 404, { error: `Book with id ${id} not found.` });

  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  if ("id" in body)
    return send(res, 400, { error: 'Updating "id" is not allowed.' });

  const valid = validateCreate(body);
  if (!valid)
    return send(res, 400, { errors: formatErrors(validateCreate.errors) });

  db.replaceAt(index, {
    id,
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  });

  send(res, 200, db.getAll()[index]);
}

function handleDeleteBook(req, res, id) {
  const paramsValid = validateParams({ id });
  if (!paramsValid)
    return send(res, 400, { errors: formatErrors(validateParams.errors) });

  const index = db.findIndexById(id);
  if (index === -1)
    return send(res, 404, { error: `Book with id ${id} not found.` });

  const deleted = db.removeAt(index);
  send(res, 200, {
    message: `Book "${deleted.title}" deleted.`,
    book: deleted,
  });
}

export {
  handleGetBooks,
  handlePostBook,
  handlePatchBook,
  handlePutBook,
  handleDeleteBook,
};
