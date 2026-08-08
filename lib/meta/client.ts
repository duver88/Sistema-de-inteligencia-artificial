/**
 * Typed wrapper around the Meta Graph API v21.0.
 * All comment operations use Page Access Tokens — never User tokens; for
 * Instagram accounts the token is the linked Facebook Page's token.
 * Platform differences: Instagram cannot edit comments, and hides them with
 * `hide` rather than Facebook's `is_hidden`.
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

/** Edit a comment published by the Page on Facebook. Instagram does NOT support editing comments. */
async function editFacebookComment(
  commentId: string,
  message: string,
  pageAccessToken: string
): Promise<void> {
  const url = `${META_BASE_URL}/${commentId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: pageAccessToken }),
  });
  await handleResponse<{ success: boolean }>(res);
}

/** Hide a Facebook comment (`is_hidden`). Instagram uses `hide` — see hideInstagramComment. */
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

/**
 * Hide an Instagram comment. Instagram DOES support hiding, but through a
 * different field than Facebook: `hide` instead of `is_hidden`. Requires
 * instagram_manage_comments. Never fall back to deleting — hiding and
 * deleting are different moderation decisions and deleting is irreversible.
 */
async function hideInstagramComment(
  commentId: string,
  pageAccessToken: string
): Promise<boolean> {
  const url = `${META_BASE_URL}/${commentId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hide: true, access_token: pageAccessToken }),
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

/** Unsubscribe the app from a Facebook Page's webhooks (stops event delivery). */
async function unsubscribePageFromWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<boolean> {
  // DELETE with the token as a query param (DELETE bodies are unreliable).
  const url = `${META_BASE_URL}/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url, { method: 'DELETE' });
  const data = await handleResponse<{ success: boolean }>(res);
  return data.success === true;
}

// NOTE: there is deliberately no per-Instagram-account subscription helper.
// `POST /{ig-user-id}/subscribed_apps` belongs to the Instagram API with
// Instagram Login and answers "(#3) Application does not have the capability to
// make this API call" for an app using Facebook Login, as ours does. In this
// flow Instagram comments are delivered through the app's App-Dashboard
// subscription to the `instagram` object plus the subscription of the LINKED
// PAGE (subscribePageToWebhooks above) — nothing else is needed or possible.

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
  editFacebookComment,
  hideComment,
  hideInstagramComment,
  getFacebookPostMessage,
  getInstagramMediaCaption,
  subscribePageToWebhooks,
  unsubscribePageFromWebhooks,
  getManagedPages,
};

export { MetaApiClientError };
export { META_BASE_URL, META_API_VERSION };
