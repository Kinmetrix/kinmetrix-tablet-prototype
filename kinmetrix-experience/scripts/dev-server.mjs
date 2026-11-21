import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? '/index.html' : decoded;
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const abs = path.join(root, normalized);
  if (!abs.startsWith(root)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      const index = path.join(root, 'index.html');
      fs.readFile(index, (readErr, data) => {
        if (readErr) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {'Content-Type': types['.html']});
        res.end(data);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    fs.readFile(file, (readErr, data) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Error');
        return;
      }
      res.writeHead(200, {'Content-Type': types[ext] || 'application/octet-stream'});
      res.end(data);
    });
  });
});

server.listen(port, host, () => {
  console.log(`Kinmetrix experience at http://${host}:${port}/`);
});