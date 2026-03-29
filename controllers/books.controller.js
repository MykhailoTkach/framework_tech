import * as db from "#data";
import { MESSAGES } from "#constants";

export async function getBooks(request, reply) {
  const { author } = request.query;

  if (author !== undefined) {
    const result = db
      .getAll()
      .filter((b) => b.author.toLowerCase() === author.toLowerCase());
    return reply.send(result);
  }

  return reply.send(db.getAll());
}

export async function createBook(request, reply) {
  const body = request.body;

  const book = {
    id: db.getNextId(),
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  };

  db.push(book);
  return reply.status(201).send(book);
}

export async function getBookById(request, reply) {
  const { id } = request.params;
  const book = db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);
  return reply.send(book);
}

export async function patchBook(request, reply) {
  const { id } = request.params;
  const body = request.body;

  const book = db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);

  if ("id" in body) throw reply.badRequest(MESSAGES.ID_UPDATE_FORBIDDEN);

  if (body.title !== undefined) book.title = body.title.trim();
  if (body.author !== undefined) book.author = body.author.trim();
  if (body.year !== undefined) book.year = body.year;

  return reply.send(book);
}

export async function putBook(request, reply) {
  const { id } = request.params;
  const body = request.body;

  const index = db.findIndexById(id);
  if (index === -1) throw reply.notFound(MESSAGES.NOT_FOUND);

  if ("id" in body) throw reply.badRequest(MESSAGES.ID_UPDATE_FORBIDDEN);

  db.replaceAt(index, {
    id,
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  });

  return reply.send(db.getAll()[index]);
}

export async function deleteBook(request, reply) {
  const { id } = request.params;

  const index = db.findIndexById(id);
  if (index === -1) throw reply.notFound(MESSAGES.NOT_FOUND);

  const deleted = db.removeAt(index);
  return reply.send({
    message: `Book "${deleted.title}" deleted.`,
    book: deleted,
  });
}
