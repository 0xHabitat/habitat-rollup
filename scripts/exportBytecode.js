#!/usr/bin/env node

import fs from 'fs';

const bridgeCode = JSON.parse(fs.readFileSync('./build/contracts/GovBrick.json')).bytecode;
const proxyCode = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json')).bytecode;
const template = `export const BRIDGE_BYTECODE =\n  '${bridgeCode}';\n\nexport const EXECUTION_PROXY_BYTECODE =\n  '${proxyCode}';\n`;
fs.writeFileSync('web/mvp/wizard/bytecode.js', template);
