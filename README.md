# Google OAuth with JWT Strategy

A Next.js application demonstrating Google OAuth authentication with JWT tokens, without using authentication frameworks like NextAuth.

## Features

- Google OAuth 2.0 authentication
- JWT access tokens (15 min) and refresh tokens (7 days)
- SQLite database for user and session storage
- Protected dashboard route
- HttpOnly secure cookies

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
JWT_SECRET=your_jwt_secret_key
```

### 3. Initialize the database

```bash
npx tsx scripts/init-db.ts
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
  api/
    auth/
      google/
        route.ts          # Initiates Google OAuth flow
        callback/
          route.ts        # Handles OAuth callback, stores user
  dashboard/
    page.tsx              # Protected dashboard page
  login/
    page.tsx              # Login page
lib/
  db/
    index.ts              # SQLite database operations
    schema.sql            # Database schema
  jwt.ts                  # JWT token utilities
scripts/
  init-db.ts              # Database initialization script
  check-db.ts             # Database structure checker
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - User email (unique)
- `name` - Display name
- `google_id` - Google account ID (unique)
- `avatar_url` - Profile picture URL
- `created_at`, `updated_at` - Timestamps

### Sessions Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `token` - Refresh token
- `expires_at` - Token expiration
- `created_at` - Timestamp

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite database
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT handling
- [Tailwind CSS](https://tailwindcss.com/) - Styling
