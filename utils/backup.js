import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "items");
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 5;

export async function performBackup(logger) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const files = (await fs.readdir(DATA_DIR).catch(() => [])).filter((f) =>
    f.endsWith(".json"),
  );

  if (files.length === 0) {
    logger?.info("Nothing to backup — data/items/ is empty.");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(BACKUPS_DIR, timestamp);
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    await fs.copyFile(path.join(DATA_DIR, file), path.join(backupDir, file));
  }
  logger?.info(`Backup created: data/backups/${timestamp}/`);

  const allBackups = (await fs.readdir(BACKUPS_DIR)).sort();
  if (allBackups.length > MAX_BACKUPS) {
    const toDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS);
    for (const dir of toDelete) {
      await fs.rm(path.join(BACKUPS_DIR, dir), { recursive: true });
      logger?.info(`Old backup removed: ${dir}`);
    }
  }
}
