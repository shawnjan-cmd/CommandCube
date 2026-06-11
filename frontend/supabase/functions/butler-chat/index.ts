/**
 * 🤖 BUTLER CHAT — Gemini AI Edge Function
 *
 * Receives enriched messages from the mobile app (including live PC metrics,
 * tool results, and conversation history) and forwards them to Google Gemini.
 *
 * Model: gemini-2.0-flash (fast, cost-efficient, 1M context)
 * Auth: Optional — works for both authenticated and anonymous calls.
 */

import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE       = 0.7;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ButlerChatRequest {
  message: string;                  // Current user message (may include tool results)
  systemPrompt?: string;            // Full system context built by the app
  conversation?: ChatMessage[];     // Last N turns
  toolResults?: string[];           // Tool outputs already collected on-device
  metricsSnapshot?: string;         // One-line PC metrics summary
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ─────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Guard: API key must be present ─────────────────────────────
  if (!GEMINI_API_KEY) {
    const errMsg = '[ButlerChat] CRITICAL: GEMINI_API_KEY environment variable is not set. Go to Supabase Dashboard > Edge Functions > Secrets and add GEMINI_API_KEY with your Google AI Studio key from https://aistudio.google.com/app/apikey';
    console.error(errMsg);
    return new Response(
      JSON.stringify({
        error: 'GEMINI_API_KEY not configured',
        fix: 'Supabase Dashboard > Edge Functions > Secrets > Add GEMINI_API_KEY',
        getKey: 'https://aistudio.google.com/app/apikey',
        detail: 'The GEMINI_API_KEY secret is missing from this Edge Function environment.',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: ButlerChatRequest = await req.json();
    const { message, systemPrompt, conversation = [], toolResults = [], metricsSnapshot } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ButlerChat] 📨 Message: "${message.slice(0, 80)}..." | Tools: ${toolResults.length} | Metrics: ${!!metricsSnapshot}`);

    // ── Build Gemini contents array ─────────────────────────────
    // Gemini uses alternating user/model turns.
    // We inject the system prompt as the very first user turn.
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // System context as first user turn (Gemini Flash supports system_instruction
    // but this pattern is universally compatible across models)
    const systemInstruction = systemPrompt || buildDefaultSystem(metricsSnapshot);

    // Conversation history (last 10 turns max to control token usage)
    const historySlice = conversation.slice(-10);
    for (const turn of historySlice) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }

    // Current user message — enriched with tool results
    let enrichedMessage = message;
    if (toolResults.length > 0) {
      enrichedMessage += `\n\n--- TOOL RESULTS (already executed on-device) ---\n${toolResults.join('\n\n')}`;
    }
    if (metricsSnapshot) {
      enrichedMessage += `\n\n[LIVE PC METRICS: ${metricsSnapshot}]`;
    }
    contents.push({ role: 'user', parts: [{ text: enrichedMessage }] });

    // ── Gemini API request ──────────────────────────────────────
    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
      signal: AbortSignal.timeout(25_000),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let errDetail = '';
      try {
        const parsed = JSON.parse(errText);
        errDetail = parsed?.error?.message || parsed?.error?.status || errText.slice(0, 300);
      } catch {
        errDetail = errText.slice(0, 300);
      }
      console.error(`[ButlerChat] Gemini API error ${geminiRes.status}: ${errDetail}`);
      // Map common Gemini errors to actionable messages
      let userMsg = `Gemini API error ${geminiRes.status}: ${errDetail}`;
      if (geminiRes.status === 400) userMsg = `Gemini rejected the request (400): ${errDetail} — Check your prompt format`;
      else if (geminiRes.status === 401) userMsg = `Invalid GEMINI_API_KEY (401) — Check your key at https://aistudio.google.com/app/apikey`;
      else if (geminiRes.status === 403) userMsg = `GEMINI_API_KEY lacks permission (403) — Ensure Gemini API is enabled in Google AI Studio`;
      else if (geminiRes.status === 429) userMsg = `Gemini rate limit hit (429) — Too many requests, wait 60 seconds and retry`;
      else if (geminiRes.status === 500) userMsg = `Gemini internal error (500) — Google service issue, retry in a moment`;
      else if (geminiRes.status === 503) userMsg = `Gemini service unavailable (503) — Google API overloaded, retry in 30 seconds`;
      return new Response(
        JSON.stringify({ error: userMsg, geminiStatus: geminiRes.status, detail: errDetail }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiRes.json();

    // ── Extract response text ───────────────────────────────────
    const candidate  = geminiData?.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text ?? '';
    const finishReason = candidate?.finishReason ?? 'UNKNOWN';
    const usageTokens  = geminiData?.usageMetadata ?? {};

    if (!responseText) {
      console.warn('[ButlerChat] ⚠️ Empty response from Gemini. Finish reason:', finishReason);
      return new Response(
        JSON.stringify({ error: 'No response generated', finishReason }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ButlerChat] ✅ Response: ${responseText.length} chars | Tokens in: ${usageTokens.promptTokenCount} out: ${usageTokens.candidatesTokenCount} | Finish: ${finishReason}`);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        model: GEMINI_MODEL,
        finishReason,
        usage: usageTokens,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ButlerChat] ❌ Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ── Default system prompt (used when app doesn't send one) ────────
function buildDefaultSystem(metricsSnapshot?: string): string {
  return `You are Butler, an expert AI assistant embedded in a mobile app (Botler) that controls a Windows/Mac/Linux PC via a self-hosted Python server (FastAPI + psutil).

Your capabilities:
• You receive LIVE PC metrics (CPU, RAM, Disk, Network) with every message — use them proactively
• You can reference Python script execution results from the user's PC
• You know the user's pending tasks, error logs, and app diagnostics (provided in tool results)
• You speak in a professional, concise, technical tone — like a knowledgeable DevOps assistant

Key rules:
• Always reference real metrics when they're available in the message — never say "I don't know your CPU usage" if it was provided
• If CPU > 80%, proactively warn and suggest remediation
• If RAM > 85%, suggest closing applications
• If Disk > 90%, alert the user immediately
• Format data-heavy answers using plain-text tables (no markdown that won't render)
• Keep responses concise — max 200 words unless detail is specifically requested
• Never hallucinate metrics — only report what's in the provided context
${metricsSnapshot ? `\nCurrent PC snapshot: ${metricsSnapshot}` : ''}`;
}
