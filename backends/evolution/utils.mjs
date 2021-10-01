import https from 'https';
import { parse } from 'url';
import { ethers } from 'ethers';

const FETCH_TIMEOUT_MS = 10000;

export async function fetch (url, headers, payload, methodOverride) {
  return new Promise(
    function (resolve, reject) {
      const options = parse(url);
      options.headers = { 'user-agent': 'curl/7.64.1' };
      options.method = methodOverride || (payload ? 'POST' : 'GET');
      if (headers) {
        Object.assign(options.headers, headers);
      }

      const req = https.request(url, options);
      req.setTimeout(FETCH_TIMEOUT_MS, () => req.abort());
      req.on('error', reject);
      req.on('socket', (socket) => socket.setTimeout(FETCH_TIMEOUT_MS));
      req.on('response', function (resp) {
        let data = '';
        resp.on('data', function (buf) {
          data += buf.toString();
        });
        resp.on('end', function () {
          resolve(data);
        });
      });
      req.end(payload);
    }
  );
}

export function replaceAll (str, a, b) {
  let ret = str;

  while (true) {
    const tmp = ret.replace(a, b)

    if (ret === tmp) {
      break;
    }

    ret = tmp;
  }

  return ret;
}

export async function fetchJson (url, method, params, overrides = {}) {
  const resp = await ethers.utils.fetchJson(
    url,
    JSON.stringify(Object.assign({ jsonrpc: '2.0', id: 1, method, params }, overrides))
  );
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  return resp.result;
}
