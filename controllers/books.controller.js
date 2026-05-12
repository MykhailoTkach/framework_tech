import { MESSAGES } from "#constants";
import { withImageUrl } from "../utils/imageUrl.js";
import { stringify as stringifySync } from "csv-stringify/sync";
import { stringify as stringifyStream } from "csv-stringify";
import { parse } from "csv-parse/sync";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { pipeline } from "stream/promises";
import { Readable, Transform } from "stream";
import { BookAgeTransform } from "../src/transforms/bookTransform.js";
import { bookEvents, EVENTS } from "../src/events/bookEvents.js";
import { REDIS_KEYS } from "../constants/redis.keys.js";
import { createCacheService } from "../services/cache.service.js";

const importSchema = {
  type: "object",
  required: ["title", "author", "year"],
  properties: {
    title: { type: "string", minLength: 1 },
    author: { type: "string", minLength: 1 },
    year: { type: "integer", minimum: 0, maximum: new Date().getFullYear() },
    genre: { type: "string" },
  },
};
const ajv = new Ajv({ coerceTypes: true });
const validateImport = ajv.compile(importSchema);

function getRepo(request) {
  return request.server.bookRepo;
}

function getCache(request) {
  return createCacheService({ redis: request.server.redis });
}

async function invalidateBooksCache(redis) {
  const cache = createCacheService({ redis });
  await cache.delByPattern("books:page:*");
}

export async function getBooks(request, reply) {
  const db = getRepo(request);
  const { author } = request.query;
  let books = await db.getAll();
  if (author !== undefined) {
    books = books.filter(
      (b) => b.author.toLowerCase() === author.toLowerCase(),
    );
  }
  return reply.send(books.map((b) => withImageUrl(request, b)));
}

export async function getBooksV2(request, reply) {
  const db = getRepo(request);
  const cache = getCache(request);
  const { author, page = 1, limit = 10 } = request.query;

  if (!author) {
    const cacheKey = REDIS_KEYS.booksPage(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached) return reply.send(cached);

    let books = await db.getAll();
    const total = books.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = books
      .slice(start, start + limit)
      .map((b) => withImageUrl(request, b));

    const result = { data, meta: { total, page, limit, totalPages } };
    await cache.set(cacheKey, result, 86400); // TTL 24 години
    return reply.send(result);
  }

  let books = await db.getAll();
  books = books.filter((b) => b.author.toLowerCase() === author.toLowerCase());

  const total = books.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = books
    .slice(start, start + limit)
    .map((b) => withImageUrl(request, b));

  return reply.send({ data, meta: { total, page, limit, totalPages } });
}

export async function getBookDetails(request, reply) {
  const db = getRepo(request);
  const cache = getCache(request);
  const { id } = request.params;
  const book = await db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);

  const cacheKey = REDIS_KEYS.genreCache(book.genre);
  let genreData = await cache.get(cacheKey);

  if (!genreData) {
    try {
      const response = await fetchWithRetry(
        `http://localhost:3001/genres?name=${encodeURIComponent(book.genre)}`,
      );
      const genres = await response.json();
      genreData = genres[0] ?? null;
      if (genreData) await cache.set(cacheKey, genreData, 120);
    } catch {
      genreData = null;
    }
  }

  return reply.send({
    ...withImageUrl(request, book),
    genreDetails: genreData,
  });
}

export async function createBook(request, reply) {
  const db = getRepo(request);
  const body = request.body;
  const book = await db.create({
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
    genre: body.genre?.trim() ?? "",
  });
  await invalidateBooksCache(request.server.redis);
  bookEvents.emit(EVENTS.CREATED, book);
  return reply.status(201).send(withImageUrl(request, book));
}

export async function getBookById(request, reply) {
  const db = getRepo(request);
  const { id } = request.params;
  const book = await db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);
  return reply.send(withImageUrl(request, book));
}

export async function patchBook(request, reply) {
  const db = getRepo(request);
  const { id } = request.params;
  const body = request.body;

  const book = await db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);
  if ("id" in body) throw reply.badRequest(MESSAGES.ID_UPDATE_FORBIDDEN);

  const updates = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.author !== undefined) updates.author = body.author.trim();
  if (body.year !== undefined) updates.year = body.year;
  if (body.genre !== undefined) updates.genre = body.genre.trim();

  const updated = await db.update(id, updates);
  await invalidateBooksCache(request.server.redis);
  bookEvents.emit(EVENTS.UPDATED, updated);
  return reply.send(withImageUrl(request, updated));
}

