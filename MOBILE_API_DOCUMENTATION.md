# Mobile Application API Documentation

## Table of Contents
1. [Base URL & Authentication](#base-url--authentication)
2. [Authentication Flow](#authentication-flow)
3. [Home/Dashboard Flow](#homedashboard-flow)
4. [Category & Test Sets Flow](#category--test-sets-flow)
5. [Test Attempt Flow](#test-attempt-flow)
6. [Payment & Subscription Flow](#payment--subscription-flow)
7. [Leaderboard Flow](#leaderboard-flow)
8. [Notifications Flow](#notifications-flow)
9. [Response Format](#response-format)
10. [Error Handling](#error-handling)

---

## Base URL & Authentication

### Base URL
```
http://your-server-url:5000
```

### Authentication
Most endpoints require authentication using Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Flow

### Flow Overview
1. User signs up with email and personal details
2. OTP is sent to email
3. User verifies OTP to get access token
4. Token is used for subsequent API calls

---

### 1. User Signup

**Endpoint:** `POST /auth/signup`

**Description:** Register a new user. OTP will be sent to the provided email.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "mobile": "9876543210",
  "preparingForExam": "UPSC",  // Optional
  "deviceId": "unique-device-id"  // Optional
}
```

**Request Payload Details:**
- `name` (string, required): User's full name
- `email` (string, required): Valid email address
- `mobile` (string, required): Mobile number (minimum 10 digits)
- `preparingForExam` (string, optional): Exam name user is preparing for
- `deviceId` (string, optional): Unique device identifier

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "email": "john.doe@example.com"
  },
  "message": "Signup successful. OTP sent to email."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 2. Send OTP

**Endpoint:** `POST /auth/send-otp`

**Description:** Request OTP to be sent to email (for login or resend).

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Request Payload Details:**
- `email` (string, required): Registered email address

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "email": "john.doe@example.com"
  },
  "message": "OTP sent to email."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 3. Verify OTP

**Endpoint:** `POST /auth/verify-otp`

**Description:** Verify OTP and get JWT access token for authentication.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "deviceId": "unique-device-id",
  "fcmToken": "firebase-cloud-messaging-token"  // Optional
}
```

**Request Payload Details:**
- `email` (string, required): Registered email address
- `otp` (string, required): 6-digit OTP received via email
- `deviceId` (string, required): Unique device identifier
- `fcmToken` (string, optional): Firebase Cloud Messaging token for push notifications

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "mobile": "9876543210",
      "preparingForExam": "UPSC",
      "deviceId": "unique-device-id"
    }
  },
  "message": "Login successful."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**What to do:**
- Store the `token` securely (e.g., in secure storage)
- Use this token in Authorization header for all subsequent API calls
- Store user information locally for display

---

### 4. Get Current User Profile

**Endpoint:** `GET /auth/me`

**Description:** Get current authenticated user's profile information.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "mobile": "9876543210",
    "preparingForExam": "UPSC",
    "deviceId": "unique-device-id"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Home/Dashboard Flow

### Flow Overview
1. Fetch banners for home screen
2. Fetch active notices
3. Fetch categories list
4. Display home screen with all information

---

### 1. Get Banners

**Endpoint:** `GET /banners`

**Description:** Get all active banners to display on home screen.

**Request Headers:**
```
Content-Type: application/json
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Welcome Banner",
      "imageUrl": "https://example.com/banner1.jpg",
      "linkUrl": "https://example.com/link",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**What to do:**
- Display banners in a carousel/slider on home screen
- Handle click events to open `linkUrl` if provided

---

### 2. Get Notices

**Endpoint:** `GET /notices`

**Description:** Get all active notices/announcements.

**Query Parameters:**
- `active` (string, optional): Set to "true" to get only currently active notices

**Request Headers:**
```
Content-Type: application/json
```

**Example Request:**
```
GET /notices?active=true
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Important Notice",
      "content": "New test series available",
      "imageUrl": "https://example.com/notice.jpg",
      "sortOrder": 1,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validTo": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**What to do:**
- Display notices in a list or card format
- Show notices based on validity dates if provided

---

### 3. Get All Categories

**Endpoint:** `GET /categories`

**Description:** Get list of all available test categories.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `search` (string, optional): Search term to filter categories

**Request Headers:**
```
Content-Type: application/json
```

**Example Request:**
```
GET /categories?page=1&limit=10&search=UPSC
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "UPSC Prelims",
        "description": "UPSC Preliminary Examination",
        "imageUrl": "https://example.com/category.jpg",
        "price": 999,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

**What to do:**
- Display categories in a grid or list
- Show category name, description, image, and price
- Navigate to category details on click

---

## Category & Test Sets Flow

### Flow Overview
1. View category details
2. Check subscription status
3. View available test sets in category
4. View test set details
5. View previous attempts

---

### 1. Get Category Details

**Endpoint:** `GET /categories/:id/details`

**Description:** Get detailed information about a specific category including subscription status and test sets (if subscribed).

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>  // Optional but recommended
Content-Type: application/json
```

**Path Parameters:**
- `id` (string, required): Category ID

**Example Request:**
```
GET /categories/507f1f77bcf86cd799439011/details
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "UPSC Prelims",
      "description": "UPSC Preliminary Examination",
      "imageUrl": "https://example.com/category.jpg",
      "price": 999,
      "isActive": true
    },
    "subscriptionStatus": "APPROVED",  // PENDING, APPROVED, REJECTED, or null
    "subscription": {
      "id": "507f1f77bcf86cd799439012",
      "status": "APPROVED",
      "startsAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    },
    "sets": [  // Only if subscription is APPROVED
      {
        "id": "507f1f77bcf86cd799439013",
        "name": "UPSC Prelims Test 1",
        "durationMinutes": 120,
        "totalMarks": 200,
        "lastAttempt": {
          "totalScore": 150,
          "totalCorrect": 75,
          "totalWrong": 25
        }
      }
    ]
  }
}
```

**What to do:**
- If `subscriptionStatus` is null or "PENDING" → Show payment option
- If `subscriptionStatus` is "APPROVED" → Show test sets list
- Display subscription expiry date if available
- Show last attempt scores for each test set

---

### 2. Get Test Sets by Category

**Endpoint:** `GET /sets/categories/:categoryId/sets`

**Description:** Get all test sets available in a specific category.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `categoryId` (string, required): Category ID

**Example Request:**
```
GET /sets/categories/507f1f77bcf86cd799439011/sets
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "UPSC Prelims Test 1",
      "durationMinutes": 120,
      "totalMarks": 200,
      "hasAttempts": true,
      "lastAttempt": {
        "totalScore": 150,
        "totalCorrect": 75,
        "totalWrong": 25,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    }
  ]
}
```

**Response (Error - 403):**
```json
{
  "success": false,
  "message": "Subscription not approved for this category"
}
```

**What to do:**
- Display test sets in a list
- Show test name, duration, and total marks
- Show last attempt score if available
- Enable "Start Test" button for each set

---

### 3. Get Test Set Details

**Endpoint:** `GET /sets/:setId/details`

**Description:** Get detailed information about a specific test set including statistics.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `setId` (string, required): Test Set ID

**Example Request:**
```
GET /sets/507f1f77bcf86cd799439013/details
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "set": {
      "id": "507f1f77bcf86cd799439013",
      "name": "UPSC Prelims Test 1",
      "description": "Complete test for UPSC Prelims",
      "durationMinutes": 120,
      "totalMarks": 200,
      "negativeMarking": 0.33,
      "sections": [
        {
          "sectionId": "section1",
          "name": "General Studies",
          "order": 1,
          "durationMinutes": 60
        },
        {
          "sectionId": "section2",
          "name": "CSAT",
          "order": 2,
          "durationMinutes": 60
        }
      ],
      "hasSectionWiseTiming": true,
      "categoryId": "507f1f77bcf86cd799439011"
    },
    "stats": {
      "totalAttempts": 3,
      "lastScore": 150,
      "bestScore": 175
    }
  }
}
```

**What to do:**
- Display test details before starting
- Show sections if available
- Display user statistics (attempts, scores)
- Show "Start Test" or "Resume Test" button

---

### 4. Get User Attempts for Test Set

**Endpoint:** `GET /sets/:setId/attempts`

**Description:** Get all previous attempts for a specific test set.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `setId` (string, required): Test Set ID

**Example Request:**
```
GET /sets/507f1f77bcf86cd799439013/attempts
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "totalScore": 175,
      "totalCorrect": 88,
      "totalWrong": 12,
      "totalUnanswered": 0,
      "status": "SUBMITTED",
      "createdAt": "2024-01-20T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "totalScore": 150,
      "totalCorrect": 75,
      "totalWrong": 25,
      "totalUnanswered": 0,
      "status": "SUBMITTED",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**What to do:**
- Display attempt history in a list
- Show score, correct/wrong answers, and date
- Allow viewing detailed results (deep dive)

---

## Test Attempt Flow

### Flow Overview
1. Start a test attempt
2. Update answers as user progresses
3. Submit section (if section-wise timing)
4. Submit complete test
5. View results and deep dive analysis

---

### 1. Start Test Attempt

**Endpoint:** `POST /attempts/start`

**Description:** Start a new test attempt or resume an existing in-progress attempt.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "testSetId": "507f1f77bcf86cd799439013"
}
```

**Request Payload Details:**
- `testSetId` (string, required): Test Set ID to start

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "attemptId": "507f1f77bcf86cd799439016",
    "testSet": {
      "id": "507f1f77bcf86cd799439013",
      "name": "UPSC Prelims Test 1",
      "durationMinutes": 120,
      "totalMarks": 200,
      "negativeMarking": 0.33,
      "sections": [
        {
          "sectionId": "section1",
          "name": "General Studies",
          "order": 1,
          "durationMinutes": 60
        }
      ],
      "hasSectionWiseTiming": true
    },
    "questions": [
      {
        "id": "507f1f77bcf86cd799439017",
        "sectionId": "section1",
        "questionText": "What is the capital of India?",
        "questionImageUrl": "https://example.com/question.jpg",
        "options": [
          {
            "optionId": "opt1",
            "text": "Mumbai",
            "imageUrl": null
          },
          {
            "optionId": "opt2",
            "text": "Delhi",
            "imageUrl": null
          },
          {
            "optionId": "opt3",
            "text": "Kolkata",
            "imageUrl": null
          },
          {
            "optionId": "opt4",
            "text": "Chennai",
            "imageUrl": null
          }
        ],
        "marks": 2,
        "questionOrder": 1
      }
    ],
    "startedAt": "2024-01-20T10:00:00.000Z",
    "currentSectionId": "section1",
    "sectionTimings": {
      "section1": {
        "startedAt": "2024-01-20T10:00:00.000Z",
        "durationMinutes": 60
      }
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Subscription not approved for this category"
}
```

**What to do:**
- Store `attemptId` for subsequent API calls
- Display questions one by one or in a list
- Start timer based on `durationMinutes` or section-wise timing
- Track `startedAt` time for timer calculation
- If `hasSectionWiseTiming` is true, manage section timers separately

---

### 2. Update Answer

**Endpoint:** `PATCH /attempts/:attemptId/answer`

**Description:** Update answer for a question during the test.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Request Body:**
```json
{
  "questionId": "507f1f77bcf86cd799439017",
  "selectedOptionId": "opt2",
  "markedForReview": false,
  "timeSpentIncrementSeconds": 30
}
```

**Request Payload Details:**
- `questionId` (string, required): Question ID
- `selectedOptionId` (string | null, required): Selected option ID or null to clear selection
- `markedForReview` (boolean, required): Whether question is marked for review
- `timeSpentIncrementSeconds` (number, required): Additional time spent on this question (minimum 0)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "questionId": "507f1f77bcf86cd799439017",
    "selectedOptionId": "opt2",
    "markedForReview": false,
    "timeSpent": 30
  }
}
```

**What to do:**
- Call this API whenever user:
  - Selects an option
  - Clears selection
  - Marks/unmarks for review
  - Moves to next question (send time spent)
- Track time spent on each question locally and send increment

---

### 3. Check Section Timer

**Endpoint:** `GET /attempts/:attemptId/section-timer`

**Description:** Check remaining time for current section (for section-wise timing).

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "currentSectionId": "section1",
    "sectionTimings": {
      "section1": {
        "startedAt": "2024-01-20T10:00:00.000Z",
        "durationMinutes": 60,
        "remainingSeconds": 3000
      }
    }
  }
}
```

**What to do:**
- Use this to sync section timer if app was closed
- Calculate remaining time from `startedAt` and `durationMinutes`
- Auto-submit section when time expires

---

### 4. Submit Section

**Endpoint:** `POST /attempts/:attemptId/submit-section`

**Description:** Submit a section (for section-wise timing tests).

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Request Body:**
```json
{
  "sectionId": "section1"
}
```

**Request Payload Details:**
- `sectionId` (string, required): Section ID to submit

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "sectionId": "section1",
    "message": "Section submitted successfully",
    "nextSectionId": "section2",
    "canContinue": true
  },
  "message": "Section submitted successfully"
}
```

**What to do:**
- After submitting a section, move to next section if available
- If `canContinue` is false, test is complete
- Show confirmation before submitting section

---

### 5. Submit Test

**Endpoint:** `POST /attempts/:attemptId/submit`

**Description:** Submit the complete test attempt.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Request Body:**
```json
{
  "reason": "User submitted"  // Optional
}
```

**Request Payload Details:**
- `reason` (string, optional): Reason for submission (e.g., "User submitted", "Time expired")

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "attemptId": "507f1f77bcf86cd799439016",
    "status": "SUBMITTED",
    "totalScore": 175,
    "totalCorrect": 88,
    "totalWrong": 12,
    "totalUnanswered": 0,
    "totalTimeSeconds": 7200,
    "endedAt": "2024-01-20T12:00:00.000Z"
  },
  "message": "Test submitted successfully."
}
```

**What to do:**
- Show results screen with score
- Navigate to deep dive analysis
- Show confirmation dialog before submitting

---

### 6. Get Attempt Details

**Endpoint:** `GET /attempts/:attemptId`

**Description:** Get details of a specific attempt (for resuming or viewing).

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "userId": "507f1f77bcf86cd799439011",
    "testSetId": "507f1f77bcf86cd799439013",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-20T10:00:00.000Z",
    "answers": [
      {
        "questionId": "507f1f77bcf86cd799439017",
        "selectedOptionId": "opt2",
        "markedForReview": false,
        "timeSpent": 30
      }
    ],
    "currentSectionId": "section1"
  }
}
```

**What to do:**
- Use this to resume an in-progress test
- Restore answers and timer state
- Continue from where user left off

---

### 7. Get Deep Dive Analysis

**Endpoint:** `GET /attempts/:attemptId/deep-dive`

**Description:** Get detailed analysis of submitted test attempt with correct answers and explanations.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `attemptId` (string, required): Attempt ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "_id": "507f1f77bcf86cd799439016",
      "totalScore": 175,
      "totalCorrect": 88,
      "totalWrong": 12,
      "totalUnanswered": 0,
      "status": "SUBMITTED"
    },
    "questions": [
      {
        "id": "507f1f77bcf86cd799439017",
        "sectionId": "section1",
        "questionText": "What is the capital of India?",
        "questionImageUrl": "https://example.com/question.jpg",
        "options": [
          {
            "optionId": "opt1",
            "text": "Mumbai",
            "imageUrl": null
          },
          {
            "optionId": "opt2",
            "text": "Delhi",
            "imageUrl": null
          }
        ],
        "marks": 2,
        "correctOptionId": "opt2",
        "selectedOptionId": "opt2",
        "isCorrect": true,
        "explanationText": "Delhi is the capital of India",
        "explanationImageUrl": "https://example.com/explanation.jpg",
        "timeSpent": 30
      }
    ],
    "sectionWiseStats": {
      "section1": {
        "correct": 45,
        "wrong": 5,
        "unanswered": 0,
        "score": 90
      }
    }
  }
}
```

**What to do:**
- Display detailed results with:
  - Correct/incorrect answers highlighted
  - Correct answer shown
  - Explanation for each question
  - Section-wise statistics
  - Time spent per question
- Allow user to review all questions

---

## Payment & Subscription Flow

### Flow Overview
1. User selects a category to subscribe
2. User makes payment and uploads screenshot
3. Payment is submitted for review
4. Admin approves payment
5. User gets subscription access
6. User can view their subscriptions

---

### 1. Create Payment

**Endpoint:** `POST /payments`

**Description:** Submit payment details with screenshot for subscription.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "categoryId": "507f1f77bcf86cd799439011",
  "amount": 999,
  "payerName": "John Doe",
  "payerUpiId": "john@upi",
  "upiTransactionId": "TXN123456",  // Optional
  "screenshotUrl": "https://example.com/payment-screenshot.jpg"
}
```

