import fs from "fs/promises";
import path from "path";

/**
 * Враховані винятки:
 * 1. ENOENT — директорія відсутня → mkdir { recursive: true }
 * 2. Збій під час writeFile → видаляємо tmp (ENOENT ігноруємо — файл не встиг створитись)
 * 3. Будь-яка інша помилка cleanup → логуємо і пробрасовуємо далі
 */
export async function writeAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, filePath);
  } catch (error) {
    try {
      await fs.unlink(tmp);
    } catch (unlinkError) {
      if (unlinkError.code !== "ENOENT") {
        console.error("Failed to cleanup tmp file:", unlinkError);
      }
    }
    throw error;
  }
}
