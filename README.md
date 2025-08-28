# CareMate (v1) — Emotional Support AI

A warm, caring companion for empathetic listening and gentle coping tips. **Not a medical professional** and **not therapy**.

## Tech Stack
- Frontend: React (Vite) — responsive chat UI with voice (TTS/STT)
- Backend: Netlify Function calling OpenAI Chat Completions
- Model: `gpt-4o-mini` via `https://api.openai.com/v1`
- Voice: Web Speech API (speechSynthesis + SpeechRecognition)
- Export: Download conversation as TXT

## Quick Start (Local)

```bash
git clone <this-repo>
cd CareMate-v1
cp .env.example .env   # set OPENAI_API_KEY
npm i
npm run dev            # uses Netlify Dev to run functions + Vite
```

Local URL will be printed by Netlify CLI (typically http://localhost:8888).

> If you prefer raw Vite without functions, you must proxy the function path. The default workflow uses `netlify dev` so that `/.netlify/functions/support` works locally.

## Deploy to Netlify
1. Push this folder to GitHub.
2. Create a new Netlify site from Git.
3. Add environment variable `OPENAI_API_KEY` in Netlify site settings.
4. Deploy. The function endpoint is automatically available at `/.netlify/functions/support`.

## Safety & Boundaries
- CareMate is **not** a doctor or therapist.
- It avoids diagnoses and prescriptions.
- If a crisis indicator appears, UI shows a sticky **Crisis Panel** urging local help.
- No data is stored; chat lives in memory until page refresh.

## Voice Notes
- TTS uses `speechSynthesis` and STT uses `SpeechRecognition` (or `webkitSpeechRecognition`).
- If unsupported, the UI stays in text mode and shows a small tooltip.

## Project Structure
```
frontend/
  index.html
  main.jsx
  App.jsx
  ChatBubble.jsx
  api.js
  styles.css
netlify/
  functions/
    support.js
.env.example
netlify.toml
package.json
README.md
```
