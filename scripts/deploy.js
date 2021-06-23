#!/usr/bin/env node

import fs from 'fs';
import ethers from 'ethers';

const artifact = JSON.parse(fs.readFileSync(process.argv[2]));
const args = JSON.parse(process.argv[3]);

async function deploy (wallet, txOverrides, logFile) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  logFile.write(`deploying: ${artifact.contractName}...\n`);

  const contract = await _factory.deploy(...args, txOverrides);
  const tx = await contract.deployTransaction.wait();

  logFile.write(`\n
Contract: ${artifact.contractName}
  Address: ${contract.address}
  Transaction Hash: ${tx.transactionHash}
  Deployer: ${tx.from}
  Gas used: ${tx.gasUsed.toString()}
  Gas fee (ETH): ${ethers.utils.formatUnits(contract.deployTransaction.gasPrice.mul(tx.gasUsed), 'ether')}
  \n`);

  return { contract, tx, artifact };
}

(async function () {
  const mnemonic = process.env.MNEMONIC;
  const privKey = process.env.PRIV_KEY;
  const rpcUrl = process.env.ROOT_RPC_URL;
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const gasPrice = process.env.GAS_GWEI;
  const txOverrides = {};

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

  await deploy(wallet, txOverrides, process.stdout);
})();
