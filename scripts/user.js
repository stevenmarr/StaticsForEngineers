#!/usr/bin/env node
'use strict';
// Manage StaticsForEngineers logins.
//   node scripts/user.js list
//   node scripts/user.js add <username>      (prompts for a password)
//   node scripts/user.js reset <username>    (prompts for a new password)
//   node scripts/user.js delete <username>
// Non-interactive: set NEW_PASSWORD=... in the environment.
const readline = require('readline');
const users = require('../src/users');
const db = require('../src/db');

function askHidden(question) {
  if (process.env.NEW_PASSWORD) return Promise.resolve(process.env.NEW_PASSWORD);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = true;
    rl._writeToOutput = function (s) { if (!rl.stdoutMuted || s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
    rl.question(question, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
async function getPassword() {
  const p1 = await askHidden('New password: ');
  if (!process.env.NEW_PASSWORD) {
    const p2 = await askHidden('Repeat password: ');
    if (p1 !== p2) throw new Error('Passwords do not match.');
  }
  if (!p1 || p1.length < 8) throw new Error('Password must be at least 8 characters.');
  return p1;
}

(async () => {
  const [cmd, name] = process.argv.slice(2);
  try {
    if (cmd === 'list') {
      const rows = db.prepare('SELECT id, username, created_at FROM users ORDER BY id').all();
      if (!rows.length) console.log('(no users)');
      rows.forEach((r) => console.log(`${r.id}\t${r.username}\tcreated ${new Date(r.created_at).toISOString()}`));
    } else if (cmd === 'add' && name) {
      if (users.findByName(name)) throw new Error(`User "${name}" already exists. Use "reset" to change the password.`);
      users.createUser(name, await getPassword());
      console.log(`Created user "${name}".`);
    } else if (cmd === 'reset' && name) {
      const u = users.findByName(name);
      if (!u) throw new Error(`No user named "${name}".`);
      users.setPassword(u.id, await getPassword());
      db.prepare("DELETE FROM sessions WHERE sess LIKE ?").run(`%"userId":${u.id}%`);
      console.log(`Password reset for "${u.username}". Existing sessions were signed out.`);
    } else if (cmd === 'delete' && name) {
      const u = users.findByName(name);
      if (!u) throw new Error(`No user named "${name}".`);
      db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
      console.log(`Deleted user "${u.username}" and their progress.`);
    } else {
      console.log('Usage: node scripts/user.js list | add <username> | reset <username> | delete <username>');
      process.exitCode = cmd ? 1 : 0;
    }
  } catch (e) {
    console.error('Error: ' + e.message);
    process.exitCode = 1;
  }
})();
