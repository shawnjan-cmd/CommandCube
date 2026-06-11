
/**
 * Context Manager — builds a trimmed Ollama-compatible message array.
 *
 * Prevents the context window from growing unbounded as conversations get long.
 * Without this, every message sends the full history → Ollama OOM / slow / truncated.
 *
 * Rules:
 *  - Max 20 messages in context (10 user + 10 assistant turns)
 *  - Max 12,000 total chars across all messages (fits comfortably in 4k-8k context models)
 *  - Oldest messages are trimmed first (most recent context preserved)
 *  - Each message content is hard-capped at 1,000 chars to stop one huge message
 *    from eating the entire context window
 *  - System prompt is always prepended as the first message
 *  - Streaming / failed / empty messages are never included
 */

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARS    = 12_000;
const MAX_MSG_CHARS        = 1_000;

const SYSTEM_PROMPT =
  `You are Butler AI — a friendly, intelligent PC assistant running entirely on the user's local PC via Ollama.\n` +
  `You handle everything: Python scripts, PC troubleshooting, casual conversation, and technical questions.\n\n` +
  `CONVERSATIONAL BEHAVIOR:\n` +
  `- Respond naturally to greetings, small talk, or casual questions ("hi", "how are you", "thanks")\n` +
  `- Interpret vague or poorly worded requests by inferring intent — state your assumption clearly\n` +
  `- If a request is truly ambiguous, ask ONE focused clarifying question\n\n` +
  `SCRIPT BEHAVIOR:\n` +
  `- Always write COMPLETE, runnable Python scripts with all imports included\n` +
  `- Format code in triple-backtick python blocks\n` +
  `- Include pip install commands for any non-standard library\n` +
  `- Verify mentally: does every import exist? Will it run without errors?\n` +
  `- Add inline comments explaining what each section does\n` +
  `- Never use placeholder comments like "# your code here" — always complete the implementation`;

export interface ContextMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

/** A minimal Message shape — accepts both butler.tsx and any other format */
export interface MessageLike {
  role:      string;
  content?:  string;
  text?:     string;       // alternate field name used by some components
  streaming?: boolean;
  failed?:   boolean;
}

/**
 * Build the trimmed context array to send to Ollama.
 * Always returns at least the system message.
 */
export function buildOllamaMessages(messages: MessageLike[]): ContextMessage[] {
  const system: ContextMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  // 1. Filter to conversation turns only — exclude system, tool, streaming, empty
  const turns = messages
    .filter(m => {
      if (m.streaming || m.failed)          return false;
      if (m.role === 'system' || m.role === 'tool') return false;
      const body = m.content ?? m.text ?? '';
      return body.length > 0;
    })
    .slice(-MAX_CONTEXT_MESSAGES)
    .map(m => ({
      role:    (m.role === 'butler' || m.role === 'assistant') ? 'assistant' : 'user',
      content: (m.content ?? m.text ?? '').slice(0, MAX_MSG_CHARS),
    } as ContextMessage));

  // 2. Trim oldest messages until total chars ≤ MAX_CONTEXT_CHARS
  let total = SYSTEM_PROMPT.length;
  const kept: ContextMessage[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    total += turns[i].content.length;
    if (total > MAX_CONTEXT_CHARS) break;
    kept.unshift(turns[i]);
  }

  return [...system, ...kept];
}

/**
 * Convenience: returns just the history array (no system prompt).
 * Use this when the system prompt is sent separately.
 */
export function buildHistoryOnly(messages: MessageLike[]): ContextMessage[] {
  const all = buildOllamaMessages(messages);
  return all.filter(m => m.role !== 'system');
}
