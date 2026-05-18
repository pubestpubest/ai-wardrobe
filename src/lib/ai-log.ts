// Token + cost telemetry for AI calls. Logs to the server console (terminal
// where `bun run dev` runs). Pricing is per 1M tokens, rough public rates —
// adjust when models change.

type Pricing = { inputPerMillion: number; outputPerMillion: number };

const PRICING: Record<string, Pricing> = {
  "gemini-3.1-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10.0 },
};

const DEFAULT_PRICING: Pricing = { inputPerMillion: 0.1, outputPerMillion: 0.4 };

export type UsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
};

export type AiLogInput = {
  fn: string;
  model: string;
  usage?: UsageMetadata;
  durationMs: number;
  ok: boolean;
  extras?: Record<string, unknown>;
  error?: unknown;
};

export function computeCostUsd(model: string, promptTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? DEFAULT_PRICING;
  return (promptTokens * p.inputPerMillion + outputTokens * p.outputPerMillion) / 1_000_000;
}

function fmt(n: number, digits = 6): string {
  return n.toFixed(digits);
}

export function logAiUsage(log: AiLogInput): void {
  const prompt = log.usage?.promptTokenCount ?? 0;
  const output = log.usage?.candidatesTokenCount ?? 0;
  const total = log.usage?.totalTokenCount ?? prompt + output;
  const cached = log.usage?.cachedContentTokenCount ?? 0;
  const cost = computeCostUsd(log.model, prompt, output);

  const tag = log.ok ? "\x1b[36m[ai]\x1b[0m" : "\x1b[31m[ai-err]\x1b[0m";
  const head = `${tag} ${log.fn} · ${log.model} · ${log.durationMs}ms`;
  const tokens = `  tokens: in=${prompt} out=${output} total=${total}${cached ? ` cached=${cached}` : ""}`;
  const costLine = `  cost:   $${fmt(cost)} USD`;

  const lines = [head, tokens, costLine];
  if (log.extras) {
    for (const [k, v] of Object.entries(log.extras)) {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      lines.push(`  ${k}: ${val}`);
    }
  }
  if (!log.ok && log.error) {
    const msg = (log.error as Error)?.message ?? String(log.error);
    lines.push(`  error: ${msg}`);
  }

  console.log(lines.join("\n"));
}

export function summarizeUsage(model: string, usage?: UsageMetadata) {
  const prompt = usage?.promptTokenCount ?? 0;
  const output = usage?.candidatesTokenCount ?? 0;
  return {
    promptTokens: prompt,
    outputTokens: output,
    totalTokens: usage?.totalTokenCount ?? prompt + output,
    cachedTokens: usage?.cachedContentTokenCount ?? 0,
    costUsd: computeCostUsd(model, prompt, output),
  };
}
