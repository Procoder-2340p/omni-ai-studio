# OmniAI Studio — Lightweight Multi-Model Chatbot & Image Generator

A zero-dependency, ultra-lightweight AI web app designed for websites. It combines massive-context chat (**1M tokens**), blazing-fast backups with automatic failover, and **free daily AI image generation**.

---

## Included Models
1. **Google Gemini 3.8 Flash & 3.5 Flash-Lite** (Free tier on Google AI Studio) — **1,048,576 token context window** + native image/document understanding.
2. **Groq GPT-OSS 120B & Llama 3.3 70B** (Free tier on Groq) — Up to ~500 tokens/sec ultra-fast replies.
3. **OpenRouter Auto-Free** (`openrouter/free`) — Routes automatically to available free open-weight models.
4. **Cloudflare Workers AI — FLUX.1 Schnell** (Free 10,000 Neurons/day) — Fast, free daily image generation.
5. **Google Nano Banana 2.1 (`gemini-nano-banana-2.1`)** — Optional pro-grade 1K–4K image engine (requires billing enabled on Google AI Studio).

---

## Step 1: Get Your Free API Keys (No Credit Card Required)
You only need **Gemini + Cloudflare** to unlock both huge-context chat AND free image generation (Groq & OpenRouter are optional speed/failover boosters):

1. **Google AI Studio (Chat + Huge Context):** https://aistudio.google.com/apikey -> Create API Key (`GEMINI_API_KEY`)
2. **Cloudflare Workers AI (Free Image Generation):** https://dash.cloudflare.com -> **AI -> Workers AI -> Use REST API** -> Copy your `Account ID` (`CLOUDFLARE_ACCOUNT_ID`) and create a `Workers AI` API Token (`CLOUDFLARE_API_TOKEN`)
3. **Groq (Optional Ultra-Fast Backup):** https://console.groq.com/keys (`GROQ_API_KEY`)
4. **OpenRouter (Optional Multi-Model Free Backup):** https://openrouter.ai/keys (`OPENROUTER_API_KEY`)

---

## Step 2: Test Locally on Your PC (Optional — 30 Seconds)
1. Install **Node.js (v20+)** from https://nodejs.org
2. Unzip `omni-ai-studio.zip` into a folder on your PC.
3. Duplicate `.env.example`, rename it to `.env`, and paste your API keys inside.
4. Open Terminal / Command Prompt in that folder and run:
   ```bash
   node local-server.mjs
   ```
5. Open **http://localhost:3000** in your browser!

---

## Step 3: Upload Online for Free (Vercel — 2 Minutes)
1. Create a free GitHub account and upload this folder to a new repository (make sure `.env` is NOT uploaded!).
2. Go to https://vercel.com, sign in with GitHub, click **Add New -> Project**, and import your repository.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `GEMINI_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - *(Optional)* `GROQ_API_KEY`
   - *(Optional)* `OPENROUTER_API_KEY`
4. Click **Deploy**. Your live AI web app is online in ~20 seconds!

---

## Step 4: Embed on ANY Other Website (1 Line of Code)
Paste this line right before `</body>` on any HTML website, blog, or portfolio to add a floating AI chatbot widget:

```html
<script src="https://YOUR-PROJECT.vercel.app/embed-widget.js" data-url="https://YOUR-PROJECT.vercel.app"></script>
```
