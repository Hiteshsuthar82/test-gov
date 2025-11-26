# Mock Test Application - Full Stack System

A complete backend (Node.js + Express + MongoDB) and admin panel (React + Tailwind CSS) for a Mock Test Application system.

## Project Structure

```
.
├── backend/          # Node.js + Express + MongoDB backend
└── admin-panel/      # React + Tailwind admin panel
```

## Backend Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or cloud)
- Firebase Admin SDK credentials (for FCM notifications)

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/mock-test-app
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# Firebase Admin SDK (for FCM)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Email (optional, for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

4. Run the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Create First Admin User

You'll need to create an admin user manually in MongoDB or use a script:

```javascript
// scripts/createAdmin.js
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Connect to MongoDB and create admin user
// Email: admin@example.com
// Password: admin123 (hash it with bcrypt)
```

## Admin Panel Setup

### Prerequisites
- Node.js (v18+)

### Installation

1. Navigate to admin-panel directory:
```bash
cd admin-panel
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```env
VITE_API_URL=http://localhost:5000
```

4. Run the development server:
```bash
npm run dev
```

The admin panel will run on `http://localhost:3000`

## Features

### Backend Features
- ✅ Student authentication (OTP-based with device lock)
- ✅ Admin authentication (email/password)
- ✅ Category and test set management
- ✅ Question management with sections
- ✅ Payment processing with manual approval
- ✅ Subscription management
- ✅ Test attempt tracking and scoring
- ✅ Leaderboard system
- ✅ FCM push notifications
- ✅ Banner and notice management
- ✅ File upload support

### Admin Panel Features
- ✅ Dashboard with statistics
- ✅ Banner management
- ✅ Notice management
- ✅ Category and test set management
- ✅ Question management
- ✅ User management
- ✅ Payment approval/rejection
- ✅ Subscription management
- ✅ Notification sending

## API Endpoints

### Student/Public APIs
- `POST /auth/signup` - Student signup
- `POST /auth/send-otp` - Send OTP
- `POST /auth/verify-otp` - Verify OTP and login
- `GET /auth/me` - Get current user
- `GET /banners` - Get active banners
- `GET /notices` - Get active notices
- `GET /categories` - Get categories
- `GET /categories/:id/details` - Get category details
- `POST /payments` - Submit payment
- `GET /users/me/subscriptions` - Get user subscriptions
- `GET /categories/:id/sets` - Get test sets for category
- `GET /sets/:setId/details` - Get test set details
- `POST /attempts/start` - Start test attempt
- `PATCH /attempts/:attemptId/answer` - Update answer
- `POST /attempts/:attemptId/submit` - Submit attempt
- `GET /attempts/:attemptId` - Get attempt summary
- `GET /attempts/:attemptId/deep-dive` - Get detailed attempt
- `GET /leaderboard` - Get leaderboard
- `GET /notifications` - Get user notifications

### Admin APIs
- `POST /admin/auth/login` - Admin login
- `GET /admin/auth/me` - Get admin info
- `GET /admin/dashboard` - Dashboard stats
- `GET /admin/banners` - List banners
- `POST /admin/banners` - Create banner
- `PUT /admin/banners/:id` - Update banner
- `DELETE /admin/banners/:id` - Delete banner
- Similar CRUD for notices, categories, sets, questions, users, payments, subscriptions
- `POST /admin/notifications/send` - Send notification

## Database Models

- **User** - Student users
- **OTPRequest** - OTP verification
- **AdminUser** - Admin users
- **Banner** - Homepage banners
- **Notice** - Notice board items
- **Category** - Exam categories
- **TestSet** - Test sets
- **Question** - Questions
- **Payment** - Payment records
- **Subscription** - User subscriptions
- **TestAttempt** - Test attempts
- **Notification** - Push notifications
- **Leaderboard** - Leaderboard entries

## Development Notes

1. **File Uploads**: Files are stored in `backend/uploads/` directory. In production, consider using cloud storage (S3, Cloudinary).

2. **FCM Notifications**: Configure Firebase Admin SDK credentials in `.env` for push notifications to work.

3. **Email OTP**: Configure SMTP settings in `.env` for email OTP. In development, OTPs are logged to console.

4. **Device Lock**: Each student account can only be used from one device. Device ID is set on first login.

5. **Payment Flow**: Students submit payment with screenshot → Admin reviews → Approve/Reject → Subscription updated automatically.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure production MongoDB URI
4. Set up proper file storage (S3/Cloudinary)
5. Configure Firebase Admin SDK
6. Set up proper email service
7. Build admin panel: `cd admin-panel && npm run build`
8. Serve admin panel build files with a web server or CDN

## License

MIT

