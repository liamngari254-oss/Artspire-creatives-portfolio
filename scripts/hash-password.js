// Run with: npm run hash-password
// Type a password, get back a hash to paste into .env as ADMIN_PASSWORD_HASH.

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Choose your admin password: ', (password) => {
  if (!password || password.length < 8) {
    console.log('\nPlease use a password of at least 8 characters. Run this again.');
    rl.close();
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  console.log('\nAdd this line to your .env file:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  rl.close();
});
