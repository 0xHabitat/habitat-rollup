import ethers from 'ethers';
import fs from 'fs';
import assert from 'assert';

import TransactionBuilder from '@NutBerry/rollup-bricks/dist/TransactionBuilder.js';
import TYPED_DATA from './../src/rollup/habitatV1.js';
import { Bridge, startServer } from '@NutBerry/rollup-bricks/dist/bricked.js';
import { encodeInternalProposalActions, encodeExternalProposalActions } from './../src/rollup/test/utils.js';
import { getDeployCode } from './../src/rollup/lib/utils.js';

const builder = new TransactionBuilder(TYPED_DATA);

export async function sendTransaction (primaryType, message, signer, bridge) {
  if (message.nonce === undefined && builder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await bridge.txNonces(signer.address)).toHexString();
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

  let contract = await _factory.deploy(...args, txOverrides);
  let tx = await contract.deployTransaction.wait();

  return contract;
}

export const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
export const wallet = new ethers.Wallet(
  process.env.PRIV_KEY || '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200',
  rootProvider
);

const HabitatV1Testnet = JSON.parse(fs.readFileSync('./build/contracts/HabitatV1Testnet.json'));
const RollupProxy = JSON.parse(fs.readFileSync('./build/contracts/RollupProxy.json'));
const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));
const ERC20 = JSON.parse(fs.readFileSync('./build/contracts/TestERC20.json'));
const configPath = process.argv[2];
export const config = {};
if (!fs.existsSync(configPath)) {
  const implementation = await deploy(HabitatV1Testnet, [], wallet);
  const proxy = await deploy(RollupProxy, [implementation.address], wallet);
  config.bridgeL1 = (new ethers.Contract(proxy.address, HabitatV1Testnet.abi, wallet)).address;
  config.execProxy = (await deploy(ExecutionProxy, [config.bridgeL1], wallet)).address;
  config.erc20 = (await deploy(ERC20, [], wallet)).address;
  fs.writeFileSync(configPath, JSON.stringify(config));
} else {
  Object.assign(config, JSON.parse(fs.readFileSync(configPath)));
}
export const bridgeL1 = new ethers.Contract(config.bridgeL1, HabitatV1Testnet.abi, wallet);
export const erc20 = new ethers.Contract(config.erc20, ERC20.abi, wallet);
{
  const br = new Bridge(
    {
      debugMode: true,
      privKey: wallet._signingKey().privateKey,
      rootRpcUrl: process.env.ROOT_RPC_URL,
      contract: bridgeL1.address,
      typedData: TYPED_DATA
    }
  );
  await startServer(br, { host: '0.0.0.0', rpcPort: 8111 });
  await br.init();

  // try to forward the chain at a interval
  setInterval(async () => {
    await br.forwardChain();
    // forward
    //await br.directReplay(BigInt((await bridgeL1.finalizedHeight()).add(1)));
  }, 3000);
}
export const layer2 = bridgeL1.connect(new ethers.providers.JsonRpcProvider('http://localhost:8111'));
