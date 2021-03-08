#!/usr/bin/env node

import fs from 'fs';

const dir = 'web/mvp';
const outPath = `${dir}files.js`;
const basePath = dir.endsWith('/') ? dir : dir + '/';
const files = [];
let todo = fs.readdirSync(basePath).map((e) => basePath + e);

while (todo.length) {
  const path = todo.pop();

  const stat = fs.statSync(path);
  if (stat.isDirectory()) {
    todo = todo.concat(fs.readdirSync(path).map((e) => path + '/' + e));
    continue;
  }

  const hiddenFile = path.indexOf('/.') !== -1;

  if (hiddenFile) {
    console.info(`ignoring: ${path}`);
    continue;
  }

  const key = path.replace(basePath, '/');
  files.push(key);
}

fs.writeFileSync(outPath, `export default ${JSON.stringify(files)}`);
console.log(`Written to ${outPath}`);
