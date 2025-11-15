# 💰 Salary Calculator & Resume ATS Checker

A modern, Gen Z-friendly web application for calculating in-hand salary according to Indian tax laws and checking resume compatibility with Applicant Tracking Systems (ATS). Built with React/Vite frontend and NestJS backend.

## ✨ Features

### 💵 Salary Calculator
- 🧮 Calculate in-hand salary based on CTC and city
- 📍 Support for major Indian cities with accurate tax calculations
- 📊 Detailed salary breakdown (Basic, HRA, EPF, ESI, Professional Tax, Income Tax)
- 📈 Variable pay and insurance support
- 💾 Save calculation history in database
- 📜 User-specific calculation history with easy access

### 📄 Resume ATS Checker
- 🔍 Analyze resume compatibility with ATS systems
- 📝 Support for PDF and DOCX file formats (up to 2MB)
- 🎯 ATS score calculation (0-100)
- ✅ Keyword matching analysis
- 💪 Strengths identification
- ⚠️ Areas for improvement detection
- 💡 Actionable suggestions for optimization
- ⏱️ Rate limiting: 3 checks per user, resets every 12 hours

### 🔐 Authentication & User Management
- 🔑 GitHub OAuth integration
- 📧 Email/Password authentication
- 👤 User profile management
- 🔒 Secure JWT-based authentication
- 💾 User-specific data storage

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Lucide React (Icons)
- Axios

### Backend
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- JWT Authentication
- Passport.js (GitHub OAuth)
- bcryptjs (Password hashing)
- Multer (File uploads)
- pdf-parse (PDF parsing)
- mammoth (DOCX parsing)

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.13.1 or higher)
- PostgreSQL (v12 or higher) or Neon account
- npm or pnpm
- GitHub account (for OAuth, optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/akashkaintura/salary-calculator.git
cd salary-calculator
```

2. **Set up the Backend**

```bash
cd backend
npm install

# Create a .env file
cp .env.example .env

# Edit .env with your configuration
# See Environment Variables section below
```

3. **Set up Database**

**Option A: Using Neon (Recommended)**
- Go to [neon.tech](https://neon.tech) and create a project
- Copy your `DATABASE_URL` connection string
- Add it to `backend/.env`

**Option B: Local PostgreSQL**
```bash
createdb salary_calculator
# Or using psql
psql -U postgres
CREATE DATABASE salary_calculator;
\q
```

4. **Seed the Database (Optional)**
```bash
cd backend
npm run seed
```

5. **Start the Backend**
```bash
cd backend
npm run start:dev
```
The backend will run on `http://localhost:3000`

6. **Set up the Frontend**
```bash
cd frontend
npm install

# Create a .env file
echo "VITE_API_URL=http://localhost:3000" > .env
```

7. **Start the Frontend**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

## 📝 Environment Variables

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require&channel_binding=require

# OR Use individual parameters (for local development)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_NAME=salary_calculator

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# GitHub OAuth (Get from https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

       # JWT Secret (Generate: openssl rand -base64 32)
       JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

       # UPI Payment Configuration
       UPI_ID=your-upi-id@paytm  # Your UPI ID (e.g., yourname@paytm, yourname@ybl, etc.)
       MERCHANT_NAME=SalaryCalc   # Your business/merchant name
       PAYMENT_SECRET=your-payment-secret-key  # Secret key for payment verification (optional, auto-generated if not provided)
       ```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

## 🔐 Authentication Setup

### GitHub OAuth Setup

1. **Create GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: `Salary Calculator`
     - **Homepage URL**: Your frontend URL
     - **Authorization callback URL**: Your backend URL + `/api/auth/github/callback`
   - Click "Register application"

2. **Get Credentials**
   - Copy **Client ID**
   - Generate and copy **Client Secret**
   - Add both to `backend/.env`

### Email/Password Authentication

- Users can register with email and password
- No additional setup required
- Passwords are securely hashed with bcrypt

## 🧮 Salary Calculation Logic

The calculator uses the following structure:

- **Basic Salary**: 50% of Fixed CTC
- **HRA**: 40% of Fixed CTC
- **Special Allowance**: 10% of Fixed CTC
- **Fixed CTC**: Total CTC - Variable Pay - Insurance
- **EPF**: 12% of Basic Salary (employee contribution)
- **ESI**: 0.75% of Gross Salary (if salary < ₹21,000)
- **Professional Tax**: Varies by state/city
- **Income Tax**: Based on new tax regime 2024-25

### Variable Pay & Insurance

- **Variable Pay**: Part of CTC but not included in monthly salary calculations
- **Insurance**: Health/Life insurance premiums (part of CTC, not monthly salary)
- Monthly salary is calculated from **Fixed CTC** only

## 📊 Resume ATS Checker Logic

The ATS checker analyzes resumes based on:

- **Keyword Matching**: Checks for 50+ common ATS keywords
- **Resume Length**: Optimal length analysis (300-1000 words)
- **Section Detection**: Verifies presence of contact, experience, education, and skills sections
- **Action Verbs**: Identifies use of action verbs
- **Score Calculation**: Combines keyword density (60%) and length optimization (40%)

### Rate Limiting

- **3 checks per user** per 12-hour window
- Automatic reset after 12 hours from first check
- Usage tracking in database

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/me` - Get current user profile (requires auth)
- `POST /api/auth/update-profile` - Update user profile (requires auth)

### Salary Calculation
- `POST /api/salary/calculate` - Calculate salary breakdown (requires auth)
- `GET /api/salary/history` - Get user's calculation history (requires auth)

### Resume ATS Checker
- `POST /api/ats/check` - Upload and analyze resume (requires auth, file upload)
- `POST /api/ats/usage` - Get remaining checks and reset time (requires auth)

## 📁 Project Structure

```
salary-calculator/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application component
│   │   ├── App.css              # Styles
│   │   ├── main.tsx             # Entry point
│   │   ├── components/
│   │   │   ├── Login.tsx        # Login/Signup component
│   │   │   └── AtsChecker.tsx   # ATS Checker component
│   │   └── contexts/
│   │       └── AuthContext.tsx  # Authentication context
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── main.ts              # Application entry point
│   │   ├── app.module.ts        # Root module
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/      # GitHub & JWT strategies
│   │   │   └── dto/             # Register & Login DTOs
│   │   ├── user/                # User module
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   ├── salary/              # Salary calculation module
│   │   │   ├── salary.controller.ts
│   │   │   ├── salary.service.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   └── ats/                 # ATS checker module
│   │       ├── ats.controller.ts
│   │       ├── ats.service.ts
│   │       └── entities/
│   │           └── ats-usage.entity.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 🐛 Troubleshooting

### Backend not connecting to database
- Verify `DATABASE_URL` is correct
- Check that database is active (not paused)
- Ensure SSL is enabled if using cloud database

### CORS errors
- Ensure `FRONTEND_URL` in backend matches your frontend URL exactly
- Check that frontend is using the correct `VITE_API_URL`

### Authentication not working
- Verify GitHub OAuth credentials are correct
- Check that callback URL matches exactly
- Ensure JWT_SECRET is set

### File upload issues
- Verify file is PDF or DOCX format
- Check file size is under 2MB
- Ensure user has remaining checks available

### Build failures
- Check Node.js version (should be 20+)
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
