'use strict';
const bcrypt = require('bcryptjs');
const db = require('./db');

const ROUNDS = 12;

function findByName(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
}
function findById(id) {
  return db.prepare('SELECT id, username, unlock_all, created_at FROM users WHERE id = ?').get(id);
}
function validUsername(u) {
  return /^[A-Za-z0-9_.-]{2,40}$/.test(u);
}
function setPassword(userId, password) {
  const hash = bcrypt.hashSync(password, ROUNDS);
  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(hash, userId);
}
function createUser(username, password) {
  if (!validUsername(username)) throw new Error('Username must be 2-40 letters, numbers, dot, dash or underscore.');
  const hash = bcrypt.hashSync(password, ROUNDS);
  const info = db.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)').run(username, hash, Date.now());
  return info.lastInsertRowid;
}
// Constant-ish time: always run a bcrypt compare even for unknown users.
const DUMMY = bcrypt.hashSync('not-a-real-password', 10);
function verify(username, password) {
  const u = findByName(username);
  const ok = bcrypt.compareSync(String(password || ''), u ? u.pass_hash : DUMMY);
  return ok && u ? u : null;
}
function seedDefaultUser(name, pass) {
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (count > 0 || !name || !pass) return false;
  createUser(name, pass);
  console.log(`Seeded default user "${name}".`);
  return true;
}

module.exports = { findByName, findById, setPassword, createUser, verify, seedDefaultUser, validUsername };
