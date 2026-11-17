import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const SALT = 'golpro-mailbox-v1';

export function sealToken(plain: string, secret: string): string {
  const key = scryptSync(secret, SALT, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function openToken(sealed: string, secret: string): string {
  const raw = Buffer.from(sealed, 'base64url');
  if (raw.length < 29) {
    throw new Error('Token de buzón inválido.');
  }
  const key = scryptSync(secret, SALT, 32);
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
}

export function signMailboxState(userId: number, secret: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: now + 10 * 60 * 1000 }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readMailboxState(
  state: string,
  secret: string,
  now = Date.now(),
): number | null {
  const [payload, signature] = state.split('.');
  if (!payload || !signature || state.split('.').length !== 2) return null;

  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof data.uid !== 'number' || !Number.isSafeInteger(data.uid) || data.uid <= 0) {
      return null;
    }
    if (typeof data.exp !== 'number' || data.exp < now) return null;
    return data.uid;
  } catch {
    return null;
  }
}
