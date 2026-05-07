# ScrollSense AI

**AI-Powered Short-Form Video Addiction Risk Predictor and Digital Well-being Analyzer**

ScrollSense AI is a beginner-friendly academic web app that estimates a student's short-form video addiction risk using self-reported habits, an in-app YouTube-powered short-video session, mood check-ins, cognitive tests, and an explainable local scoring model.

Important: this is not a medical diagnosis. It is an educational digital well-being tool. The scores are estimates, not clinical assessments.

## Features

- Premium responsive landing page
- Student onboarding assessment
- YouTube Data API v3 server route for public embeddable short-video approximations
- Full demo mode when no API key is configured
- Mood check-ins before and after video sessions
- Short-video session tracking: duration, videos watched, skips, next clicks, mindful pauses, continued-after-warning behavior, and urge score
- Reflective intervention after 3 minutes or 8 videos
- Reaction time test
- Memory recall test
- Stroop test
- Explainable AI/ML-style addiction risk prediction
- Dashboard with progress rings, bar chart, radar chart, and session history
- Personalized recommendations and 7-day plan
- Report page with JSON, CSV, and print export
- Local-first browser storage using localStorage
- No login, no database, no private app tracking
- Vercel-ready Next.js app

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Framer Motion
- Recharts
- Zustand
- localStorage
- YouTube Data API v3
- Vitest
- ESLint

## Folder Structure

```text
src/
  app/
    page.tsx
    onboarding/
    feed/
    mood/
    tests/
    dashboard/
    recommendations/
    report/
    methodology/
    settings/
    api/youtube/search/route.ts
  components/
    layout/
    providers/
    tests/
    ui/
  data/
    demo-videos.ts
    stroop-data.ts
    word-bank.ts
  lib/
    export.ts
    risk-engine.ts
    risk-input.ts
    storage.ts
    utils.ts
    validation.ts
    youtube.ts
  store/
    app-store.ts
  types/
    index.ts
```

## How to Install Node.js

Node.js is required to run this project.

1. Open [https://nodejs.org](https://nodejs.org).
2. Download the **LTS** version for Windows, macOS, or Linux.
3. Install it using the default options.
4. Open a terminal.
5. Check that Node.js and npm are installed:

```bash
node -v
npm -v
```

If both commands show version numbers, Node.js is installed correctly.

## How to Install Dependencies

Open a terminal in the project folder, then run:

```bash
npm install
```

This downloads all packages listed in `package.json`.

## How to Run Locally

Run:

```bash
npm run dev
```

Then open your browser at:

[http://localhost:3000](http://localhost:3000)

To stop the server, click the terminal and press:

```text
Ctrl + C
```

If you change `.env.local`, stop and restart the server.

## How to Get a YouTube Data API Key

The app works without an API key using demo mode. Use these steps only if you are the developer/operator and want live YouTube search results. These setup details are intentionally kept in this README and are not shown inside the production UI.

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Sign in with a Google account.
3. Create a new project.
4. Search for **YouTube Data API v3**.
5. Open it and click **Enable**.
6. Go to **APIs & Services** > **Credentials**.
7. Click **Create Credentials** > **API Key**.
8. Copy the key.
9. In the project root, create a file named:

```text
.env.local
```

10. Add this line:

```bash
YOUTUBE_API_KEY=your_api_key_here
```

11. Restart the development server:

```bash
npm run dev
```

12. Open the app and check **Preferences > Video feed**.

Security notes:

- Do not paste the API key into public GitHub files.
- Do not commit `.env.local`.
- `.env.local` is already included in `.gitignore`.
- For local testing, an unrestricted key is simpler.
- Before production, restrict the key in Google Cloud Console.
- The app reads the key only in the server-side video route, never in browser code.

## Run Without an API Key

You can run the full app without a YouTube API key.

If `YOUTUBE_API_KEY` is missing, the API route returns local demo videos from:

```text
src/data/demo-videos.ts
```

You can also force demo mode from **Preferences**.

## Useful Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run unit tests:

```bash
npm run test
```

Build for production:

```bash
npm run build
```

## Deploy to Vercel

1. Create a GitHub account if you do not have one.
2. Push this project to a GitHub repository.
3. Open [https://vercel.com](https://vercel.com).
4. Sign in with GitHub.
5. Click **Add New Project**.
6. Import your GitHub repository.
7. In Vercel project settings, add an environment variable:

```text
YOUTUBE_API_KEY
```

8. Paste your YouTube API key as the value.
9. Click **Deploy**.
10. Open the production URL Vercel gives you.

The app still works in production without a key, but it will use demo mode.

## Academic Methodology

ScrollSense AI estimates risk using:

- Self-reported daily short-video usage
- Late-night viewing frequency
- Losing-track-of-time frequency
- Unintentional opening frequency
- Planned vs actual session duration
- In-app video session behavior
- Mood before and after watching
- Urge to continue
- Reaction time
- Memory recall score
- Stroop score
- Sleep and study hours

The model in `src/lib/risk-engine.ts` is an explainable scoring model inspired by ML classification. A trained ML model can replace it later.

## Project Limitations

- ScrollSense AI does not directly access private phone usage or third-party app activity.
- It does not log in to YouTube.
- It does not track Instagram, TikTok, Facebook, or phone screen time.
- It estimates risk using self-reported data, in-app behavior, and cognitive test results.
- It is not a medical diagnosis.
- Scores are educational estimates, not clinical assessments.
- YouTube videos are embedded; the app does not download or redistribute videos.
- The YouTube Data API cannot perfectly filter only YouTube Shorts, so the app approximates short videos with `videoDuration=short` and public embeddable search parameters.

## Future Scope

- Replace the scoring rules with Logistic Regression, Random Forest, or TensorFlow.js.
- Add optional authentication.
- Add a database for multi-device history.
- Add richer longitudinal trend analysis.
- Add consent-based research exports.
- Improve short-video classification.
- Add accessibility and localization improvements.

See `future_scope.md` for more detail.

## Screenshots

Add screenshots here after you run the app:

- Landing page
- Onboarding page
- Feed session
- Cognitive tests
- Dashboard
- Report page

## Troubleshooting

If `npm install` fails:

- Check that Node.js is installed.
- Check your internet connection.
- Delete `node_modules` and `package-lock.json`, then run `npm install` again.

If the app does not open:

- Make sure `npm run dev` is still running.
- Open [http://localhost:3000](http://localhost:3000).
- If port 3000 is busy, Next.js may choose another port. Read the terminal output.

If public videos do not load:

- Open **Preferences** and check the video feed status.
- Make sure `.env.local` exists in the project root.
- Make sure the line is exactly `YOUTUBE_API_KEY=your_api_key_here`.
- Restart the server after editing `.env.local`.
- If quota is exceeded, demo mode will automatically be used.

## Production UI Boundary

The app UI does not display API keys, environment variable names, setup files, README instructions, server route paths, or dev-server restart guidance. Those details belong in developer documentation only. Users only see whether the public video feed is live or whether demo videos are active.

If dashboard scores look incomplete:

- Fill onboarding first.
- Save a mood check-in.
- Run a feed session.
- Complete the cognitive tests.

If tests fail with a Windows sandbox or permission error:

- Run `npm run test` from a normal terminal outside restrictive sandbox software.
