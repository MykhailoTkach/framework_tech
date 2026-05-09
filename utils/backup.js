import fs from "fs/promises";
import { createWriteStream } from "fs";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 5;

export async function performBackup(logger, bookRepo) {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  // Отримуємо дані з MySQL через репозиторій
  const books = await bookRepo.getAll();

  if (books.length === 0) {
    logger?.info("Nothing to backup — DB is empty.");
    return;
  }

  const combined = books.map((b) => JSON.stringify(b)).join("\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

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