export async function putBook(request, reply) {
  const db = getRepo(request);
  const { id } = request.params;
  const body = request.body;

  const existing = await db.findById(id);
  if (!existing) throw reply.notFound(MESSAGES.NOT_FOUND);
  if ("id" in body) throw reply.badRequest(MESSAGES.ID_UPDATE_FORBIDDEN);

  const replaced = await db.replace(id, {
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
    genre: body.genre?.trim() ?? "",
    image: existing.image,
  });
  await invalidateBooksCache(request.server.redis);
  bookEvents.emit(EVENTS.UPDATED, replaced);
  return reply.send(withImageUrl(request, replaced));
}

export async function deleteBook(request, reply) {
  const db = getRepo(request);
  const { id } = request.params;
  const deleted = await db.remove(id);
  if (!deleted) throw reply.notFound(MESSAGES.NOT_FOUND);
  await invalidateBooksCache(request.server.redis);
  return reply.send({
    message: `Book "${deleted.title}" deleted.`,
    book: deleted,
  });
}

export async function exportBooks(request, reply) {
  const db = getRepo(request);
  const { transform } = request.query;
  const books = await db.getAll();

  const rows = books.map((b) => ({
    ...b,
    image: b.image
      ? `${request.protocol}://${request.host}/uploads${b.image}`
      : "",
  }));

  reply.header("Content-Type", "text/csv");
  reply.header("Content-Disposition", 'attachment; filename="books.csv"');

  if (transform === "true") {
    const csvStringify = stringifyStream({ header: true });
    await pipeline(
      Readable.from(rows),
      new BookAgeTransform(),
      csvStringify,
      reply.raw,
    );
  } else {
    const csv = stringifySync(rows, { header: true });
    return reply.send(csv);
  }
}

export async function streamBooks(request, reply) {
  const db = getRepo(request);
  const books = await db.getAll();

  const toNdjson = new Transform({
    objectMode: true,
    transform(book, encoding, callback) {
      const withUrl = withImageUrl(request, book);
      callback(null, JSON.stringify(withUrl) + "\n");
    },
  });

  reply.raw.setHeader("Content-Type", "application/x-ndjson");
  await pipeline(Readable.from(books), toNdjson, reply.raw);
}

export async function importBooks(request, reply) {
  const db = getRepo(request);
  const data = await request.file();
  const buffer = await data.toBuffer();

  let records;
  if (data.mimetype === "application/json" || data.filename.endsWith(".json")) {
    try {
      records = JSON.parse(buffer.toString());
    } catch {
      throw reply.badRequest("Invalid JSON file.");
    }
  } else if (data.mimetype === "text/csv" || data.filename.endsWith(".csv")) {
    records = parse(buffer, { columns: true, skip_empty_lines: true });
  } else {
    throw reply.badRequest("Unsupported format. Use JSON or CSV.");
  }

  if (!Array.isArray(records)) {
    throw reply.badRequest("File must contain an array of records.");
  }

  let imported = 0;
  const rejected = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const record = {
      title: raw.title?.trim(),
      author: raw.author?.trim(),
      year: Number(raw.year),
      genre: raw.genre?.trim() ?? "",
    };

    const valid = validateImport(record);
    if (!valid) {
      rejected.push({
        index: i + 1,
        reason: ajv.errorsText(validateImport.errors),
      });
      continue;
    }

    await db.create(record);
    imported++;
  }

  return reply.send({ imported, rejectedCount: rejected.length, rejected });
}

export async function uploadImage(request, reply) {
  const db = getRepo(request);
  const { id } = request.params;
  const book = await db.findById(id);
  if (!book) throw reply.notFound(MESSAGES.NOT_FOUND);

  const data = await request.file();

  if (!["image/jpeg", "image/png"].includes(data.mimetype)) {
    throw reply.badRequest("Only JPEG and PNG images are allowed.");
  }

  const ext = data.mimetype === "image/jpeg" ? ".jpg" : ".png";
  const uploadDir = path.join(process.cwd(), "uploads", String(id));
  await fs.mkdir(uploadDir, { recursive: true });

  const dest = path.join(uploadDir, `image${ext}`);
  const writable = createWriteStream(dest);

  await new Promise((resolve, reject) => {
    data.file.pipe(writable);
    writable.on("finish", resolve);
    writable.on("error", reject);
  });

  const relPath = `/${id}/image${ext}`;
  const updated = await db.update(id, { image: relPath });
  return reply.send(withImageUrl(request, updated));
}
