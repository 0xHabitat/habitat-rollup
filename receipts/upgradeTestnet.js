import ethers from 'ethers';
import fs from 'fs';
import assert from 'assert';

import { Bridge, startServer } from '@NutBerry/rollup-bricks/dist/bricked.js';
import TYPED_DATA from './../src/rollup/habitatV1.js';

async function deploy (artifact, args, wallet, txOverrides = {}) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  let contract = await _factory.deploy(...args, txOverrides);
  let tx = await contract.deployTransaction.wait();

  return contract;
}

async function main () {
  const privKey = '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200';
  //
  const HabitatV1Testnet = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Testnet.json'));
  //
  const rootRpcUrl = process.env.ROOT_RPC_URL;
  const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
  const wallet = new ethers.Wallet(privKey, rootProvider);
  //
  const configPath = process.argv[2];
  const config = JSON.parse(fs.readFileSync(configPath));
  const bridgeL1 = new ethers.Contract(config.bridgeL1, HabitatV1Testnet.abi, wallet);

  console.log({ bridge: bridgeL1.address });

  {
    const br = new Bridge(
      {
        debugMode: true,
        privKey,
        rootRpcUrl,
        contract: bridgeL1.address,
        typedData: TYPED_DATA
      }
    );
    await startServer(br, { host: '0.0.0.0', rpcPort: 8111 });
    await br.init();
  }

  {
    // upgrade
    const newImplementation = await deploy(HabitatV1Testnet, [], wallet);
    const tx = await bridgeL1.upgradeRollup(newImplementation.address);
    console.log({ txHash: tx.hash, newImplementation: newImplementation.address });
    const receipt = await tx.wait();
    console.log('done', receipt);
  }
}
main();
