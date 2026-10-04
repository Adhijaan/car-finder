const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const researchOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reliabilitySummary: { type: "string", maxLength: 900 },
    commonIssues: { type: "array", maxItems: 4, items: { type: "string", maxLength: 240 } },
    strengths: { type: "array", maxItems: 4, items: { type: "string", maxLength: 240 } },
    estimatedMpg: { type: ["number", "null"] },
    estimatedResaleValue: { type: ["number", "null"] },
    resaleRationale: { type: "string", maxLength: 500 },
    evidence: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 180 },
          summary: { type: "string", maxLength: 300 },
          url: { type: "string" },
          category: { type: "string", enum: ["reliability", "engine", "recall", "economy", "resale", "other"] },
        },
        required: ["title", "summary", "url", "category"],
      },
    },
  },
  required: ["reliabilitySummary", "commonIssues", "strengths", "estimatedMpg", "estimatedResaleValue", "resaleRationale", "evidence"],
};

type UrlCitation = {
  type?: string;
  url?: string;
  title?: string;
};

type OutputContent = {
  type?: string;
  text?: string;
  annotations?: UrlCitation[];
};

type OutputItem = {
  type?: string;
  content?: OutputContent[];
  action?: { sources?: Array<{ url?: string; title?: string }> };
};

export async function researchWithOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const requestBody = JSON.stringify({
    model,
    input: prompt,
    reasoning: { effort: "none" },
    tools: [{ type: "web_search", search_context_size: "low" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    text: {
      format: {
        type: "json_schema",
        name: "vehicle_research",
        strict: true,
        schema: researchOutputSchema,
      },
    },
    max_output_tokens: 1800,
  });
  let payload: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: requestBody,
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok) {
      payload = await response.json();
      break;
    }

    let detail = "";
    let errorCode = "";
    try {
      const errorPayload = await response.json();
      detail = errorPayload?.error?.message || "";
      errorCode = errorPayload?.error?.code || "";
    } catch {
      // Preserve a status-only error if the upstream response is not JSON.
    }
    const actionableCodes = new Set([
      "credit_balance_exhausted",
      "organization_spend_limit_exceeded",
      "project_spend_limit_exceeded",
      "organization_usage_limit_exceeded",
    ]);
    const retryable = (response.status === 429 || response.status === 503) && !actionableCodes.has(errorCode);
    if (!retryable || attempt === 2) {
      throw new Error(`OpenAI research failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const headerSeconds = Number(response.headers.get("retry-after"));
    const messageSeconds = Number(detail.match(/try again in\s+([\d.]+)s/i)?.[1]);
    const serverDelay = Number.isFinite(headerSeconds) && headerSeconds > 0
      ? headerSeconds * 1000
      : Number.isFinite(messageSeconds) && messageSeconds > 0 ? messageSeconds * 1000 : 0;
    const exponentialDelay = 1500 * 2 ** attempt;
    const jitter = Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(serverDelay, exponentialDelay) + jitter)));
  }

  if (!payload) throw new Error("OpenAI research failed after retrying");
  const output = (payload.output || []) as OutputItem[];
  const messageContent = output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content || []);
  const outputText = messageContent
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("");
  if (!outputText) throw new Error("OpenAI research returned no structured content");

  const parsed = JSON.parse(outputText);
  const citations = messageContent.flatMap((item) => item.annotations || []);
  const searchedSources = output.flatMap((item) => item.action?.sources || []);
  const sources = [...citations, ...searchedSources]
    .filter((source): source is { url: string; title?: string } => Boolean(source.url && /^https?:\/\//i.test(source.url)))
    .filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);

  return { parsed, sources, model };
}
