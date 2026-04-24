import fs from "fs/promises";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "data", "cache", "reference.json");
const TTL = 120 * 1000; // 120 секунд

export async function getCached(key) {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const cache = JSON.parse(raw);
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function setCached(key, data) {
  let cache = {};
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    cache = JSON.parse(raw);
  } catch {
    // файл не існує — створимо новий
  }
  cache[key] = { data, timestamp: Date.now() };
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}
