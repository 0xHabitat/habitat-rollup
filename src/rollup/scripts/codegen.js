#!/usr/bin/env node

import fs from 'fs';
import defaultCodeTemplates from '@NutBerry/NutBerry/src/v1/lib/defaultCodeTemplates.js';

for (const typedDataPath of ['../habitatV1.js']) {
  const typedData = (await import(typedDataPath)).default;
  const contractName = typedData.domain.name.split(' ').join('');
  const { builder, challengeCode, debugCode } = await defaultCodeTemplates({ typedData, contractName });
  const baseDir = import.meta.url.split('/').slice(2, -2).join('/');

  console.log(builder.info());
  fs.writeFileSync(`${baseDir}/contracts/${contractName}Challenge.sol`, challengeCode);
}
