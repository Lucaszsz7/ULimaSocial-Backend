import 'dotenv/config';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = await readFile(join(__dirname, '../data/schema.sql'), 'utf8');

try {
  await pool.query(schema);
  console.log('Esquema PostgreSQL creado o actualizado correctamente.');
} finally {
  await pool.end();
}
