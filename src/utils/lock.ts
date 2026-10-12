// Password hashing for note locks (C3).
// The password is NEVER stored. Only { salt, hash } persist.
// Interim KDF: SHA-256(salt || password) x N iterations via WebCrypto
// (works on https://localhost, which is a secure context in the WebView).

const ITERATIONS = 20000;

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes.buffer as ArrayBuffer);
}

export async function hashPassword(
  password: string,
  saltHex: string
): Promise<string> {
  const enc = new TextEncoder();
  let data: Uint8Array = new Uint8Array([
    ...hexToBytes(saltHex),
    ...enc.encode(password),
  ]);
  for (let i = 0; i < ITERATIONS; i++) {
    const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
    data = new Uint8Array(digest);
  }
  return bytesToHex(data.buffer as ArrayBuffer);
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string
): Promise<boolean> {
  if (!saltHex || !expectedHash) return false;
  const hash = await hashPassword(password, saltHex);
  return hash === expectedHash;
}
