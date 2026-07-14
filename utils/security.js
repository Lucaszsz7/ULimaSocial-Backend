import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error('JWT_SECRET debe tener al menos 24 caracteres');
  }
  return secret;
};

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const createAccessToken = (userId) => {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: userId, iat: now, exp: now + 60 * 60 * 12 });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
};

export const verifyAccessToken = (token) => {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('Token inválido');

  const unsigned = `${header}.${payload}`;
  const expected = createHmac('sha256', getSecret()).update(unsigned).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error('Token inválido');
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.sub || data.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token vencido');
  }
  return data;
};

export const generateOneTimeCode = () => randomInt(100000, 1000000).toString();
export const hashOneTimeCode = (code) => createHash('sha256').update(String(code)).digest('hex');
export const codeExpiresAt = () => new Date(Date.now() + 30 * 60 * 1000);
