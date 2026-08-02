/**
 * Local/dev helper page. Supabase redirects here with tokens in the URL
 * fragment after Google OAuth; the page can copy a token without rendering it.
 */
export const GOOGLE_OAUTH_CALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google OAuth callback</title>
    <style>
      :root { color-scheme: dark light; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 2rem; max-width: 48rem; line-height: 1.45; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; }
      pre { white-space: pre-wrap; word-break: break-all; padding: 0.75rem; border: 1px solid #4443; border-radius: 0.5rem; }
      button { margin-top: 0.5rem; padding: 0.4rem 0.75rem; cursor: pointer; }
      .err { color: #c62828; }
      .ok { color: #2e7d32; }
    </style>
  </head>
  <body>
    <h1>Google OAuth callback</h1>
    <p id="status">Reading tokens from the redirect…</p>
    <button id="copy" type="button" disabled>Copy access token</button>
    <h2>Next</h2>
    <ol>
      <li>Paste the access token into Postman <code>accessToken</code>.</li>
      <li>Run <strong>Auth → Google → Complete Google Auth</strong>.</li>
    </ol>
    <script>
      (function () {
        const status = document.getElementById('status');
        const copyBtn = document.getElementById('copy');
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const query = new URLSearchParams(window.location.search);
        const error = params.get('error') || query.get('error');
        const errorDescription = params.get('error_description') || query.get('error_description');
        const accessToken = params.get('access_token');

        if (error) {
          status.className = 'err';
          status.textContent = 'OAuth failed: ' + error + (errorDescription ? ' — ' + errorDescription : '');
          return;
        }

        if (!accessToken) {
          status.className = 'err';
          status.textContent = 'No access_token in the URL. Confirm Google is enabled in Supabase and redirect URLs match.';
          return;
        }

        copyBtn.disabled = false;
        status.className = 'ok';
        status.textContent = 'Token captured. Copy it, then call Complete Google Auth.';

        copyBtn.addEventListener('click', async function () {
          try {
            await navigator.clipboard.writeText(accessToken);
            status.textContent = 'Copied access_token to clipboard.';
          } catch (err) {
            status.className = 'err';
            status.textContent = 'Copy failed — select the token manually.';
          }
        });
      })();
    </script>
  </body>
</html>
`;
