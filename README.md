# QueueFlow — Queue Management System

A simple full-stack queue management application made for the Rugas Technologies internship assignment. The project uses React, CSS, Supabase and Vercel.

## Features

- Manager sign up and login (Supabase Auth)
- Create multiple named queues
- Add people and automatically create token numbers
- See the waiting list and estimated time waiting
- Move waiting tokens up or down
- Call the first person in line for service
- Cancel a token
- Dashboard cards and simple queue analytics
- Responsive layout for desktop and mobile
- Demo preview mode works without a database connection (data is saved in browser local storage)

## 1. Run the demo on your computer

Install Node.js (LTS) first. Open this folder in VS Code, then run:

```bash
npm install
npm run dev
```

Open the local address shown in the terminal, usually `http://localhost:5173`.

The app starts in **Demo Preview** mode if you have not added Supabase details. You can create queues, add people, move tokens, serve them and cancel them. Demo data stays in that browser using local storage.

## 2. Connect Supabase for real accounts and database storage

1. Create a free project at https://supabase.com/.
2. Open **SQL Editor** in your Supabase project.
3. Open `supabase.sql` from this project, copy all its contents, paste them into SQL Editor and click **Run**.
4. Open **Project Settings → API** (or the API Keys page).
5. Copy the Project URL and the `anon` / publishable public key. Never put a `service_role` or secret key in frontend code.
6. In the project root, make a copy of `.env.example` and name it `.env`.
7. Add your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

8. Stop and restart the development server (`Ctrl + C`, then `npm run dev`).
9. Create a manager account from the sign-up page. If email confirmation is enabled, confirm your email first.

When Supabase settings are present, QueueFlow uses Supabase Auth and the Supabase database instead of demo local storage.

## 3. Push to GitHub

Create an empty repository on GitHub. Then run these commands from this project folder (replace the URL with your repository URL):

```bash
git init
git add .
git commit -m "Build QueueFlow queue management app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/queueflow.git
git push -u origin main
```

Do not commit `.env`. It is ignored by the included `.gitignore`.

## 4. Deploy on Vercel

1. Push the code to GitHub.
2. Sign in at https://vercel.com/ and choose **Add New → Project**.
3. Import your QueueFlow GitHub repository.
4. Vercel should detect Vite. Use build command `npm run build` and output directory `dist`.
5. In **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values from Supabase.
6. Click **Deploy**. Vercel will provide your live URL.
7. If you change environment variables later, redeploy the project.

## Project structure

```text
queueflow/
├── index.html
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── supabase.sql
└── src/
    ├── App.jsx       # App pages, queue actions and database calls
    ├── main.jsx      # React entry point
    └── styles.css    # App design and responsive layout
```

## How the application works

- A manager signs in and creates a queue with a name.
- When a person is added, the app creates the next token number in that queue.
- Waiting tokens are sorted using their position value.
- The up and down buttons swap the position of two waiting tokens.
- **Call next** changes the first waiting token's status to `served` and records its waiting time in minutes.
- **Cancel** changes a token's status to `cancelled`.
- Dashboard numbers are calculated from the queues and tokens in the database.

## Important notes

- Demo Preview is for testing the interface only. Its data belongs to the browser where it was created.
- Supabase is required for manager accounts and shared, persistent online data.
- Average wait time is calculated from completed tokens. Queue length analytics show the current number of waiting people in each queue.
- This is a student internship project. Before using it for real public services, add stronger validation, audit logs, rate limiting and more detailed operational testing.
