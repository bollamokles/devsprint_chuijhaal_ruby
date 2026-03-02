const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Where each service actually lives (matches docker-compose)
const SERVICES = {
  identity: process.env.IDENTITY_URL || 'http://identity:3001',
  gateway:  process.env.GATEWAY_URL  || 'http://gateway:3000',
  notif:    process.env.NOTIF_URL    || 'http://notification:3004',
  stock:    process.env.STOCK_URL    || 'http://stock:3002',
  kitchen:  process.env.KITCHEN_URL  || 'http://kitchen:3003',
};

// Map incoming proxy paths to upstream services
// Frontend calls /api/identity/... -> identity service
// Frontend calls /api/gateway/...  -> gateway service  etc.
const PROXY_ROUTES = [
  { prefix: '/api/identity',    target: SERVICES.identity },
  { prefix: '/api/gateway',     target: SERVICES.gateway  },
  { prefix: '/api/notif',       target: SERVICES.notif    },
  { prefix: '/api/stock',       target: SERVICES.stock    },
  { prefix: '/api/kitchen',     target: SERVICES.kitchen  },
];

// Read HTML once at startup, patch the BASE URLs to go through our proxy
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Replace hardcoded localhost ports with proxied paths on same origin
html = html
  .replace(/['"]http:\/\/localhost:4001['"]/g, "'/api/identity'")
  .replace(/['"]http:\/\/localhost:4000['"]/g, "'/api/gateway'")
  .replace(/['"]http:\/\/localhost:4004['"]/g, "'/api/notif'")
  .replace(/['"]http:\/\/localhost:4002['"]/g, "'/api/stock'")
  .replace(/['"]http:\/\/localhost:4003['"]/g, "'/api/kitchen'");

// ── Proxy helper ──────────────────────────────────────────────────────────────
function proxyRequest(req, res, target, stripPrefix) {
  const url = new URL(target);
  const upstreamPath = req.url.slice(stripPrefix.length) || '/';

  const options = {
    hostname: url.hostname,
    port:     url.port || (url.protocol === 'https:' ? 443 : 80),
    path:     upstreamPath,
    method:   req.method,
    headers:  { ...req.headers, host: url.hostname },
  };

  // Fix content-length if body was modified (just delete it, upstream recalculates)
  delete options.headers['content-length'];

  const proto = url.protocol === 'https:' ? require('https') : http;

  const upstream = proto.request(options, (upstreamRes) => {
    // Pass SSE through without buffering
    if (upstreamRes.headers['content-type']?.includes('text/event-stream')) {
      res.writeHead(upstreamRes.statusCode, {
        ...upstreamRes.headers,
        'cache-control': 'no-cache',
        'x-accel-buffering': 'no',
        'access-control-allow-origin': '*',
      });
      upstreamRes.pipe(res);
      return;
    }

    res.writeHead(upstreamRes.statusCode, {
      ...upstreamRes.headers,
      'access-control-allow-origin': '*',
    });
    upstreamRes.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error(`Proxy error to ${target}${upstreamPath}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service unavailable', upstream: target }));
    }
  });

  req.pipe(upstream);
}

// ── Main server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { method, url } = req;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  // Proxy API routes
  for (const route of PROXY_ROUTES) {
    if (url.startsWith(route.prefix)) {
      proxyRequest(req, res, route.target, route.prefix);
      return;
    }
  }

  // Serve the HTML for everything else (SPA)
  if (method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Frontend server running on http://0.0.0.0:${PORT}`);
  console.log('Proxying to:');
  Object.entries(SERVICES).forEach(([k, v]) => console.log(`  /api/${k} -> ${v}`));
});
