# Comprehensive Build Plan: AI-zilla

## 1. Executive Summary
This document serves as the master blueprint for building **AI-zilla** from scratch. It is designed to be fed into any AI coding assistant (e.g., Gemini 3.1) to autonomously scaffold, construct, and finalize the complete application.

**Core Objective:** Build a colossal AI Toolkit and Agent Aggregator that provides a unified dashboard to orchestrate multiple LLMs, including the NYOK model and Pollinations endpoint.

---

## 2. Technical Stack
*   **Frontend Framework:** Next.js (App Router) with React 18+.
*   **Styling:** Tailwind CSS (Monster-themed dark mode: deep purples, neon greens, and dark grays).
*   **Icons & Components:** Lucide-React, shadcn/ui.
*   **State Management:** Zustand.
*   **Database:** Supabase or PostgreSQL (for storing prompt libraries and agent workflows).
*   **AI Integration:** 
    *   **NYOK Model API:** For heavy-lifting text analysis, code generation, and reasoning. Includes pre-inserted system messages to set agent personas.
    *   **Pollinations Endpoint:** For dynamic image generation and data visualization assets.

---

## 3. Architecture & Plotting

### 3.1. User Flow
1.  **Dashboard:** A grid layout displaying active agents, quick-access prompts, and recent generations.
2.  **The "Zilla" Arena (Chat/Input):** A central command terminal where users can tag specific models (e.g., \@nyok\, \@pollinations\) to execute tasks.
3.  **Workflow Builder:** A drag-and-drop interface to chain AI tasks together (e.g., NYOK writes a story -> Pollinations generates the cover).

### 3.2. Data Flow & API Plotting
1.  **Next.js API Route (\/api/zilla-command\):**
    *   *Routing Logic:* Parses the user input to determine which model to route to.
    *   *Pre-Insert Limit Message:* Injects strict formatting rules based on the selected tool.
    *   *External Call:* Calls the respective API (NYOK/Pollinations) and streams the response.

---

## 4. Step-by-Step Prompting Guide for the AI Coder

Feed the following prompts to your AI assistant sequentially:

*   **Prompt 1 (Scaffolding):** "Initialize a Next.js project with Tailwind CSS. Create a 'monster-themed' dark mode configuration in tailwind.config.js using deep neon greens (#39ff14) and dark purples."
*   **Prompt 2 (Dashboard UI):** "Build the main Dashboard layout using a responsive CSS Grid. Create sidebar navigation for 'Agents', 'Prompt Library', and 'Settings'."
*   **Prompt 3 (The Arena):** "Build the main chat/command terminal. It needs to support tagging models with '@'. Implement the \/api/zilla-command\ route to handle requests and route them to the NYOK model API, ensuring pre-inserted limit messages are included."
*   **Prompt 4 (Asset Generation):** "Implement integration with the Pollinations endpoint for any requests tagged with \@pollinations-img\."

---

## 5. Edge Cases & Constraints
*   **Timeout Handling:** Long-running multi-agent workflows may timeout in serverless functions. Use background jobs or edge streaming.
