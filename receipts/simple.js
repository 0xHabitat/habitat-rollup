import ethers from 'ethers';
import fs from 'fs';

import TransactionBuilder from '@NutBerry/rollup-bricks/dist/TransactionBuilder.js';
import { Bridge, startServer } from '@NutBerry/rollup-bricks/dist/bricked.js';

import TYPED_DATA from './../src/govBrick/typedData.js';
import { encodeProposalActions } from './../src/govBrick/test/utils.js';

const builder = new TransactionBuilder(TYPED_DATA);

async function sendTransaction (primaryType, message, signer, bridge) {
  if (message.nonce === undefined && builder.fieldNames[primaryType][0].name === 'nonce') {
    message.nonce = (await bridge.nonces(signer.address)).toHexString();
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

  return { txHash, receipt };
}

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
  const GovBrick = JSON.parse(fs.readFileSync('./build/contracts/GovBrick.json'));
  const ExecutionProxy = JSON.parse(fs.readFileSync('./build/contracts/ExecutionProxy.json'));
  const ERC20 = JSON.parse(fs.readFileSync('./build/contracts/TestERC20.json'));
  //
  const rootRpcUrl = process.env.ROOT_RPC_URL;
  const rootProvider = new ethers.providers.JsonRpcProvider(process.env.ROOT_RPC_URL);
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8111');
  const wallet = new ethers.Wallet(privKey, rootProvider);
  //
  const bridgeL1 = await deploy(GovBrick, [], wallet);
  const execProxy = await deploy(ExecutionProxy, [bridgeL1.address], wallet);
  const erc20 = await deploy(ERC20, [], wallet);

  console.log({ bridge: bridgeL1.address, executionProxy: execProxy.address, erc20: erc20.address, privKey });

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
    // edit the config file
    const path = './web/.config.js';
    const config = fs.readFileSync(path).toString().split('\n').filter((e) => e.indexOf('EXECUTION_PROXY_ADDRESS') === -1);
    config.push(`export const EXECUTION_PROXY_ADDRESS = '${execProxy.address}';`);
    console.log(config);
    fs.writeFileSync(
      './web/config.js',
      config.join('\n')
    );

    // try to forward the chain at a interval
    setInterval(async () => {
      await br.forwardChain();
      // forward
      await br.directReplay(BigInt((await bridgeL1.finalizedHeight()).add(1)));
    }, 1000);
  }
  //
  const bridgeL2 = bridgeL1.connect(provider);

  {
    const args = {
      summoner: wallet.address,
      approvedToken: erc20.address,
      periodDuration: 1,
      votingPeriod: 30,
      gracePeriod: 1,
      abortWindow: 1,
      dilutionBound: 1,
      summoningTime: ~~(Date.now() / 1000),
    };

    const { txHash, receipt } = await sendTransaction('InitMoloch', args, wallet, bridgeL2);
    // submit block
    await provider.send('debug_submitBlock', []);
  }

  {
    // deposit
    const amount = '0xffffffff';
    const oldBlock = await provider.getBlockNumber();
    let tx = await erc20.approve(bridgeL1.address, amount);
    let receipt = await tx.wait();

    tx = await bridgeL1.deposit(erc20.address, amount, wallet.address);
    receipt = await tx.wait();

    // wait for deposit block to arrive
    let nBlock = await provider.getBlockNumber();
    while (oldBlock === nBlock) {
      nBlock = await provider.getBlockNumber();
    }
  }

  {
    const args = {
      startingPeriod: 1,
      title: 'hello alice',
      details: 'Hello World',
      actions: '0x',
    };

    const { txHash, receipt } = await sendTransaction('SubmitProposal', args, wallet, bridgeL2);
  }

  {
    const args = {
      startingPeriod: 1,
      title: 'hello 👋',
      details: 'Hello World\nFoo the bar. Wrong proposal actions are attached',
      actions: '0xff',
    };

    const { txHash, receipt } = await sendTransaction('SubmitProposal', args, wallet, bridgeL2);
  }

  {
    const args = {
      startingPeriod: 1,
      title: 'hello 👋',
      details: 'Hello World2\nFoo the bar. Correct proposal actions are attached',
      actions: encodeProposalActions([bridgeL1.address, bridgeL1.interface.encodeFunctionData('MAX_BLOCK_SIZE', [])]),
    };

    const { txHash, receipt } = await sendTransaction('SubmitProposal', args, wallet, bridgeL2);

    // vote yes
    await sendTransaction('SubmitVote', { uintVote: 1, proposalIndex: 2 }, wallet, bridgeL2);
  }
}

main();
