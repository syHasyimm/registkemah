import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
const storageRoot = () =>
  path.resolve(
    /* turbopackIgnore: true */
    process.env.PRIVATE_STORAGE_DIR ||
      path.join(process.cwd(), ".data", "camp"),
  );
function filePath(key: string) {
  if (!/^[a-f0-9-]{36}\.(webp|png|pdf)$/.test(key))
    throw new Error("Invalid private storage key");
  return path.join(/* turbopackIgnore: true */ storageRoot(), key);
}
export async function writePrivateFile(
  bytes: Buffer,
  extension: "webp" | "png" | "pdf",
) {
  await mkdir(storageRoot(), { recursive: true });
  const key = `${randomUUID()}.${extension}`;
  const target = filePath(key);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { mode: 0o600, flag: "wx" });
  await rename(temporary, target);
  return key;
}
export async function readPrivateFile(key: string) {
  return readFile(/* turbopackIgnore: true */ filePath(key));
}
