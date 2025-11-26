const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// AdminUser Schema (simplified for script)
const adminUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN'], default: 'ADMIN' },
}, { timestamps: true });

const AdminUser = mongoose.model('AdminUser', adminUserSchema, 'adminusers');

async function createAdmin() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/mock-test-app';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Admin credentials
    const email = 'admin@example.com';
    const password = 'admin123';
    const name = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists with email:', email);
      console.log('If you want to reset password, delete the existing user first.');
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await AdminUser.create({
      name,
      email,
      passwordHash,
      role: 'ADMIN',
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

