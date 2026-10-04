const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiOptions = {
  prompt: string;
  schema?: Record<string, unknown>;
  search?: boolean;
};

export async function generateWithGemini({ prompt, schema, search }: GeminiOptions) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const models = Array.from(new Set([
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash,gemini-3.7-flash,gemini-3.8-flash")
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean),
  ]));
  const generationConfig: Record<string, unknown> = {
    temperature: 0.15,
    responseMimeType: "application/json",
  };
  if (schema && !search) generationConfig.responseSchema = schema;
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    ...(search ? { tools: [{ google_search: {} }] } : {}),
  });
  let lastError = "Gemini request failed";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: requestBody,
        signal: AbortSignal.timeout(45000),
      });
      if (response.ok) {
        const payload = await response.json();
        const candidate = payload.candidates?.[0];
        const output = candidate?.content?.parts?.map((part: { text?: string }) => part.text || "").join("");
        if (!output) throw new Error("Gemini returned no content");
        const cleaned = output.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned);
        const chunks = candidate?.groundingMetadata?.groundingChunks || [];
        return { parsed, chunks, model };
      }

      let detail = "";
      try {
        const errorPayload = await response.json();
        detail = errorPayload?.error?.message || "";
      } catch {
        // Keep the status-only fallback when Gemini does not return JSON.
      }
      lastError = `Gemini ${model} failed (${response.status})${detail ? `: ${detail}` : ""}`;
      const transient = response.status === 429 || response.status >= 500;
      const unavailableModel = response.status === 404;
      if (!transient && !unavailableModel) throw new Error(lastError);
      if (transient && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      break;
    }
  }
  throw new Error(lastError);
}
