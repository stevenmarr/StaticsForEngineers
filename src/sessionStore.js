'use strict';
// Minimal persistent express-session store backed by the app's SQLite database.
const session = require('express-session');

class SqliteStore extends session.Store {
  constructor(db, opts = {}) {
    super();
    this.db = db;
    this.ttl = opts.ttl || 30 * 24 * 3600 * 1000;
    this.qGet = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > ?');
    this.qSet = db.prepare('INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires');
    this.qDel = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.qTouch = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.qPrune = db.prepare('DELETE FROM sessions WHERE expires <= ?');
    this.timer = setInterval(() => { try { this.qPrune.run(Date.now()); } catch (e) { /* ignore */ } }, 3600 * 1000);
    this.timer.unref();
  }
  expiry(sess) {
    if (sess && sess.cookie && sess.cookie.expires) return new Date(sess.cookie.expires).getTime();
    return Date.now() + this.ttl;
  }
  get(sid, cb) {
    try {
      const row = this.qGet.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (e) { cb(e); }
  }
  set(sid, sess, cb) {
    try { this.qSet.run(sid, JSON.stringify(sess), this.expiry(sess)); cb && cb(null); } catch (e) { cb && cb(e); }
  }
  destroy(sid, cb) {
    try { this.qDel.run(sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }
  touch(sid, sess, cb) {
    try { this.qTouch.run(this.expiry(sess), sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }
}

module.exports = SqliteStore;
