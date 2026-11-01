import type { SessionSummary } from '../types';

const KEY = 'pawgress-sessions-v1';

export function loadSessions(): SessionSummary[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: SessionSummary) {
  const recordingsTrimmed = session.recording.slice(-600);
  const sessions = [{ ...session, recording: recordingsTrimmed }, ...loadSessions()].slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function clearSessions() {
  localStorage.removeItem(KEY);
}
