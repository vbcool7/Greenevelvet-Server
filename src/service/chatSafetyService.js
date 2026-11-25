import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";

// In-memory sliding window rate limiter: key = `${userId}:${sessionId}` -> timestamps[]
const rateLimitBuckets = new Map();

const MAX_MESSAGES_PER_WINDOW = Number(process.env.LIVECAM_CHAT_MAX_MSGS || 6);
const WINDOW_MS = Number(process.env.LIVECAM_CHAT_WINDOW_MS || 10000); // 10 seconds

const DEFAULT_BLOCKED_TERMS = [
  "scam",
  "telegram",
  "whatsapp only",
  "off-platform",
];

function getBlockedTerms() {
  const custom = (process.env.LIVECAM_BLOCKED_TERMS || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return custom.length ? custom : DEFAULT_BLOCKED_TERMS;
}

export function checkChatRateLimit(userId, sessionId) {
  const key = `${String(userId)}:${String(sessionId)}`;
  const now = Date.now();
  const timestamps = (rateLimitBuckets.get(key) || []).filter(
    (ts) => now - ts < WINDOW_MS,
  );

  if (timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    rateLimitBuckets.set(key, timestamps);
    return {
      allowed: false,
      reason: "RATE_LIMIT_EXCEEDED",
      message: "You are sending messages too fast. Please wait a few seconds.",
    };
  }

  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
  return { allowed: true };
}

export function filterProhibitedContent(text) {
  const normalized = (text || "").toLowerCase();
  const terms = getBlockedTerms();

  for (const term of terms) {
    if (term && normalized.includes(term)) {
      return {
        clean: false,
        reason: "PROHIBITED_CONTENT",
        message: "Message blocked by chat safety filter.",
      };
    }
  }

  return { clean: true, sanitized: text.trim() };
}

export async function isViewerChatSuspended(clientId) {
  if (!clientId) return false;
  const profile = await ViewerLiveProfileModel.findOne({ clientId })
    .select("chatSuspendedUntil")
    .lean();

  if (!profile?.chatSuspendedUntil) return false;
  return new Date(profile.chatSuspendedUntil) > new Date();
}
