const bcrypt = require('bcryptjs');

// Simple script to hash a password
const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('\nPassword:', password);
  console.log('Hashed Password:', hash);
  console.log('\nUse this hash in your MongoDB document.');
});

