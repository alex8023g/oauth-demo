# Google OAuth with JWT Strategy

A Next.js application demonstrating Google OAuth authentication with JWT tokens, without using authentication frameworks like NextAuth.

## Features

- Google OAuth 2.0 authentication
- JWT access tokens (15 min) and refresh tokens (7 days)
- Prisma ORM with SQLite database
- Protected dashboard route
- HttpOnly secure cookies

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file:

```env
DATABASE_URL="file:./data/database.db"
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
JWT_SECRET=your_jwt_secret_key
```

### 3. Initialize the database

```bash
npx prisma migrate dev
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
  generated/prisma/       # Generated Prisma client
  prisma.ts               # Prisma client singleton
  jwt.ts                  # JWT token utilities
prisma/
  schema.prisma           # Database schema
  migrations/             # Database migrations
```

## Database Schema

### User
- `id` - Primary key
- `email` - User email (unique)
- `name` - Display name
- `googleId` - Google account ID (unique)
- `avatarUrl` - Profile picture URL
- `createdAt`, `updatedAt` - Timestamps

### Session
- `id` - Primary key
- `userId` - Foreign key to User
- `token` - Refresh token
- `expiresAt` - Token expiration
- `createdAt` - Timestamp

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - ORM with SQLite adapter
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT handling
- [Tailwind CSS](https://tailwindcss.com/) - Styling
