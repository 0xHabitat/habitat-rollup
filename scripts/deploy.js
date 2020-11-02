#!/usr/bin/env node

import fs from 'fs';
import ethers from 'ethers';

const GovBrick = JSON.parse(fs.readFileSync('./build/contracts/GovBrick.json'));
const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));

async function deploy (artifact, args, wallet, txOverrides, logFile) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  logFile.write(`deploying ${artifact.contractName}\n`);

  let contract = await _factory.deploy(...args, txOverrides);
  let tx = await contract.deployTransaction.wait();

  logFile.write(`\n
Contract: ${artifact.contractName}
  Address: ${contract.address}
  Transaction Hash: ${tx.transactionHash}
  Deployer: ${tx.from}
  Gas used: ${tx.gasUsed.toString()}
  Gas fee in Ether: ${ethers.utils.formatUnits(contract.deployTransaction.gasPrice.mul(tx.gasUsed), 'ether')}
  \n`);

  return { contract, tx, artifact };
}

(async function () {
  const mnemonic = process.env.MNEMONIC;
  const privKey = process.env.PRIV_KEY;
  const rpcUrl = process.env.ROOT_RPC_URL;
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const gasPrice = process.env.GAS_GWEI;
  const txOverrides = {
  };

  if (gasPrice) {
    txOverrides.gasPrice = ethers.utils.parseUnits(gasPrice, 'gwei');
  }

  let wallet;
  if (privKey) {
    wallet = new ethers.Wallet(privKey, provider);
  } else if (mnemonic) {
    wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  } else {
    wallet = provider.getSigner();
  }

  const { contract } = await deploy(GovBrick, [], wallet, txOverrides, process.stdout);
  await deploy(ExecutionProxy, [contract.address], wallet, txOverrides, process.stdout);
})();
