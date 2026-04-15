/**
 * Typed wrapper around the Meta Graph API v21.0.
 * All comment operations use Page Access Tokens — never User tokens.
 * Instagram does not support hiding comments; delete spam instead.
 */

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

class MetaApiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly subcode?: number
  ) {
    super(message);
    this.name = 'MetaApiClientError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json() as T & { error?: MetaApiError };
  if (!res.ok || ('error' in data && data.error)) {
    const err = (data as { error?: MetaApiError }).error;
    throw new MetaApiClientError(
      err?.message ?? `HTTP ${res.status}`,
      err?.code,
      err?.error_subcode
    );
  }
  return data;
}

// ── Comment Operations ──────────────────────────────────────────────────────

/** Reply to a Facebook comment. Returns the new comment ID. */
async function replyToFacebookComment(
  commentId: string,
  message: string,
  pageAccessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/${commentId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: pageAccessToken }),
  });
  const data = await handleResponse<{ id: string }>(res);
  return data.id;
}

/** Reply to an Instagram comment using the /replies endpoint. Returns the new comment ID. */
async function replyToInstagramComment(
  commentId: string,
  message: string,
  pageAccessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/${commentId}/replies`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: pageAccessToken }),
  });
  const data = await handleResponse<{ id: string }>(res);
  return data.id;
}

/** Delete a comment (works for both Facebook and Instagram). */
async function deleteComment(
  commentId: string,
  pageAccessToken: string
): Promise<boolean> {
  const url = `${META_BASE_URL}/${commentId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: pageAccessToken }),
  });
  const data = await handleResponse<{ success: boolean }>(res);
  return data.success === true;
}

/** Hide a Facebook comment. Instagram does NOT support this — delete instead. */
async function hideComment(
  commentId: string,
  pageAccessToken: string
): Promise<boolean> {
  const url = `${META_BASE_URL}/${commentId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_hidden: true, access_token: pageAccessToken }),
  });
  const data = await handleResponse<{ success: boolean }>(res);
  return data.success === true;
}

// ── Post/Media Content (for project detection) ───────────────────────────────

/** Fetch the message/text of a Facebook post. Returns empty string on failure. */
async function getFacebookPostMessage(
  postId: string,
  pageAccessToken: string
): Promise<string> {
  try {
    const url = new URL(`${META_BASE_URL}/${postId}`);
    url.searchParams.set('fields', 'message,story,name');
    url.searchParams.set('access_token', pageAccessToken);

    const res = await fetch(url.toString());
    const data = await handleResponse<{ message?: string; story?: string; name?: string }>(res);
    return data.message || data.story || data.name || '';
  } catch {
    return ''; // Graceful fallback — reply without post context
  }
}

/** Fetch the caption of an Instagram media post. Returns empty string on failure. */
async function getInstagramMediaCaption(
  mediaId: string,
  pageAccessToken: string
): Promise<string> {
  try {
    const url = new URL(`${META_BASE_URL}/${mediaId}`);
    url.searchParams.set('fields', 'caption');
    url.searchParams.set('access_token', pageAccessToken);

    const res = await fetch(url.toString());
    const data = await handleResponse<{ caption?: string }>(res);
    return data.caption || '';
  } catch {
    return '';
  }
}

// ── Webhook Subscription ─────────────────────────────────────────────────────

/** Subscribe a Facebook Page to receive webhook events (feed + comments). */
async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<boolean> {
  const url = `${META_BASE_URL}/${pageId}/subscribed_apps`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscribed_fields: ['feed', 'mention'],
      access_token: pageAccessToken,
    }),
  });
  const data = await handleResponse<{ success: boolean }>(res);
  return data.success === true;
}

// ── Token Exchange ───────────────────────────────────────────────────────────

/** Exchange a short-lived user access token for a 60-day long-lived token. */
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
  if (!process.env.FACEBOOK_CLIENT_ID) throw new Error('FACEBOOK_CLIENT_ID is not set');
  if (!process.env.FACEBOOK_CLIENT_SECRET) throw new Error('FACEBOOK_CLIENT_SECRET is not set');

  const url = new URL(`${META_BASE_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.FACEBOOK_CLIENT_ID);
  url.searchParams.set('client_secret', process.env.FACEBOOK_CLIENT_SECRET);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = await handleResponse<{ access_token: string; expires_in?: number }>(res);
  return data.access_token;
}

/** Get all Facebook Pages managed by the user, including linked Instagram accounts. */
async function getManagedPages(longLivedUserToken: string): Promise<Array<{
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
  access_token: string;
  instagram_business_account?: {
    id: string;
    name: string;
    profile_picture_url?: string;
  };
}>> {
  const url = new URL(`${META_BASE_URL}/me/accounts`);
  url.searchParams.set('access_token', longLivedUserToken);
  url.searchParams.set(
    'fields',
    'id,name,picture,access_token,instagram_business_account{id,name,profile_picture_url}'
  );

  const res = await fetch(url.toString());
  const data = await handleResponse<{ data: Array<{
    id: string;
    name: string;
    picture?: { data?: { url?: string } };
    access_token: string;
    instagram_business_account?: { id: string; name: string; profile_picture_url?: string };
  }>}>(res);
  return data.data;
}

export const metaClient = {
  replyToFacebookComment,
  replyToInstagramComment,
  deleteComment,
  hideComment,
  getFacebookPostMessage,
  getInstagramMediaCaption,
  subscribePageToWebhooks,
  exchangeForLongLivedToken,
  getManagedPages,
};

export { MetaApiClientError };
export { META_BASE_URL, META_API_VERSION };
