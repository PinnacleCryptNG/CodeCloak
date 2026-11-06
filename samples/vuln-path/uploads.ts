// FICTIONAL — for hackathon demo only.
import { promises as fs } from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function readUpload(filename: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, filename);
  return fs.readFile(filePath);
}

export async function saveUpload(filename: string, data: Buffer): Promise<string> {
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}
