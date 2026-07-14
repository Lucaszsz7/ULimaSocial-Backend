import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const sourceFiles = async (directory) => (
  (await readdir(new URL(`../${directory}/`, import.meta.url)))
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({ directory, file }))
);

test('los modelos requeridos existen y acceden a la capa de datos', async () => {
  const requiredModels = [
    'friendshipModel.js',
    'groupModel.js',
    'healthModel.js',
    'messageModel.js',
    'postModel.js',
    'userModel.js',
  ];
  const availableModels = await readdir(new URL('../models/', import.meta.url));

  for (const model of requiredModels) {
    assert.ok(availableModels.includes(model), `Falta el modelo ${model}`);
    const source = await readFile(new URL(`../models/${model}`, import.meta.url), 'utf8');
    assert.match(source, /from ['"]\.\.\/db\.js['"]/, `${model} debe usar la capa PostgreSQL`);
  }
});

test('controladores y servicios no acceden directamente a PostgreSQL', async () => {
  const files = [
    ...(await sourceFiles('controllers')),
    ...(await sourceFiles('services')),
    { directory: '', file: 'server.js' },
  ];

  for (const { directory, file } of files) {
    const path = directory ? `../${directory}/${file}` : `../${file}`;
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from ['"][^'"]*db\.js['"]/, `${path} no debe importar db.js`);
  }
});
