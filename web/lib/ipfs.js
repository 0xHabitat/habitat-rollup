
async function _fetch (url, headers, payload) {
  const resp = await fetch(url, { body: Uint8Array.from(payload), method: 'POST', headers });
  const str = await resp.text();

  if (resp.status !== 200) {
    throw new Error(str);
  }

  return str;
}

export async function ipfsPush (url, files) {
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

  const ret = await _fetch(url, headers, data);
  return ret.split('\n').slice(0, -1).map((str) => JSON.parse(str));
}
