import fs from 'fs';
import assert from 'assert';

import { deploy, wallet, layer1, layer2 } from './utils.js';

async function main () {
  const HabitatV1Testnet = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Testnet.json'));
  {
    // upgrade
    const newImplementation = await deploy(HabitatV1Testnet, [], wallet);
    const tx = await layer1.upgradeRollup(newImplementation.address);
    console.log({ txHash: tx.hash, newImplementation: newImplementation.address });
    const receipt = await tx.wait();
    console.log('done', receipt);
  }
}
main();
