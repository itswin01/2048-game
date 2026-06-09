# 2048 — Next.js + Supabase + Vercel

A full-featured 2048 game with Google login and persistent high scores.

## Features
- 🎮 2048 gameplay with arrow keys / WASD / swipe
- 📐 Choose grid size: 3×3 to 7×7
- ↔️ Drag corner to visually resize the board
- 🔐 Google OAuth via Supabase
- 🏆 High scores per dimension — synced to DB for logged-in users, localStorage for guests

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Copy your **Project URL** and **anon key** from Settings → API

### 2. Run the database schema

In Supabase → **SQL Editor**, paste and run the contents of `supabase-schema.sql`

### 3. Enable Google OAuth in Supabase

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable it, then go to [Google Cloud Console](https://console.cloud.google.com)
3. Create OAuth 2.0 credentials (Web application)
4. Add Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
5. Paste Client ID + Secret back into Supabase

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run locally

```bash
npm install
npm run dev
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

5. After deploy, add your Vercel URL to Supabase:
   - **Authentication → URL Configuration → Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

6. Also add the Vercel URL as an authorized redirect in Google Cloud Console.

---

## Local dev

```bash
npm run dev   # http://localhost:3000
npm run build # production build
```
