# MedTrack Backend — Core Infrastructure API

The **MedTrack Backend** is the production-grade API powering the MedTrack application. It provides secure authentication, medicine and inventory management, automated clinical verification workflows, email notification services, and reliable serverless database connectivity for cloud deployments.

---

## Features

- Secure JWT-based authentication
- OTP email verification and password reset
- Medicine and inventory management APIs
- Inventory logging and tracking
- MongoDB Atlas integration using Mongoose
- Production-ready Express.js REST API
- Gmail SMTP email notifications
- Serverless deployment support for Vercel
- Dynamic CORS support for local and production environments
- Automatic MongoDB reconnection for serverless functions

---

# Repository Structure

```text
backend/
├── config/              # Application configuration
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Medicine.js
│   └── InventoryLog.js
├── routes/              # API route modules
│   ├── auth.js
│   ├── medicine.js
│   └── logs.js
├── utils/               # Helper utilities
│   ├── mail.js
│   ├── otp.js
│   └── ...
├── db.js                # MongoDB connection helper
├── server.js            # Express application entry point
├── package.json
└── vercel.json          # Vercel deployment configuration
```

---

# Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Nodemailer
- bcrypt
- dotenv
- CORS

---

# Core Infrastructure

## Automatic Database Reconnection

The backend is designed specifically for serverless environments.

Before processing any incoming request, the application checks the MongoDB connection state.

```javascript
if (mongoose.connection.readyState !== 1) {
    await connectDB();
}
```

If the connection has been closed due to serverless execution lifecycle, a new connection pool is created automatically.

This prevents:

- MongoDB timeout errors
- Lambda cold start connection failures
- Dropped database sessions
- Random production disconnects

---

## Dynamic CORS Configuration

Instead of using a fixed origin list, the API dynamically validates incoming requests.

Allowed origins include:

- localhost
- Local development ports
- Vercel preview deployments
- Production Vercel deployments

Any unknown origin is rejected automatically.

Example:

```javascript
https://medtrack.vercel.app
https://medtrack-git-feature.vercel.app
http://localhost:3000
http://localhost:5173
```

---

## Email Infrastructure

Email notifications are powered by **Nodemailer** using Gmail SMTP.

Supported email workflows include:

- OTP verification
- Password reset
- Expiry alerts
- Notification emails

Instead of Flexbox layouts, all templates use inline CSS table structures to ensure compatibility with:

- Gmail
- Outlook
- Apple Mail
- Yahoo Mail
- Mobile email clients

---

# API Modules

## Authentication

- Register
- Login
- Email verification
- OTP generation
- OTP verification
- Password reset
- JWT authentication

---

## Medicine

- Add medicine
- Update medicine
- Delete medicine
- Search medicine
- Inventory updates
- Batch tracking

---

## Inventory Logs

- Stock history
- Quantity updates
- Inventory movement tracking
- Audit records

---

# Local Development

## 1. Clone Repository

```bash
git clone <repository-url>
cd backend
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file inside the project root.

```env
PORT=5000

MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/medtrack?retryWrites=true&w=majority

JWT_SECRET=your_ultra_secure_jwt_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_verified_gmail@gmail.com
EMAIL_PASS=your_google_app_password
EMAIL_FROM=your_verified_gmail@gmail.com
```

---

## 4. Start Development Server

```bash
npm start
```

If everything is configured correctly, the server will display:

```text
Server running on port 5000
MongoDB Connected
```

---

# Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Express server port |
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | JWT signing secret |
| EMAIL_HOST | SMTP host |
| EMAIL_PORT | SMTP port |
| EMAIL_USER | Gmail account |
| EMAIL_PASS | Google App Password |
| EMAIL_FROM | Sender email |

---

# Vercel Deployment

## 1. MongoDB Network Access

Since Vercel uses serverless functions, outbound IP addresses are dynamic.

Inside MongoDB Atlas:

```
Security
    ↓
Network Access
    ↓
Add IP Address
```

Whitelist:

```text
0.0.0.0/0
```

This allows Atlas to accept connections from Vercel's serverless infrastructure.

---

## 2. Configure Environment Variables

In the Vercel Dashboard:

```
Project
    ↓
Settings
    ↓
Environment Variables
```

Add:

```
MONGO_URI
JWT_SECRET
EMAIL_HOST
EMAIL_PORT
EMAIL_USER
EMAIL_PASS
EMAIL_FROM
```

---

## 3. Updating Environment Variables

If your MongoDB password or connection string changes:

1. Open **Settings → Environment Variables**
2. Delete the old `MONGO_URI`
3. Add the updated value
4. Save the changes
5. Redeploy the project

Vercel injects environment variables only during deployment, so a redeploy is required after any change.

---

# Project Architecture

```
Client
    │
    ▼
Express Server
    │
    ▼
Authentication Middleware
    │
    ▼
MongoDB Connection Check
    │
    ▼
Database Reconnection (if needed)
    │
    ▼
Route Handler
    │
    ▼
MongoDB Atlas
```

---

# Security

- JWT authentication
- Password hashing using bcrypt
- Secure OTP generation
- Protected API routes
- Environment variable isolation
- Dynamic CORS validation
- Automatic database reconnection
- Gmail App Password authentication
- Production-ready MongoDB Atlas integration

---

# Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created
- [ ] Network Access allows `0.0.0.0/0`
- [ ] Environment variables configured
- [ ] Gmail App Password generated
- [ ] Vercel deployment completed
- [ ] API endpoints tested
- [ ] Email verification working
- [ ] Database connectivity verified

---

# License

This project is intended for educational and production deployment purposes. Customize and extend it according to your application's requirements.

---

## Author

**MedTrack Backend API**

Production-ready Express.js backend built for secure medicine inventory management, authentication, serverless deployment, and automated notification workflows.
