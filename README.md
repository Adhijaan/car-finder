# Which Whip

Which Whip turns pasted used-car listings into buyer-specific, evidence-backed comparisons. It extracts listing facts, lets the buyer correct them, researches vehicle risks and resale, estimates simplified monthly ownership cost, and uses Jev to assign the final rating.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The product remains usable without API keys through labeled local demo analysis.

## API configuration

- `GEMINI_API_KEY`: enables schema-guided listing extraction.
- `GEMINI_MODEL`: optional; defaults to the fast, high-throughput `gemini-3.5-flash-lite`.
- `GEMINI_FALLBACK_MODELS`: comma-separated models tried after transient capacity errors; defaults to `gemini-3.5-flash,gemini-3.7-flash,gemini-3.8-flash`.
- `OPENAI_API_KEY`: enables web-grounded vehicle reliability and resale research through the Responses API.
- `OPENAI_MODEL`: optional; defaults to `gpt-5.4-mini`.
- `JEV_API_KEY`: enables TypeSafe/Jev factor and overall ratings.
- `JEV_MODEL`: optional; defaults to `jev-latest`.

Keep these variables server-side. Never expose them with a `NEXT_PUBLIC_` prefix.

## Product behavior

- Preferences and evaluations are stored in browser `localStorage`; there is no login or server database.
- A verified hard-requirement failure caps the final score at 4/10. Unknown facts lower confidence and become seller questions.
- The cost estimate includes only depreciation and fuel. Financing, insurance, taxes, maintenance, repairs, and tires remain excluded and visible.
- A changed buyer profile marks prior evaluations stale so scores from different profiles are not silently compared.
- Listing text is treated as untrusted data. Automatic Facebook scraping is intentionally outside the core flow.

## Checks

```bash
npm test
npm run build
```
