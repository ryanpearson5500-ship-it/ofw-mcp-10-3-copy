#!/usr/bin/env node
/**
 * Minimal HTTP status page for the ofw-mcp project.
 *
 * ofw-mcp is a stdio MCP server — it has no web frontend. This small server
 * exposes a status page on port 3000 so the preview can show the project is
 * built and running, list the available MCP tools, and surface credential
 * configuration state.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function getBuildInfo() {
  const distDir = join(__dirname, 'dist');
  const distExists = existsSync(distDir);
  let distFiles = [];
  if (distExists) {
    try {
      distFiles = readdirSync(distDir);
    } catch {}
  }
  return {
    distExists,
    distFiles,
    distFileCount: distFiles.length,
  };
}

function getToolInfo() {
  const manifest = readJson(join(__dirname, 'manifest.json'));
  const serverJson = readJson(join(__dirname, 'server.json'));
  return {
    name: manifest?.name ?? 'ofw-mcp',
    version: manifest?.version ?? 'unknown',
    displayName: manifest?.display_name ?? 'OurFamilyWizard MCP',
    description: manifest?.description ?? '',
    tools: manifest?.tools ?? [],
    serverDescription: serverJson?.description ?? '',
  };
}

function getCredentialStatus() {
  return {
    username: process.env.OFW_USERNAME ? 'configured' : 'not set',
    password: process.env.OFW_PASSWORD ? 'configured' : 'not set',
    fetchproxyDisabled: process.env.OFW_DISABLE_FETCHPROXY ? true : false,
    writeMode: process.env.OFW_WRITE_MODE ?? 'all (default)',
    allowMarkRead: process.env.OFW_ALLOW_MARK_READ ?? 'true (default)',
  };
}

function renderPage() {
  const info = getToolInfo();
  const build = getBuildInfo();
  const creds = getCredentialStatus();

  const toolRows = info.tools
    .map(
      (t, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td><code>${t.name}</code></td>
          <td>${t.description ?? ''}</td>
        </tr>`,
    )
    .join('');

  const buildBadge = build.distExists
    ? '<span class="badge ok">Built</span>'
    : '<span class="badge warn">Not built</span>';

  const credBadge =
    creds.username === 'configured' && creds.password === 'configured'
      ? '<span class="badge ok">Configured</span>'
      : '<span class="badge info">Optional — fetchproxy fallback available</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${info.displayName} — Status</title>
  <style>
    :root {
      --bg: #0f1117;
      --card: #1a1d27;
      --border: #2a2e3a;
      --text: #e1e4ec;
      --muted: #8b90a0;
      --accent: #6c8cff;
      --ok: #4ade80;
      --warn: #fbbf24;
      --info: #60a5fa;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2rem; }
    header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: .5rem; }
    header p { color: var(--muted); font-size: .95rem; }
    .badges { display: flex; gap: .5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    .badge {
      font-size: .75rem; font-weight: 600; padding: .25rem .6rem;
      border-radius: 999px; border: 1px solid transparent;
    }
    .badge.ok { background: rgba(74,222,128,.12); color: var(--ok); border-color: rgba(74,222,128,.3); }
    .badge.warn { background: rgba(251,191,36,.12); color: var(--warn); border-color: rgba(251,191,36,.3); }
    .badge.info { background: rgba(96,165,250,.12); color: var(--info); border-color: rgba(96,165,250,.3); }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: var(--accent); }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
    }
    .info-item { display: flex; flex-direction: column; gap: .2rem; }
    .info-item .label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    .info-item .value { font-size: .9rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .6rem .5rem; border-bottom: 1px solid var(--border); font-size: .85rem; }
    th { color: var(--muted); font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
    td.num { color: var(--muted); width: 2rem; }
    code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: .85rem; color: var(--accent); }
    .note {
      margin-top: 1rem; padding: .75rem 1rem; border-radius: 8px;
      background: rgba(96,165,250,.08); border: 1px solid rgba(96,165,250,.2);
      font-size: .8rem; color: var(--info); line-height: 1.5;
    }
    footer { text-align: center; margin-top: 2rem; color: var(--muted); font-size: .75rem; }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${info.displayName}</h1>
      <p>${info.description}</p>
      <div class="badges">
        ${buildBadge}
        <span class="badge info">v${info.version}</span>
        ${credBadge}
      </div>
    </header>

    <div class="card">
      <h2>Project Status</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Build</span>
          <span class="value">${build.distExists ? `✅ dist/ (${build.distFileCount} files)` : '❌ Not built — run npm run build'}</span>
        </div>
        <div class="info-item">
          <span class="label">Transport</span>
          <span class="value">stdio (JSON-RPC over stdin/stdout)</span>
        </div>
        <div class="info-item">
          <span class="label">OFW Username</span>
          <span class="value">${creds.username === 'configured' ? '✅ Set' : '⚠️ Not set'}</span>
        </div>
        <div class="info-item">
          <span class="label">OFW Password</span>
          <span class="value">${creds.password === 'configured' ? '✅ Set' : '⚠️ Not set'}</span>
        </div>
        <div class="info-item">
          <span class="label">Write Mode</span>
          <span class="value">${creds.writeMode}</span>
        </div>
        <div class="info-item">
          <span class="label">Allow Mark Read</span>
          <span class="value">${creds.allowMarkRead}</span>
        </div>
      </div>
      <div class="note">
        This is a <strong>stdio MCP server</strong> — it communicates with AI hosts
        (like Claude Desktop) over stdin/stdout, not HTTP. This page is a dev status
        surface showing the project is built and its configuration state. To use the
        actual MCP tools, add the server to your MCP host config.
      </div>
    </div>

    <div class="card">
      <h2>Available MCP Tools (${info.tools.length})</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Tool</th><th>Description</th></tr>
        </thead>
        <tbody>${toolRows}</tbody>
      </table>
    </div>

    <footer>
      ofw-mcp v${info.version} · MIT License · AI-developed project
    </footer>
  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}

const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    const build = getBuildInfo();
    res.writeHead(build.distExists ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: build.distExists ? 'ok' : 'building', dist: build.distExists }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderPage());
});

server.listen(PORT, HOST, () => {
  console.error(`[ofw-mcp] Status page running at http://${HOST}:${PORT}`);
});
