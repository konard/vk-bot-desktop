'use strict';

const http = require('http');

const CALLBACK_HOST = '127.0.0.1';
const CALLBACK_PORT = 26852;
const CALLBACK_PATH = '/vk-oauth';
const TOKEN_POST_PATH = '/vk-oauth/token';

function callbackPageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VK Bot Desktop token</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        color: #15211f;
        background: #f4f7f6;
      }
      main {
        width: min(520px, calc(100vw - 32px));
        padding: 28px;
        border: 1px solid #cbd8d4;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 22px 60px rgb(22 41 36 / 16%);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      p {
        margin: 0;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>VK Bot Desktop</h1>
      <p id="status">Reading VK token...</p>
    </main>
    <script>
      const status = document.getElementById('status');
      const params = new URLSearchParams(window.location.hash.slice(1));
      const token = params.get('access_token');
      if (!token) {
        status.textContent = 'No access token was returned. You can close this page and try again.';
      } else {
        fetch('${TOKEN_POST_PATH}', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token })
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error('Token handoff failed');
            }
            status.textContent = 'Token received. Return to VK Bot Desktop.';
            window.setTimeout(() => window.close(), 1000);
          })
          .catch(() => {
            status.textContent = 'Token could not be sent to VK Bot Desktop. Copy the full address from this page and paste it into the app.';
          });
      }
    </script>
  </body>
</html>`;
}

function readBody(request, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error('Request body is too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(body);
}

function startOauthCallbackServer({
  host = CALLBACK_HOST,
  port = CALLBACK_PORT,
  onToken,
} = {}) {
  if (typeof onToken !== 'function') {
    throw new TypeError('onToken callback is required');
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === 'GET' && url.pathname === CALLBACK_PATH) {
      send(response, 200, callbackPageHtml(), {
        'content-type': 'text/html; charset=utf-8',
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === TOKEN_POST_PATH) {
      try {
        const body = await readBody(request);
        const payload = JSON.parse(body || '{}');
        const token = String(payload.token || '').trim();
        if (!token) {
          send(response, 400, JSON.stringify({ ok: false }));
          return;
        }
        onToken(token);
        send(response, 200, JSON.stringify({ ok: true }), {
          'content-type': 'application/json; charset=utf-8',
        });
      } catch {
        send(response, 400, JSON.stringify({ ok: false }));
      }
      return;
    }

    send(response, 404, 'Not found', { 'content-type': 'text/plain' });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve({
        server,
        host,
        port: server.address().port,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
              } else {
                closeResolve();
              }
            });
          }),
      });
    });
  });
}

module.exports = {
  CALLBACK_HOST,
  CALLBACK_PATH,
  CALLBACK_PORT,
  TOKEN_POST_PATH,
  callbackPageHtml,
  startOauthCallbackServer,
};
