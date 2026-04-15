import crypto from 'crypto';
import type { Platform } from '@/lib/generated/prisma';

if (!process.env.FACEBOOK_CLIENT_SECRET) {
  // Lazily checked at runtime, not module load, so tests can import without env
}

// ── Signature Verification ────────────────────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on a Meta webhook POST request.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody  Raw request body as a Buffer (must be read BEFORE any JSON parsing)
 * @param signatureHeader  Value of the `x-hub-signature-256` header
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!secret) throw new Error('FACEBOOK_CLIENT_SECRET is not set');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Header format: "sha256=<hex>"
  const receivedSignature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch {
    // Buffer lengths differ — invalid signature
    return false;
  }
}

// ── Parsed Comment Data ───────────────────────────────────────────────────────

export interface ParsedComment {
  commentId: string;
  postId: string;
  pageId: string;
  authorName: string;
  authorId: string;
  commentText: string;
  isReply: boolean;
  platform: Platform;
}

// ── Facebook Event Parsing ────────────────────────────────────────────────────

interface FacebookWebhookChange {
  value: {
    item: string;
    verb: string;
    comment_id: string;
    post_id: string;
    parent_id?: string;
    message: string;
    from: { name: string; id: string };
    created_time: number;
  };
  field: string;
}

interface FacebookWebhookEntry {
  id: string; // Page ID
  time: number;
  changes: FacebookWebhookChange[];
}

export function parseFacebookWebhookEvent(entry: FacebookWebhookEntry): ParsedComment | null {
  if (!entry.changes?.length) return null;

  const change = entry.changes[0];
  const value = change.value;

  // Only process new top-level comments on posts
  if (value.item !== 'comment') return null;
  if (value.verb !== 'add') return null;
  if (value.parent_id) return null; // Skip replies to comments

  return {
    commentId: value.comment_id,
    postId: value.post_id,
    pageId: entry.id,
    authorName: value.from?.name ?? 'Unknown',
    authorId: value.from?.id ?? '',
    commentText: value.message ?? '',
    isReply: false,
    platform: 'FACEBOOK',
  };
}

// ── Instagram Event Parsing ───────────────────────────────────────────────────

interface InstagramWebhookChange {
  value: {
    id: string; // Comment ID
    text: string;
    media: { id: string; media_product_type?: string };
    from: { id: string; username: string };
    parent_id?: string;
    timestamp: string;
  };
  field: string;
}

interface InstagramWebhookEntry {
  id: string; // Instagram User/Account ID
  time: number;
  changes: InstagramWebhookChange[];
}

export function parseInstagramWebhookEvent(entry: InstagramWebhookEntry): ParsedComment | null {
  if (!entry.changes?.length) return null;

  const change = entry.changes[0];
  const value = change.value;

  if (change.field !== 'comments') return null;
  if (value.parent_id) return null; // Skip replies

  return {
    commentId: value.id,
    postId: value.media?.id ?? '',
    pageId: entry.id,
    authorName: value.from?.username ?? 'Unknown',
    authorId: value.from?.id ?? '',
    commentText: value.text ?? '',
    isReply: false,
    platform: 'INSTAGRAM',
  };
}

// ── Unified Event Parser ──────────────────────────────────────────────────────

export type WebhookBody =
  | { object: 'page'; entry: FacebookWebhookEntry[] }
  | { object: 'instagram'; entry: InstagramWebhookEntry[] };

/**
 * Parse all comments from a raw webhook body (already JSON.parsed).
 * Returns an array of parsed comments, filtering out non-comment events.
 */
export function parseWebhookComments(body: WebhookBody): ParsedComment[] {
  const comments: ParsedComment[] = [];

  if (!body.entry?.length) return comments;

  if (body.object === 'page') {
    for (const entry of body.entry as FacebookWebhookEntry[]) {
      const comment = parseFacebookWebhookEvent(entry);
      if (comment) comments.push(comment);
    }
  } else if (body.object === 'instagram') {
    for (const entry of body.entry as InstagramWebhookEntry[]) {
      const comment = parseInstagramWebhookEvent(entry);
      if (comment) comments.push(comment);
    }
  }

  return comments;
}
