#!/usr/bin/env node

import http from 'http';
import url from 'url';
import fs from 'fs';

function onRequest (req, resp) {
  let path = url.parse(req.url).pathname;
  const remoteAddr = req.socket.remoteAddress;

  console.log(remoteAddr, req.method, path);

  if (path.indexOf('..') !== -1) {
    resp.writeHead(500);
    resp.end();
    return;
  }

  path = path.slice(1) || 'index.html';

  let buf;
  if (fs.existsSync(path)) {
    try {
      buf = fs.readFileSync(path);
    } catch (e) {
      if (e.code === 'EISDIR') {
        path += '/index.html';
      } else {
        resp.writeHead(500);
        resp.end('500');
        return;
      }
    }

    try {
      buf = buf || fs.readFileSync(path);
    } catch (e) {
      resp.writeHead(404);
      resp.end('404');
      return;
    }

    if (path.endsWith('.js')) {
      resp.setHeader('content-type', 'application/javascript');
    } else if (path.endsWith('.svg')) {
      resp.setHeader('content-type', 'image/svg+xml');
    }

    resp.end(buf);
    return;
  }

  resp.writeHead(404);
  resp.end('404');
}

const httpServer = new http.Server(onRequest);
const host = process.env.HOST || 'localhost';
let port = 0;

process.on('SIGTERM', () => process.exit(0));
process.chdir('web/');
httpServer.listen(Number(process.env.PORT) || 8080, host, function () {
  port = this.address().port;
  console.log(`http://${host}:${port}`);
});
