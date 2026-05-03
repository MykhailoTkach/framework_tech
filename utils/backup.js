import fs from "fs/promises";
import { createWriteStream } from "fs";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "items");
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 5;

export async function performBackup(logger) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const files = (await fs.readdir(DATA_DIR).catch(() => [])).filter((f) =>
    f.endsWith(".json"),
  );

  if (files.length === 0) {
    logger?.info("Nothing to backup — data/items/ is empty.");
    return;
  }

  // Зчитуємо вміст всіх файлів і обєднуємо
  const contents = await Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(DATA_DIR, f), "utf8");
      return raw;
    }),
  );

  // Обєднуємо всі JSON файли через новий рядок
  const combined = contents.join("\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

  // pipeline
  await pipeline(
    Readable.from([combined]),
    createGzip(),
    createWriteStream(backupPath),
  );

  logger?.info(`Backup created: data/backups/${timestamp}.gz`);

  const allBackups = (await fs.readdir(BACKUPS_DIR))
    .filter((f) => f.endsWith(".gz"))
    .sort();

  if (allBackups.length > MAX_BACKUPS) {
    const toDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUPS_DIR, file));
      logger?.info(`Old backup removed: ${file}`);
    }
  }
}
