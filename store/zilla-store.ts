"use client";

import { create } from "zustand";

export type Agent = {
  id: string;
  label: string;
  tag: string;
  status: "Ready" | "Needs key" | "Image";
  description: string;
};

type ZillaState = {
  agents: Agent[];
  prompts: string[];
  recent: string[];
  remember: (value: string) => void;
};

export const useZillaStore = create<ZillaState>((set) => ({
  agents: [
    {
      id: "openrouter",
      label: "OpenRouter Core",
      tag: "@openrouter",
      status: "Needs key",
      description: "General command, research, coding, and planning agent."
    },
    {
      id: "nyok",
      label: "NYOK Reasoner",
      tag: "@nyok",
      status: "Needs key",
      description: "Strict reasoning persona routed through OpenRouter-compatible calls."
    },
    {
      id: "pollinations-img",
      label: "Pollinations Image",
      tag: "@pollinations-img",
      status: "Image",
      description: "Image prompt and asset generation for covers, concepts, and diagrams."
    }
  ],
  prompts: [
    "@openrouter audit this launch plan and list the highest-risk assumptions",
    "@nyok convert this idea into a technical architecture and milestones",
    "@pollinations-img product dashboard with agent routing and workflow lanes"
  ],
  recent: [],
  remember: (value) =>
    set((state) => ({
      recent: [value, ...state.recent.filter((item) => item !== value)].slice(0, 6)
    }))
}));
