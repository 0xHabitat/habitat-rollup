import ethers from 'ethers';
import fs from 'fs';
import assert from 'assert';
import { deflateRawSync } from 'zlib';

import TransactionBuilder from '@NutBerry/NutBerry/dist/TransactionBuilder.js';
import TYPED_DATA from './../src/rollup/habitatV1.js';
import { Bridge, startServer } from '@NutBerry/NutBerry/dist/node.js';
import { encodeInternalProposalActions, encodeExternalProposalActions } from './../src/rollup/test/utils.js';

const builder = new TransactionBuilder(TYPED_DATA);

export async function sendTransaction (primaryType, message, signer, bridge) {
  if (message.nonce === undefined && builder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await bridge.callStatic.txNonces(signer.address)).toHexString();
  }

  const tx = {
    primaryType,
    message,
  };
  const hash = builder.sigHash(tx);
  const { r, s, v } = signer._signingKey().signDigest(hash);

  Object.assign(tx, { r, s, v });

  const txHash = await bridge.provider.send('eth_sendRawTransaction', [tx]);
  const receipt = await bridge.provider.send('eth_getTransactionReceipt', [txHash]);
  const events = [];
  for (const log of receipt.logs) {
    try {
      const evt = bridge.interface.parseLog(log);
      events.push(evt);
    } catch (e) {
    }
  }

  return { txHash, receipt, events };
}

export async function deploy (artifact, args, wallet, txOverrides = {}) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  if (process.env.gwei) {
    txOverrides.gasPrice = BigInt(process.env.gwei) * (10n ** 9n);
  }

  let contract = await _factory.deploy(...args, txOverrides);
  console.log('deploying...', artifact.contractName);
  let tx = await contract.deployTransaction.wait();
  console.log(tx);

  return contract;
}

export const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
export const wallet = new ethers.Wallet(
  process.env.PRIV_KEY || '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200',
  rootProvider
);

const HabitatV1 = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Testnet.json'));
const RollupProxy = JSON.parse(fs.readFileSync('./build/contracts/RollupProxy.json'));
const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));
const ERC20 = JSON.parse(fs.readFileSync('./build/contracts/HabitatToken.json'));
const configPath = process.argv[2];

if (!configPath) {
  console.log(`invoke with ${process.argv[1]} path/to/config.json`);
  process.exit(1);
}

export const config = {};
if (!fs.existsSync(configPath)) {
  const implementation = await deploy(HabitatV1, [], wallet);
  const proxy = await deploy(RollupProxy, [implementation.address], wallet);
  config.layer1 = (new ethers.Contract(proxy.address, HabitatV1.abi, wallet)).address;
  config.execProxy = (await deploy(ExecutionProxy, [], wallet)).address;
  config.erc20 = (await deploy(ERC20, [], wallet)).address;
  fs.writeFileSync(configPath, JSON.stringify(config));
} else {
  Object.assign(config, JSON.parse(fs.readFileSync(configPath)));
}
export const layer1 = new ethers.Contract(config.layer1, HabitatV1.abi, wallet);
export const erc20 = new ethers.Contract(config.erc20, ERC20.abi, wallet);
{
  const br = new Bridge(
    {
      //debugMode: true,
      privKey: wallet._signingKey().privateKey,
      rootRpcUrl: process.env.ROOT_RPC_URL,
      contract: layer1.address,
      typedData: TYPED_DATA,
      submitSolutionThreshold: 1
    }
  );
  await startServer(br, { host: '0.0.0.0', rpcPort: 8111 });
  await br.init();

  // try to forward the chain at a interval
  async function forward () {
    try {
      const finalizedHeight = BigInt(await layer1.finalizedHeight());
      console.log({finalizedHeight});
      await br.forwardChain();
      if (br.debugMode) {
        await br.directReplay(finalizedHeight + 1n);
      }
    } catch (e) {
      console.error(e);
    }

    setTimeout(forward, 10000);
  }
  //forward();
}
export const layer2 = layer1.connect(new ethers.providers.JsonRpcProvider('http://localhost:8111'));

export function toMeta (obj) {
  return ethers.utils.hexlify(deflateRawSync(JSON.stringify(obj)));
}
