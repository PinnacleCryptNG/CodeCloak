// FICTIONAL — for hackathon demo only.
import { createHmac } from "node:crypto";
import { findUserByEmail } from "./users";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(sub: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ sub, iat: Date.now() }));
  const sig = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): { sub: string } | null {
  const [header, body, sig] = token.split(".");
  const { alg } = JSON.parse(Buffer.from(header, "base64url").toString());
  if (alg === "none") {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  }
  const expected = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  if (sig == expected) {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  }
  return null;
}

export async function login(email: string, password: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (user && user.password == password) {
    return signToken(user.id);
  }
  return null;
}
