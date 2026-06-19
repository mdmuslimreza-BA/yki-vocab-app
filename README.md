# YKI Vocab App 🇫🇮

Finnish–English vocabulary practice app for YKI exam preparation.
Built with React + Supabase + Vite. Free to host and run.

---

## Features

- **Teacher:** Upload CSV vocab lists, assign to students, view quiz progress
- **Student:** Flashcard mode (tap to flip), MCQ quiz (4 choices), score history
- Works as a **Progressive Web App** — students tap "Add to Home Screen" on iPhone/Android

---

## Setup in 5 Steps

### Step 1 — Create Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → Sign up → New Project
2. Wait for it to start (~1 min)
3. Go to **SQL Editor** → click **New Query**
4. Paste the entire contents of `supabase-schema.sql` → click **Run**
5. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### Step 2 — Configure your environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3 — Install and run locally

Make sure [Node.js](https://nodejs.org) is installed, then:

```bash
cd yki-vocab-app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Step 4 — Deploy to Vercel (free)

1. Push your code to [GitHub](https://github.com) (free account)
2. Go to [vercel.com](https://vercel.com) → Import your GitHub repo
3. Add your environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy** — you get a live URL like `yki-vocab.vercel.app`

### Step 5 — Share with students

Send students the URL. They:
1. Open it in their phone browser
2. Register as **Student**, enter your (teacher) email
3. Tap "Add to Home Screen" → it works like a native app

---

## CSV Format for Vocabulary Upload

No header row. One word pair per line:

```
talo,house
koira,dog
vesi,water
koulu,school
kauppa,shop
perhe,family
```

---

## How the App Works

### Teacher workflow
1. Register as **Teacher**
2. Upload a CSV → gives it a title (e.g. "Session 4 – Food & Shopping")
3. Click **Manage** on the list → **Assign Students** tab → toggle students
4. Check **Progress** tab to see quiz scores per student

### Student workflow
1. Register as **Student** → enter teacher's email
2. See assigned lists on dashboard
3. Choose **Flashcards** or **Quiz (MCQ)**
4. Results are saved automatically

---

## Tech Stack (all free)

| Tool | Purpose | Free limit |
|------|---------|------------|
| React + Vite | Frontend | Unlimited |
| Supabase | Database, Auth | 500MB DB, 50K users/month |
| Vercel | Hosting | 100GB bandwidth/month |

---

## Folder Structure

```
src/
├── lib/supabase.js          # Supabase client
├── contexts/AuthContext.jsx # Login state + helpers
├── components/
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── teacher/
│   │   ├── Dashboard.jsx    # List all vocab lists
│   │   ├── UploadVocab.jsx  # CSV upload
│   │   ├── ManageList.jsx   # View words + assign students
│   │   └── Progress.jsx     # Student quiz scores
│   └── student/
│       ├── Dashboard.jsx    # Assigned lists + history
│       ├── Flashcards.jsx   # Flip card practice
│       └── MCQQuiz.jsx      # Multiple choice quiz
```
