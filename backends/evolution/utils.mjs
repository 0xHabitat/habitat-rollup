import https from 'https';
import { parse } from 'url';

const FETCH_TIMEOUT_MS = 10000;

export async function fetch (url, headers) {
  return new Promise(
    function (resolve, reject) {
      const options = parse(url);
      options.headers = { 'user-agent': 'curl/7.64.1' };
      if (headers) {
        Object.assign(options.headers, headers);
      }
      const req = https.get(options);
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
