import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { BookModel } from "../models/book.model.js";
import { writeAtomic } from "../../utils/atomicWrite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data/items");
const VERSION_FILE = path.join(__dirname, "../../data/version.json");

export function computeModelHash(model) {
  return crypto.createHash("md5").update(JSON.stringify(model)).digest("hex");
}

export async function getSavedHash() {
  try {
    const raw = await fs.readFile(VERSION_FILE, "utf8");
    return JSON.parse(raw).hash ?? null;
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function runMigration() {
  const currentHash = computeModelHash(BookModel);
  const savedHash = await getSavedHash();

  if (currentHash === savedHash) {
    console.log("No migration needed. Schema is up to date.");
    return;
  }

  console.log("Running migration...");
  await fs.mkdir(DATA_DIR, { recursive: true });

  const files = (await fs.readdir(DATA_DIR).catch(() => [])).filter((f) =>
    f.endsWith(".json"),
  );

  for (const file of files) {
    const fp = path.join(DATA_DIR, file);
    const item = JSON.parse(await fs.readFile(fp, "utf8"));
    // Дефолтні значення з BookModel — наявні поля зберігаються
    await writeAtomic(fp, { ...BookModel, ...item });
    console.log(`  ✓ migrated ${file}`);
  }

  await writeAtomic(VERSION_FILE, { hash: currentHash });
  console.log("Migration complete.");
}

// Запускаємо тільки якщо файл викликаний напряму
if (process.argv[1] === __filename) {
  runMigration().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
