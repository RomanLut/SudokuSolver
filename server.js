const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { runSolver } = require('./sudorules');

const PORT = Number(process.env.PORT) || 3004;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload, null, 2));
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

async function serveStatic(res, requestPath) {
    const decodedPath = decodeURIComponent(requestPath);
    const safePath = decodedPath === '/' ? '/index.html' : decodedPath;
    const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

    if (!filePath.startsWith(PUBLIC_DIR)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) {
            sendJson(res, 404, { error: 'Not found' });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        fs.createReadStream(filePath).pipe(res);
    } catch {
        sendJson(res, 404, { error: 'Not found' });
    }
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (req.method === 'POST' && url.pathname === '/api/solve') {
            const body = await readRequestBody(req);
            const payload = body ? JSON.parse(body) : {};
            const result = await runSolver(payload.puzzle);
            sendJson(res, 200, result);
            return;
        }

        if (req.method === 'GET') {
            await serveStatic(res, url.pathname);
            return;
        }

        sendJson(res, 405, { error: 'Method not allowed' });
    } catch (error) {
        sendJson(res, 500, {
            error: error instanceof Error ? error.message : String(error),
        });
    }
});

server.listen(PORT, () => {
    console.log(`SudokuSolver running at http://localhost:${PORT}/`);
});
