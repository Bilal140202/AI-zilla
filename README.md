# AI-zilla

AI-zilla is a unified AI command dashboard for routing work across model providers, prompt presets, and image generation flows.

## What is built

- Next.js App Router application
- Dashboard-first interface with agent status, prompt library, workflow lanes, and command arena
- Streaming command route at `/api/zilla-command`
- BYOK OpenRouter support for text tasks
- Pollinations image URL generation for `@pollinations-img` requests
- Provider errors are surfaced directly; no fake placeholder model output is returned

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Command Tags

- `@openrouter` or `@nyok`: text generation through OpenRouter-compatible chat completions
- `@pollinations-img`: image generation through Pollinations image endpoint

## Environment

You can enter keys in the UI, or set server defaults:

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
POLLINATIONS_API_KEY=
```
