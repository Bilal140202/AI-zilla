import {
  buildPollinationsImageUrl,
  buildSystemPrompt,
  parseProviderTag,
  stripTags,
  type ZillaRequest
} from "@/lib/zilla";
import { NextRequest, NextResponse } from "next/server";

function streamJson(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function createSseTextStream(source: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const lines = event
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.startsWith("data:"));

            for (const line of lines) {
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") {
                continue;
              }

              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string | null } }>;
                };
                const chunk = json.choices?.[0]?.delta?.content || "";
                if (chunk) {
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch {
                continue;
              }
            }
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ZillaRequest;
    const command = body.command?.trim();

    if (!command) {
      return NextResponse.json({ error: "Command is required." }, { status: 400 });
    }

    const tag = parseProviderTag(command);
    const prompt = stripTags(command);

    if (tag === "pollinations-img") {
      return streamJson({
        type: "image",
        prompt,
        imageUrl: buildPollinationsImageUrl(prompt, body.pollinationsKey || process.env.POLLINATIONS_API_KEY)
      });
    }

    const apiKey = body.openRouterKey || process.env.OPENROUTER_API_KEY;
    const model = body.openRouterModel || process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";

    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key is required for text agents." }, { status: 400 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/Bilal140202/AI-zilla",
        "X-Title": "AI-zilla"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        stream: true,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(tag)
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const failure = await response.text();
      return NextResponse.json(
        { error: failure || `Provider request failed with status ${response.status}.` },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json({ error: "Provider did not return a stream." }, { status: 502 });
    }

    return new Response(createSseTextStream(response.body), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected command failure." },
      { status: 500 }
    );
  }
}
