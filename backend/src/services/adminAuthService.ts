import bcrypt from 'bcryptjs';
import { AdminUser } from '../models/AdminUser';
import { generateToken } from '../utils/jwt';

export const adminAuthService = {
  async login(email: string, password: string) {
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({
      adminId: admin._id.toString(),
      role: 'ADMIN',
    });

    return {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  },
};

