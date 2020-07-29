#!/usr/bin/env node

import main from './bin.js';

(async function () {
  const { Bridge, startServer } = await import('./bricked.js');
  await main(Bridge, startServer);
})();
