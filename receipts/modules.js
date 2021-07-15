import fs from 'fs';
import assert from 'assert';
import ethers from 'ethers';
import { toMeta, wallet, layer1, layer2, sendTransaction, deploy } from './utils.js';

const OneThirdParticipationThreshold = JSON.parse(fs.readFileSync('./build/contracts/OneThirdParticipationThreshold.json'));
const SevenDayVoting = JSON.parse(fs.readFileSync('./build/contracts/SevenDayVoting.json'));
const FeatureFarmSignaling = JSON.parse(fs.readFileSync('./build/contracts/FeatureFarmSignaling.json'));
const TwoThirdVotingThreshold = JSON.parse(fs.readFileSync('./build/contracts/TwoThirdVotingThreshold.json'));

function fixDoc (str) {
  let ret = str;

  while (true) {
    const tmp = ret.replace('. ', '.\n');
    if (tmp === ret) {
      break;
    }
    ret = tmp;
  }

  return ret;
}

export const MODULES = [
  {
    artefact: OneThirdParticipationThreshold,
    metadata: {
      flavor: 'signal',
      version: 1,
      name: '1/3 Participation Threshold',
      details: fixDoc(OneThirdParticipationThreshold.userdoc.notice),
    },
  },
  {
    artefact: SevenDayVoting,
    metadata: {
      flavor: 'binary',
      version: 1,
      name: 'Seven Day Voting - Simple Majority Voting',
      details: fixDoc(SevenDayVoting.userdoc.notice),
    },
  },
  {
    artefact: FeatureFarmSignaling,
    metadata: {
      flavor: 'signal',
      version: 1,
      name: 'Feature Farm Signaling Module',
      details: fixDoc(FeatureFarmSignaling.userdoc.notice),
    },
  },
  {
    artefact: TwoThirdVotingThreshold,
    metadata: {
      flavor: 'binary',
      version: 1,
      name: 'Multisig-like, 2/3 TVL voting threshold',
      details: fixDoc(TwoThirdVotingThreshold.userdoc.notice),
    },
  }
];

const blockN = await layer2.provider.getBlockNumber();
for (const module of MODULES) {
  // deploy
  module.contractAddress = (await deploy(module.artefact, [], wallet)).address;
  // register module
  const args = [
    1,
    module.contractAddress,
    ethers.utils.keccak256(await layer1.provider.getCode(module.contractAddress)),
    toMeta(module.metadata)
  ];
  const tx = await layer1.registerModule(...args);
  console.log(tx.hash, 'registerModule', ...args);
  const receipt = await tx.wait();
  assert.equal(receipt.status, '0x1', 'transaction successful');
}

while (await layer2.provider.getBlockNumber() < blockN + MODULES.length) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
