# NextGen Coaching Institute — AI Chatbot

An AI-powered chatbot for **NextGen Coaching Institute**, built the same way as the `hospital-chatbot` project: instead of keyword/rule matching, it sends the institute's data as context to a real language model (via [OpenRouter](https://openrouter.ai)) and lets the model generate natural answers.

This replaces the earlier `coaching-chatbot-main` project, which was rule-based (keyword matching in `lib/responder.js`, no AI model involved).

## How it works

1. `data/coaching.json` holds all facts about the institute — programs, fees, timings, admissions, faculty, FAQs, etc.
2. `app/api/chat/route.js` reads that file, wraps it in a system prompt with strict rules ("answer only from this data", "no appointment booking", "say so if info is missing"), and sends it + the user's message to OpenRouter's chat completions endpoint.
3. `app/ChatApp.jsx` is the chat widget UI (quick-reply buttons for Courses / Fees / Timings / Admissions, sticky input bar, WhatsApp-style bubbles).
4. `app/api/admin/save/route.js` + `app/api/memory.js` are a simple in-memory hook for pushing updated business data at runtime, gated by `ADMIN_PASSWORD`.

## Setup

```bash
npm install
cp .env.local.example .env.local
# then edit .env.local:
#   OPENROUTER_API_KEY = get a free key at https://openrouter.ai/keys
#   ADMIN_PASSWORD      = set your own strong password
npm run dev
```

Visit `http://localhost:3000` to chat. Visit `http://localhost:3000?admin=1` to see the admin-mode indicator.

## Updating the institute's data

Edit `data/coaching.json` directly (name, programs, fees, timings, admission process, FAQs, etc.) — the chatbot will automatically use the latest version on the next request, no code changes needed.

## Notes

- Model used: `liquid/lfm-2.5-2.6b:free` (OpenRouter free tier) — swap the `model` field in `app/api/chat/route.js` for a different OpenRouter model if you want higher quality answers.
- The `ADMIN_PASSWORD` is read from the environment, not hardcoded, so it's safe to commit this repo publicly as long as `.env.local` is gitignored.
