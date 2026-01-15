# EcoBuy Backend API

Backend API server for EcoBuy ecommerce platform built with Node.js, Express, and MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following content:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ecobuy

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Backend URL (for network access - Android app development)
# Replace with your local network IP address
BACKEND_URL=http://192.168.1.43:5000

# Email Configuration (for vendor approval, order confirmations, etc.)
# SMTP settings - required for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
# Alternative: Use ADMIN_EMAIL and ADMIN_EMAIL_PASSWORD
ADMIN_EMAIL=your-email@gmail.com
ADMIN_EMAIL_PASSWORD=your-app-password
```

**Note:** 
- Make sure MongoDB is running on your system. If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.
- For Android app development, the server binds to `0.0.0.0` to allow network access. Update `BACKEND_URL` with your machine's local network IP address.

4. Seed the admin user:
```bash
npm run seed
```

This will create an admin user with:
- Email: `admin@login.com`
- Password: `admin123`

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://192.168.1.43:5000` by default.

## API Endpoints

### Authentication

- `POST /api/auth/admin/login` - Admin login
  - Body: `{ "email": "admin@login.com", "password": "admin123" }`
  - Returns: JWT token and admin info

- `GET /api/auth/admin/verify` - Verify JWT token
  - Headers: `Authorization: Bearer <token>`
  - Returns: Admin info if token is valid

### Vendor Authentication

- `POST /api/vendor-auth/send-otp` - Send OTP to vendor mobile
  - Body: `{ "mobile": "9876543210", "countryCode": "91" }`
  - Returns: verificationId and mobile

- `POST /api/vendor-auth/verify-otp` - Verify OTP and login
  - Body: `{ "mobile": "9876543210", "countryCode": "91", "otp": "1234", "verificationId": "..." }`
  - Returns: JWT token and vendor user info

### Health Check

- `GET /api/health` - Server health check

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration time (default: 7d)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `BACKEND_URL` - Backend URL for network access (default: http://192.168.1.43:5000)
- `MESSAGE_CENTRAL_AUTH_TOKEN` - MessageCentral API auth token
- `MESSAGE_CENTRAL_CUSTOMER_ID` - MessageCentral customer ID
- `OTP_DEVELOPMENT` - Set to "true" to bypass MessageCentral (use OTP: 0000)

### Email Configuration (SMTP)

For sending emails (vendor approval, order confirmations, contact form, etc.):

- `SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_SECURE` - Use secure connection (default: false, set to "true" for port 465)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password
- `ADMIN_EMAIL` - Admin email address (alternative to SMTP_USER)
- `ADMIN_EMAIL_PASSWORD` - Admin email password (alternative to SMTP_PASS)

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password. Enable 2-factor authentication first, then generate an app password.

**Email Features:**
- ✅ Vendor approval confirmation emails
- ✅ Order confirmation emails
- ✅ Contact form notifications
- ✅ Product enquiry notifications

