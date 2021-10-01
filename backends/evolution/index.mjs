import http from 'http';
import { deflateRawSync } from 'zlib';

import { getStats, getSignals, submitVote, updateConfig } from './evolution.mjs';
import { getGasTank, submitTransaction } from './operator.mjs';
import { handleRequest as handleDiscordRequest } from './discord.mjs';
import './pager.mjs';

const DEFAULT_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'origin, content-type, accept, x-requested-with',
  'access-control-max-age': '300',
  'content-type': 'application/json',
};
const DEFAULT_HEADERS_DEFLATE = Object.assign({ 'content-encoding': 'deflate' }, DEFAULT_HEADERS);
const REQUEST_HANDLERS = Object.create(null);
const MAX_REQUEST_LENGTH = 8 << 10;
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 8080;

async function startServer ({ host, port }) {
  async function onRequest (req, resp) {
    console.log(req.url);
    resp.sendDate = false;
    if (req.method !== 'GET' && req.method !== 'POST') {
      resp.writeHead(200, DEFAULT_HEADERS);
      resp.end();
      return;
    }

    let body = '';
    let requestPayload;
    if (req.method === 'POST') {
      const len = parseInt(req.headers['content-length'] || MAX_REQUEST_LENGTH);

      if (len > MAX_REQUEST_LENGTH) {
        resp.writeHead(413);
        resp.end();
        return;
      }

      req.on('data', function (buf) {
        body += buf.toString();

        // this is actually not correct but we also do not expect unicode
        if (body.length > len) {
          resp.abort();
        }
      });

      await new Promise(
        function (resolve, reject) {
          req.on('end', resolve);
          req.on('error', reject);
        }
      );
      try {
        requestPayload = JSON.parse(body);
      } catch (e) {
        console.log(e);
      }
    }

    const path = req.url.split('/');
    const func = REQUEST_HANDLERS[path[1]];
    const deflate = (req.headers['accept-encoding'] || '').indexOf('deflate') !== -1;
    let status = 200;
    let ret;
    try {
      if (!func) {
        throw new Error('teapot');
      }
      ret = JSON.stringify(await func(path.slice(2), requestPayload, body, req.headers));
    } catch (e) {
      console.log(e);
      status = 400;
      ret = `{"error":{"code":-32000,"message":"${e.message || ''}"}}`;
    }
    resp.writeHead(status, deflate ? DEFAULT_HEADERS_DEFLATE : DEFAULT_HEADERS);
    resp.end(deflate ? deflateRawSync(ret) : ret);
  }

  const server = new http.Server(onRequest);
  server.timeout = 10000;
  server.listen(port, host);

  console.log(`listening on ${host}:${port}`);
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
REQUEST_HANDLERS['stats'] = getStats;
REQUEST_HANDLERS['signals'] = getSignals;
REQUEST_HANDLERS['submitVote'] = submitVote;
REQUEST_HANDLERS['gasTank'] = getGasTank;
REQUEST_HANDLERS['submitTransaction'] = submitTransaction;
REQUEST_HANDLERS['discord'] = handleDiscordRequest;
await startServer({ host: HOST, port: PORT });
