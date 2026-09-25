const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/** Base URL of the Express API, without a trailing slash. */
export const API_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

/**
 * `api`  - talk to the Node.js + MongoDB backend at VITE_API_URL.
 * `demo` - everything runs in the browser against localStorage (GitHub Pages).
 */
export const DATA_MODE: 'api' | 'demo' = API_URL ? 'api' : 'demo';

export const REPO_URL = 'https://github.com/Harsh3851/FinTrack';
export const README_URL = `${REPO_URL}#readme`;
