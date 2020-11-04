#!/usr/bin/env node

import fs from 'fs';

import defaultCodeTemplates from '@NutBerry/rollup-bricks/src/bricked/lib/defaultCodeTemplates.js';
import typedData from '../typedData.js';

(async function () {
  const { builder, challengeCode, debugCode } = await defaultCodeTemplates({ typedData, contractName: 'GovBrick' });
  const baseDir = import.meta.url.split('/').slice(2, -2).join('/');

  console.log(builder.info());
  fs.writeFileSync(`${baseDir}/contracts/GovBrickChallenge.sol`, challengeCode);
})(); 
