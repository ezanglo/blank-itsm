import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = path.join(process.cwd(), ".data", "attachments");
const MAX_BYTES = 5 * 1024 * 1024;

export { MAX_BYTES as MAX_ATTACHMENT_BYTES };

function resolveStoragePath(storageKey: string): string {
  const fullPath = path.join(ROOT, storageKey);
  const normalizedRoot = path.resolve(ROOT);
  const normalizedFull = path.resolve(fullPath);
  if (!normalizedFull.startsWith(normalizedRoot + path.sep) && normalizedFull !== normalizedRoot) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

export async function saveAttachmentFile(
  orgId: string,
  ticketId: string,
  fileName: string,
  bytes: Buffer
): Promise<string> {
  if (bytes.length > MAX_BYTES) {
    throw new Error("Attachment exceeds maximum size (5MB)");
  }

  const storageKey = path.join(orgId, ticketId, `${randomUUID()}-${sanitizeFileName(fileName)}`);
  const fullPath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
  return storageKey;
}

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

export async function deleteAttachmentFile(storageKey: string): Promise<void> {
  await unlink(resolveStoragePath(storageKey)).catch(() => undefined);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}
