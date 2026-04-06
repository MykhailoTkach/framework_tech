import fs from "fs/promises";
import path from "path";
import { writeAtomic } from "../utils/atomicWrite.js";
import { BookModel } from "../src/models/book.model.js";

const DATA_DIR = path.join(process.cwd(), "data", "items");

function filePath(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function getAll() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = (await fs.readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  const books = await Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
      return JSON.parse(raw);
    }),
  );
  return books.sort((a, b) => a.id - b.id);
}

export async function findById(id) {
  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function create(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const all = await getAll();
  const id = all.length > 0 ? Math.max(...all.map((b) => b.id)) + 1 : 1;
  const book = { id, ...BookModel, ...data };
  await writeAtomic(filePath(id), book);
  return book;
}

export async function update(id, data) {
  const book = await findById(id);
  if (!book) return null;
  const updated = { ...book, ...data };
  await writeAtomic(filePath(id), updated);
  return updated;
}

export async function replace(id, data) {
  const book = await findById(id);
  if (!book) return null;
  const replaced = { id, ...BookModel, ...data };
  await writeAtomic(filePath(id), replaced);
  return replaced;
}

export async function remove(id) {
  const book = await findById(id);
  if (!book) return null;
  await fs.unlink(filePath(id));
  return book;
}
