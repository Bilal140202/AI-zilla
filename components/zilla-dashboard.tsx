"use client";

import { useZillaStore } from "@/store/zilla-store";
import {
  Bot,
  Braces,
  Cable,
  Copy,
  Image,
  KeyRound,
  Play,
  Settings,
  Sparkles,
  Workflow
} from "lucide-react";
import { FormEvent, useState } from "react";

type ImageResponse = {
  type?: "image";
  prompt?: string;
  imageUrl?: string;
  error?: string;
};

async function readTextStream(response: Response, onChunk: (chunk: string) => void) {
  if (!response.ok) {
    const failureText = await response.text();
    try {
      const json = JSON.parse(failureText) as { error?: string };
      throw new Error(json.error || "Command failed.");
    } catch {
      throw new Error(failureText || "Command failed.");
    }
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<ImageResponse>;
  }

  if (!response.body) {
    throw new Error("Provider did not return a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      output += chunk;
      onChunk(chunk);
    }
  }

  return { type: undefined, prompt: undefined, imageUrl: undefined, text: output };
}

export function ZillaDashboard() {
  const { agents, prompts, recent, remember } = useZillaStore();
  const [command, setCommand] = useState(prompts[0]);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("openai/gpt-4.1-mini");
  const [pollinationsKey, setPollinationsKey] = useState("");
  const [output, setOutput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const runCommand = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setRunning(true);
    setError("");
    setOutput("");
    setImageUrl("");

    try {
      const response = await fetch("/api/zilla-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command,
          openRouterKey: openRouterKey.trim(),
          openRouterModel: openRouterModel.trim(),
          pollinationsKey: pollinationsKey.trim()
        })
      });

      const result = await readTextStream(response, (chunk) => {
        setOutput((current) => current + chunk);
      });

      if ("imageUrl" in result && result.imageUrl) {
        setImageUrl(result.imageUrl);
        setOutput(`Prompt: ${result.prompt || command}`);
      }

      remember(command);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Command failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-[var(--line)] bg-[#0d1012] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded border border-[var(--acid)] bg-[rgba(57,255,20,0.12)]">
              <Sparkles className="h-5 w-5 text-[var(--acid)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AI-zilla</h1>
              <p className="text-xs text-[var(--muted)]">Agent command deck</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2 text-sm">
            <button className="flex items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left">
              <Bot className="h-4 w-4 text-[var(--acid)]" /> Agents
            </button>
            <button className="flex items-center gap-3 rounded px-3 py-2 text-left text-[var(--muted)]">
              <Braces className="h-4 w-4" /> Prompt Library
            </button>
            <button className="flex items-center gap-3 rounded px-3 py-2 text-left text-[var(--muted)]">
              <Workflow className="h-4 w-4" /> Workflows
            </button>
            <button className="flex items-center gap-3 rounded px-3 py-2 text-left text-[var(--muted)]">
              <Settings className="h-4 w-4" /> Settings
            </button>
          </nav>

          <section className="mt-8">
            <h2 className="text-xs uppercase tracking-wide text-[var(--muted)]">Provider Keys</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                OpenRouter
                <input
                  className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                  onChange={(event) => setOpenRouterKey(event.target.value)}
                  placeholder="sk-or-v1-..."
                  type="password"
                  value={openRouterKey}
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Text model
                <input
                  className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                  onChange={(event) => setOpenRouterModel(event.target.value)}
                  value={openRouterModel}
                />
              </label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Pollinations
                <input
                  className="rounded border border-[var(--line)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--acid)]"
                  onChange={(event) => setPollinationsKey(event.target.value)}
                  placeholder="optional image key"
                  type="password"
                  value={pollinationsKey}
                />
              </label>
            </div>
          </section>
        </aside>

        <section className="grid gap-5 p-5 lg:grid-rows-[auto_auto_1fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {agents.map((agent) => (
              <article className="panel rounded p-4" key={agent.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{agent.label}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">{agent.description}</p>
                  </div>
                  <span className="chip rounded px-2 py-1 text-xs">{agent.tag}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
                  {agent.status === "Image" ? <Image className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  {agent.status}
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <form className="panel rounded p-4" onSubmit={runCommand}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Zilla Arena</h2>
                <button
                  className="inline-flex items-center gap-2 rounded bg-[var(--acid)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  disabled={running}
                  type="submit"
                >
                  <Play className="h-4 w-4" />
                  {running ? "Running" : "Run"}
                </button>
              </div>
              <textarea
                className="min-h-40 w-full resize-y rounded border border-[var(--line)] bg-black p-3 text-sm text-white outline-none focus:border-[var(--acid)]"
                onChange={(event) => setCommand(event.target.value)}
                value={command}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    className="rounded border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] hover:border-[var(--acid)] hover:text-white"
                    key={prompt}
                    onClick={() => setCommand(prompt)}
                    type="button"
                  >
                    {prompt.split(" ").slice(0, 5).join(" ")}
                  </button>
                ))}
              </div>
            </form>

            <section className="panel rounded p-4">
              <h2 className="font-semibold">Workflow Chain</h2>
              <div className="mt-4 grid gap-3">
                {["@nyok brief", "@openrouter execute", "@pollinations-img asset"].map((item, index) => (
                  <div className="flex items-center gap-3 rounded border border-[var(--line)] bg-black p-3 text-sm" key={item}>
                    <span className="grid h-7 w-7 place-items-center rounded bg-[rgba(57,255,20,0.12)] text-xs text-[var(--acid)]">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid min-h-[420px] gap-4 xl:grid-cols-[1fr_360px]">
            <section className="panel terminal-scroll overflow-auto rounded p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Output</h2>
                <button
                  className="rounded border border-[var(--line)] p-2 text-[var(--muted)] hover:text-white"
                  disabled={!output}
                  onClick={() => navigator.clipboard.writeText(output)}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {error ? <pre className="whitespace-pre-wrap text-sm text-[var(--danger)]">{error}</pre> : null}
              {output ? <pre className="whitespace-pre-wrap text-sm leading-6 text-[#d7f7d2]">{output}</pre> : null}
              {!output && !error ? <p className="text-sm text-[var(--muted)]">Run a tagged command to stream results here.</p> : null}
              {imageUrl ? (
                <div className="mt-4 overflow-hidden rounded border border-[var(--line)]">
                  <img alt="Generated Pollinations asset" className="w-full" src={imageUrl} />
                </div>
              ) : null}
            </section>

            <section className="panel rounded p-4">
              <h2 className="font-semibold">Recent Runs</h2>
              <div className="mt-4 grid gap-2">
                {recent.length ? (
                  recent.map((item) => (
                    <button
                      className="rounded border border-[var(--line)] p-3 text-left text-xs text-[var(--muted)] hover:border-[var(--acid)] hover:text-white"
                      key={item}
                      onClick={() => setCommand(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No recent runs yet.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
