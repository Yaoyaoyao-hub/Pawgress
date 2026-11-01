import type { FeedbackEvent } from '../types';

export type DecisionResult = { source: 'local' | 'adapter'; message: string };

/**
 * Optional adapter boundary. The browser never receives a provider key: set
 * VITE_DECISIONS_PROXY_URL to your own same-origin credentialed proxy.
 */
export async function requestDecision(event: FeedbackEvent): Promise<DecisionResult> {
  const endpoint = import.meta.env.VITE_DECISIONS_PROXY_URL as string | undefined;
  if (!endpoint) return { source: 'local', message: event.message };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Decision adapter unavailable');
    const body = (await response.json()) as { message?: unknown };
    return {
      source: 'adapter',
      message: typeof body.message === 'string' ? body.message.slice(0, 180) : event.message,
    };
  } catch {
    return { source: 'local', message: event.message };
  } finally {
    window.clearTimeout(timeout);
  }
}