**Request Payload Details:**
- `categoryId` (string, required): Category ID to subscribe
- `amount` (number, required): Payment amount (must be positive)
- `payerName` (string, required): Name of payer
- `payerUpiId` (string, required): UPI ID used for payment
- `upiTransactionId` (string, optional): UPI transaction ID
- `screenshotUrl` (string, required): URL of payment screenshot (upload image first and get URL)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "userId": "507f1f77bcf86cd799439011",
    "categoryId": "507f1f77bcf86cd799439011",
    "amount": 999,
    "status": "PENDING",
    "payerName": "John Doe",
    "payerUpiId": "john@upi",
    "createdAt": "2024-01-20T10:00:00.000Z"
  },
  "message": "Payment submitted for review."
}
```

**What to do:**
1. User selects category and sees price
2. User makes payment via UPI/other method
3. User takes screenshot of payment confirmation
4. Upload screenshot to get URL (if upload endpoint available)
5. Submit payment details with screenshot URL
6. Show "Payment Pending" status
7. Wait for admin approval (check subscription status)

---

### 2. Get User Subscriptions

**Endpoint:** `GET /subscriptions/me`

**Description:** Get all subscriptions of the current user.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439019",
      "userId": "507f1f77bcf86cd799439011",
      "categoryId": "507f1f77bcf86cd799439011",
      "status": "APPROVED",
      "startsAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "paymentId": "507f1f77bcf86cd799439018",
      "category": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "UPSC Prelims",
        "imageUrl": "https://example.com/category.jpg"
      }
    }
  ]
}
```

