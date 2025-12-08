import { User } from '../models/User';
import { OTPRequest } from '../models/OTPRequest';
import { generateOTP, hashOTP, compareOTP } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';
import { generateToken } from '../utils/jwt';
import { partnerService } from './partnerService';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);

export const authService = {
  async signup(data: {
    name: string;
    email: string;
    mobile: string;
    preparingForExam?: string;
    deviceId?: string;
    invitationCode?: string;
  }) {
    let partnerId = undefined;
    
    // Validate invitation code if provided
    if (data.invitationCode) {
      const partner = await partnerService.validateCode(data.invitationCode);
      if (!partner) {
        throw new Error('Invalid or inactive invitation code');
      }
      partnerId = partner._id;
    }

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isBlocked) {
        throw new Error('Account is blocked');
      }
      // User exists, proceed to send OTP
    } else {
      // Create new user
      await User.create({
        name: data.name,
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        preparingForExam: data.preparingForExam,
        deviceId: data.deviceId,
        partnerId: partnerId,
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OTPRequest.create({
      email: data.email.toLowerCase(),
      otp: hashedOTP,
      expiresAt,
    });

    await sendOTPEmail(data.email, otp);

    return { message: 'OTP sent to email' };
  },

  async sendOTP(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.isBlocked) {
      throw new Error('Account is blocked');
    }

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OTPRequest.create({
      email: email.toLowerCase(),
      otp: hashedOTP,
      expiresAt,
    });

    await sendOTPEmail(email, otp);

    return { message: 'OTP sent to email' };
  },

  async verifyOTP(data: {
    email: string;
    otp: string;
    deviceId: string;
    fcmToken?: string;
  }) {
    const otpRequest = await OTPRequest.findOne({
      email: data.email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRequest) {
      throw new Error('Invalid or expired OTP');
    }

    const isValid = await compareOTP(data.otp, otpRequest.otp);
    if (!isValid) {
      throw new Error('Invalid OTP');
    }

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBlocked) {
      throw new Error('Account is blocked');
    }

    // Device lock check
    if (user.deviceId && user.deviceId !== data.deviceId) {
      throw new Error('This device is not authorized');
    }

    // Set device ID if not set
    if (!user.deviceId) {
      user.deviceId = data.deviceId;
    }

    // Update FCM token if provided
    if (data.fcmToken) {
      user.fcmToken = data.fcmToken;
    }

    await user.save();

    // Mark OTP as used
    otpRequest.isUsed = true;
    await otpRequest.save();

    // Generate token
    const token = generateToken({ userId: user._id.toString(), role: 'STUDENT' });

    // Populate partner info if exists
    await user.populate('partnerId', 'name discountPercentage');
    
    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        preparingForExam: user.preparingForExam,
        partnerId: user.partnerId?._id,
        partnerDiscountPercentage: (user.partnerId as any)?.discountPercentage,
      },
    };
  },

  // Web-specific auth methods (no deviceId/FCM)
  async signupWeb(data: {
    name: string;
    email: string;
    mobile: string;
    preparingForExam?: string;
    invitationCode?: string;
  }) {
    let partnerId = undefined;
    
    // Validate invitation code if provided
    if (data.invitationCode) {
      const partner = await partnerService.validateCode(data.invitationCode);
      if (!partner) {
        throw new Error('Invalid or inactive invitation code');
      }
      partnerId = partner._id;
    }

    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      if (existingUser.isBlocked) {
        throw new Error('Account is blocked');
      }
      // User exists, proceed to send OTP
    } else {
      // Create new user
      await User.create({
        name: data.name,
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        preparingForExam: data.preparingForExam,
        partnerId: partnerId,
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OTPRequest.create({
      email: data.email.toLowerCase(),
      otp: hashedOTP,
      expiresAt,
    });

    await sendOTPEmail(data.email, otp);

    return { message: 'OTP sent to email' };
  },

  async verifyOTPWeb(data: {
    email: string;
    otp: string;
  }) {
    const otpRequest = await OTPRequest.findOne({
      email: data.email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRequest) {
      throw new Error('Invalid or expired OTP');
    }

    const isValid = await compareOTP(data.otp, otpRequest.otp);
    if (!isValid) {
      throw new Error('Invalid OTP');
    }

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBlocked) {
      throw new Error('Account is blocked');
    }

    // Mark OTP as used
    otpRequest.isUsed = true;
    await otpRequest.save();

    // Generate token
    const token = generateToken({ userId: user._id.toString(), role: 'STUDENT' });

    // Populate partner info if exists
    await user.populate('partnerId', 'name discountPercentage');

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        preparingForExam: user.preparingForExam,
        partnerId: user.partnerId?._id,
        partnerDiscountPercentage: (user.partnerId as any)?.discountPercentage,
      },
    };
  },
};

