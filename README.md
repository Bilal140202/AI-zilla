# AI-zilla

AI-zilla is a unified AI command dashboard for routing work across model providers, prompt presets, and image generation flows.

## What is built

- Next.js App Router application
- Dashboard-first interface with agent status, prompt library, workflow lanes, and command arena
- Streaming command route at `/api/zilla-command`
- Free local browser AI through WebLLM with background model preload
- BYOK OpenRouter support for text tasks
- Pollinations image URL generation for `@pollinations-img` requests
- Extreme build-prompt system prompting with a copy-paste Markdown code block section
- Provider errors are surfaced directly; no fake placeholder model output is returned

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Command Tags

- `@local` or `@webllm`: free in-browser generation through WebLLM
- `@openrouter` or `@nyok`: text generation through OpenRouter-compatible chat completions
- `@pollinations-img`: image generation through Pollinations image endpoint

The app starts loading `Llama-3.2-1B-Instruct-q4f32_1-MLC` in the browser after launch. This requires a WebGPU-capable browser.

## Environment

You can enter keys in the UI, or set server defaults:

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
POLLINATIONS_API_KEY=
```
