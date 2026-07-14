import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessToken, generateOneTimeCode, verifyAccessToken } from '../utils/security.js';

process.env.JWT_SECRET = 'secreto-de-pruebas-con-longitud-suficiente';

test('crea y valida un token de acceso', () => {
  const token = createAccessToken('usuario-prueba');
  assert.equal(verifyAccessToken(token).sub, 'usuario-prueba');
});

test('rechaza tokens manipulados', () => {
  const token = createAccessToken('usuario-prueba');
  assert.throws(() => verifyAccessToken(`${token}x`), /Token inválido/);
});

test('genera códigos de seis dígitos', () => {
  assert.match(generateOneTimeCode(), /^\d{6}$/);
});
