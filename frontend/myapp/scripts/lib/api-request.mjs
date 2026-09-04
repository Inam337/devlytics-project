/**
 * Minimal fetch helper for Node smoke/regression scripts.
 * @param {string} apiBase - origin without trailing slash
 */
export function createApiClient(apiBase) {
  const base = apiBase.replace(/\/$/, '');

  async function request(path, options = {}) {
    const url = `${base}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const text = await res.text();
    let body;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { status: res.status, body };
  }

  return { base, request };
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