**What to do:**
- Display user's subscriptions in a list
- Show subscription status (PENDING, APPROVED, REJECTED)
- Show expiry date
- Only show test sets for APPROVED subscriptions
- Show "Payment Pending" for PENDING status

---

## Leaderboard Flow

### Flow Overview
1. User views leaderboard for a category or test set
2. See rankings and scores
3. See own position

---

### 1. Get Leaderboard

**Endpoint:** `GET /leaderboard`

**Description:** Get leaderboard rankings for a category or specific test set.

**Query Parameters:**
- `categoryId` (string, required): Category ID
- `testSetId` (string, optional): Test Set ID (if specific test set leaderboard)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Request Headers:**
```
Content-Type: application/json
```

**Example Request:**
```
GET /leaderboard?categoryId=507f1f77bcf86cd799439011&page=1&limit=20
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439020",
        "userName": "Top Student",
        "userEmail": "to***@example.com",
        "score": 195,
        "timeSeconds": 7200
      },
      {
        "rank": 2,
        "userId": "507f1f77bcf86cd799439011",
        "userName": "John Doe",
        "userEmail": "jo***@example.com",
        "score": 175,
        "timeSeconds": 6900
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

**What to do:**
- Display leaderboard in a ranked list
- Highlight current user's entry
- Show rank, name (masked email), score, and time taken
- Implement pagination if needed

---

## Notifications Flow

### Flow Overview
1. Update FCM token for push notifications
2. Get user notifications list
3. Mark notifications as read (if supported)

---

### 1. Update FCM Token

**Endpoint:** `POST /notifications/fcm-token`

**Description:** Update Firebase Cloud Messaging token for push notifications.

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "firebase-cloud-messaging-token-string"
}
```

