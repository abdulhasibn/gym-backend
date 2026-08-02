#!/usr/bin/env node
/**
 * Enables Google OAuth on the linked Supabase Auth project via Management API.
 *
 * Required env (do not commit values):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   SUPABASE_ACCESS_TOKEN   — https://supabase.com/dashboard/account/tokens
 *
 * Optional:
 *   SUPABASE_PROJECT_REF    — defaults to igcmptpjmagzwoccxcnw
 *   SITE_URL                — defaults to http://127.0.0.1:3000
 *   REDIRECT_URLS           — comma-separated extra allow-list URLs
 */

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'igcmptpjmagzwoccxcnw';
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const siteUrl = process.env.SITE_URL ?? 'http://127.0.0.1:3000';
const extraRedirects = (process.env.REDIRECT_URLS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const required = {
  GOOGLE_OAUTH_CLIENT_ID: clientId,
  GOOGLE_OAUTH_CLIENT_SECRET: clientSecret,
  SUPABASE_ACCESS_TOKEN: accessToken,
};

for (const [name, value] of Object.entries(required)) {
  if (value === undefined || value.trim() === '') {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const callbackUrl = `${siteUrl.replace(/\/$/, '')}/auth/google/callback`;
const uriAllowList = Array.from(
  new Set([
    siteUrl.replace(/\/$/, ''),
    callbackUrl,
    'http://localhost:3000',
    'http://localhost:3000/auth/google/callback',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3000/auth/google/callback',
    ...extraRedirects,
  ]),
).join(',');

const body = {
  external_google_enabled: true,
  external_google_client_id: clientId,
  external_google_secret: clientSecret,
  site_url: siteUrl.replace(/\/$/, ''),
  uri_allow_list: uriAllowList,
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Supabase auth config update failed (${response.status})`);
  console.error(text);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = null;
}

console.log('Google OAuth enabled on Supabase Auth.');
console.log(`project_ref=${projectRef}`);
console.log(`external_google_enabled=${String(parsed?.external_google_enabled ?? true)}`);
console.log(`site_url=${siteUrl.replace(/\/$/, '')}`);
console.log('uri_allow_list includes local callback URLs');
console.log('');
console.log('Google Cloud Console checklist:');
console.log('  1. Create a Web application OAuth client');
console.log(`  2. Authorized JavaScript origins: ${siteUrl.replace(/\/$/, '')}`);
console.log(
  `  3. Authorized redirect URI: https://${projectRef}.supabase.co/auth/v1/callback`,
);
console.log('  4. Re-run this script if you rotate the client secret');
console.log('');
console.log('Verify flow:');
console.log(`  open ${siteUrl.replace(/\/$/, '')}/auth/google/start`);
console.log('  then POST /auth/google/complete with the captured access token');
