// Utility script to generate bcrypt password hash
// Usage: node scripts/generate-password-hash.js <password>

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

const hash = bcrypt.hashSync(password, 10);

console.log('\nPassword:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in database schema or when creating users.\n');