**Request Payload Details:**
- `fcmToken` (string, required): Firebase Cloud Messaging token

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "fcmToken": "firebase-cloud-messaging-token-string"
  },
  "message": "FCM token updated."
}
```

**What to do:**
- Get FCM token from Firebase SDK
- Call this API after login and whenever token refreshes
- Store token locally for future updates

---

### 2. Get User Notifications

**Endpoint:** `GET /notifications`

**Description:** Get all notifications for the current user.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `unreadOnly` (boolean, optional): Get only unread notifications

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Example Request:**
```
GET /notifications?page=1&limit=20&unreadOnly=false
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "userId": "507f1f77bcf86cd799439011",
        "title": "New Test Available",
        "body": "A new test has been added to UPSC Prelims",
        "type": "TEST_ADDED",
        "data": {
          "categoryId": "507f1f77bcf86cd799439011",
          "testSetId": "507f1f77bcf86cd799439013"
        },
        "isRead": false,
        "createdAt": "2024-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

**What to do:**
- Display notifications in a list
- Show unread indicator for unread notifications
- Handle notification click to navigate to relevant screen
- Use `type` and `data` to determine navigation

---

## Response Format

All API responses follow a standard format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }  // Optional: validation errors
}
```

---

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (subscription not approved)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

### Common Error Messages
- `"No token provided"` - Missing Authorization header
- `"Invalid or expired token"` - Token is invalid or expired
- `"User not found or blocked"` - User account issue
- `"Subscription not approved for this category"` - User needs to subscribe
- `"Test set not found"` - Invalid test set ID
- `"Invalid or expired OTP"` - OTP verification failed

### Error Handling Best Practices
1. Always check `success` field in response
2. Display user-friendly error messages
3. Handle network errors gracefully
4. Retry failed requests where appropriate
5. Show loading states during API calls
6. Validate data before sending requests

---

## Complete User Flow Summary

### First Time User
1. **Signup** → `POST /auth/signup`
2. **Verify OTP** → `POST /auth/verify-otp` (get token)
3. **Get Categories** → `GET /categories`
4. **View Category** → `GET /categories/:id/details`
5. **Make Payment** → `POST /payments`
6. **Wait for Approval** → Check `GET /subscriptions/me`
7. **Start Using App**

### Returning User
1. **Send OTP** → `POST /auth/send-otp`
2. **Verify OTP** → `POST /auth/verify-otp` (get token)
3. **Update FCM Token** → `POST /notifications/fcm-token`
4. **Get Home Data** → `GET /banners`, `GET /notices`, `GET /categories`
5. **View Subscriptions** → `GET /subscriptions/me`
6. **Start Test** → `POST /attempts/start`
7. **Take Test** → `PATCH /attempts/:attemptId/answer` (multiple times)
8. **Submit Test** → `POST /attempts/:attemptId/submit`
9. **View Results** → `GET /attempts/:attemptId/deep-dive`
10. **View Leaderboard** → `GET /leaderboard`

---

## Notes for Mobile App Development

1. **Token Management**
   - Store JWT token securely (use secure storage)
   - Token expires after certain time (check expiry)
   - Refresh token or re-authenticate when expired

2. **Offline Support**
   - Cache categories, banners, notices
   - Queue answer updates if offline
   - Sync when connection restored

3. **Timer Management**
   - Use local timer for test duration
   - Sync with server timer periodically
   - Handle app background/foreground states
   - Auto-submit when time expires

4. **Image Handling**
   - Questions may have images (`questionImageUrl`)
   - Options may have images (`imageUrl` in options)
   - Cache images for offline access
   - Handle image loading errors

5. **Section-wise Timing**
   - If `hasSectionWiseTiming` is true, manage separate timers
   - Auto-submit section when time expires
   - Show section progress indicator

6. **Payment Screenshot**
   - Allow user to select/capture screenshot
   - Upload to server (if upload endpoint available)
   - Get URL and include in payment request

7. **Push Notifications**
   - Integrate Firebase Cloud Messaging
   - Update FCM token after login
   - Handle notification clicks to navigate

8. **Error Recovery**
   - Handle network failures gracefully
   - Retry failed requests
   - Show appropriate error messages
   - Allow user to retry actions

---

## API Endpoint Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|----------------|-------------|
| POST | `/auth/signup` | No | User signup |
| POST | `/auth/send-otp` | No | Send OTP to email |
| POST | `/auth/verify-otp` | No | Verify OTP and get token |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/banners` | No | Get all banners |
| GET | `/notices` | No | Get all notices |
| GET | `/categories` | No | Get all categories |
| GET | `/categories/:id/details` | Optional | Get category details |
| GET | `/sets/categories/:categoryId/sets` | Yes | Get test sets by category |
| GET | `/sets/:setId/details` | Yes | Get test set details |
| GET | `/sets/:setId/attempts` | Yes | Get user attempts for test set |
| POST | `/attempts/start` | Yes | Start test attempt |
| PATCH | `/attempts/:attemptId/answer` | Yes | Update answer |
| GET | `/attempts/:attemptId/section-timer` | Yes | Check section timer |
| POST | `/attempts/:attemptId/submit-section` | Yes | Submit section |
| POST | `/attempts/:attemptId/submit` | Yes | Submit test |
| GET | `/attempts/:attemptId` | Yes | Get attempt details |
| GET | `/attempts/:attemptId/deep-dive` | Yes | Get deep dive analysis |
| POST | `/payments` | Yes | Create payment |
| GET | `/subscriptions/me` | Yes | Get user subscriptions |
| GET | `/leaderboard` | No | Get leaderboard |
| GET | `/notifications` | Yes | Get user notifications |
| POST | `/notifications/fcm-token` | Yes | Update FCM token |

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-20

