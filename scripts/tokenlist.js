#!/usr/bin/env node

import fs from 'fs';
import https from 'https';
import { parse } from 'url';

async function fetch (url, headers = {}, payload) {
  const fetchOptions = parse(url);
  const proto = https;

  fetchOptions.headers = headers;
  fetchOptions.method = payload ? 'POST' : 'GET';

  return new Promise(
    function (resolve, reject) {
      const req = proto.request(fetchOptions);
      let body = Buffer.alloc(0);

      req.on('error', reject);
      req.on('response', function (resp) {
        resp.on('data', function (buf) {
          body = Buffer.concat([body, buf]);
        });
        resp.on('end', function () {
          console.log(url, resp.statusCode);
          if (resp.statusCode !== 200) {
            return reject(body);
          }

          resolve(body);
        });
      });

      req.end(payload ? Buffer.from(payload) : null);
    }
  );
}

export async function ipfsPush (files) {
  const boundary = 'x';
  const headers = {
    'content-type': 'multipart/form-data; boundary=' + boundary,
  };
  const coder = new TextEncoder();
  let data = [];

  for (const f in files) {
    const payload = files[f];
    const filename = encodeURIComponent(f);
    const str = `--${boundary}\r\ncontent-disposition: form-data; name="file"; filename="${filename}"\r\ncontent-type: application/octet-stream\r\n\r\n`;
    const head = Array.from(coder.encode(str));
    const tail = Array.from(coder.encode('\r\n'));

    data = data.concat(head).concat(Array.from(payload)).concat(tail);
  }

  data = data.concat(Array.from(coder.encode('--' + boundary + '--\r\n')));

  const ret = await fetch(IPFS_ADD, headers, data);
  return ret.toString().split('\n').slice(0, -1).map((str) => JSON.parse(str));
}

const IPFS_ADD = 'https://ipfs.infura.io:5001/api/v0/add?pin=true&cid-version=1&hash=sha2-256';
const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/';

async function upload (token, compareList) {
  if (compareList) {
    const other = compareList.find((e) => e.address.toLowerCase() === token.address.toLowerCase());
    if (other && other.logoURI.startsWith(IPFS_GATEWAY)) {
      token.logoURI = other.logoURI;
      return;
    }
  }

  let uri = token.logoURI;
  if (!uri) {
    console.log('skipping logo', token.name);
    return;
  }
  if (uri.startsWith('ipfs')) {
    uri = uri.replace('ipfs://', IPFS_GATEWAY);
  }

  try {
    const img = await fetch(uri);
    //console.log({ size: img.length });

    const ret = await ipfsPush({ '_': img });
    const hash = ret[0].Hash;
    const newUrl = IPFS_GATEWAY + hash;

    token.logoURI = newUrl;
  } catch (e) {
    token.logoURI = '';
    console.log('error', token.name);
  }
}

const OUTPUT_PATH = './web/lib/tokenlist.json';
const data = JSON.parse(await fetch('https://zapper.fi/api/token-list'));
const compareList = JSON.parse(fs.readFileSync(OUTPUT_PATH)).tokens;
const ADDR_ZERO = '0x'.padEnd(42, '0');

data.tokens = data.tokens.filter((e) => e.address !== ADDR_ZERO);

const customTokens = [
  {
    address: '0x0ace32f6e87ac1457a5385f8eb0208f37263b415',
    chainId: 1,
    decimals: 10,
    logoURI: 'https://cloudflare-ipfs.com/ipfs/bafkreihghsudac5i7em6bmygdv4spwadez5h4h253afgqd4rsbgrhv6l3m',
    name: 'Habitat Token',
    symbol: 'HBT'
  },
  {
    address: '0x01c5abeb1a8ab4b2811d018037587d36b0c8b693',
    chainId: 1,
    decimals: 10,
    logoURI: '',
    name: 'Habitat Team Token',
    symbol: 'HTT'
  },
  {
    address: '0x78230e69d6e6449db1e11904e0bd81c018454d7a',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/leapdao_28.png',
    name: 'LeapToken',
    symbol: 'LEAP'
  },
  {
    address: '0xa023cca9de8486d867e8b2f7bfd133a96455f850',
    chainId: 1,
    decimals: 18,
    logoURI: 'ipfs://bafkreihghsudac5i7em6bmygdv4spwadez5h4h253afgqd4rsbgrhv6l3m',
    name: 'SushiSwap LP Token HBT-ETH',
    symbol: 'SLP-HBT-ETH'
  },
];

for (const token of customTokens) {
  const idx = data.tokens.findIndex((e) => e.address.toLowerCase() === token.address.toLowerCase());
  if (idx === -1) {
    console.log('add', token.name);
    data.tokens.push(token);
  } else {
    console.log('replace', token.name);
    data.tokens[idx] = token;
  }
}

for (let i = 0, len = data.tokens.length; i < len;) {
  const list = data.tokens.slice(i, i += 25);
  await Promise.all(list.map((e) => upload(e, compareList)));
  console.log(`${i} / ${len}`);
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
