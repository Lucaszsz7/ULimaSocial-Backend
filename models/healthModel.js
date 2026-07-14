import { query } from '../db.js';

export const checkDatabase = () => query('SELECT 1');
