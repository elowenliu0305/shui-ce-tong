export interface ModelMessage {
  role: "system" | "user";
  content: string;
}

export interface StructuredModelAnswer {
  answer: string;
  citationIds?: string[];
  suggestedQuestions?: string[];
}

interface ModelProviderOptions {
  fetcher?: typeof fetch;
  env?: (name: string) => string | undefined;
  timeoutMs?: number;
  retries?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function endpoint(baseUrl: string): string {
  const clean = baseUrl.replace(/\/$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

function parseStructuredAnswer(content: string): StructuredModelAnswer {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(normalized) as Partial<StructuredModelAnswer>;
  if (typeof parsed.answer !== "string" || !parsed.answer.trim() || parsed.answer.trim().length > 20_000) {
    throw new Error("model_invalid_payload");
  }
  if (parsed.citationIds && !Array.isArray(parsed.citationIds)) throw new Error("model_invalid_payload");
  if (parsed.suggestedQuestions && !Array.isArray(parsed.suggestedQuestions)) throw new Error("model_invalid_payload");
  return {
    answer: parsed.answer.trim(),
    citationIds: parsed.citationIds?.filter((value): value is string => typeof value === "string").slice(0, 8),
    suggestedQuestions: parsed.suggestedQuestions?.filter((value): value is string => typeof value === "string").slice(0, 3),
  };
}

export async function requestStructuredModelAnswer(
  messages: ModelMessage[],
  options: ModelProviderOptions = {},
): Promise<StructuredModelAnswer> {
  const runtime = globalThis as typeof globalThis & { Deno?: { env: { get(name: string): string | undefined } } };
  const env = options.env ?? ((name: string) => runtime.Deno?.env.get(name));
  const baseUrl = env("MODEL_API_BASE_URL")?.trim();
  const apiKey = env("MODEL_API_KEY")?.trim();
  const model = env("MODEL_NAME")?.trim();
  if (!baseUrl || !apiKey || !model) throw new Error("model_not_configured");
  const fetcher = options.fetcher ?? fetch;
  const retries = options.retries ?? 2;
  let lastError = "model_request_failed";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetcher(endpoint(baseUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.2, response_format: { type: "json_object" } }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 25_000),
      });
      const body = await response.json() as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content;
      if (response.ok && content) return parseStructuredAnswer(content);
      lastError = body.error?.message ?? `model_http_${response.status}`;
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "model_request_failed";
    }
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw new Error(lastError);
}
