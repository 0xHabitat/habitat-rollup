import fs from 'fs';
import assert from 'assert';
import { getDeployCode } from './../src/rollup/lib/utils.js';
import { wallet, layer2, sendTransaction, deploy } from './utils.js';

const OneThirdParticipationThreshold = JSON.parse(fs.readFileSync('./build/contracts/OneThirdParticipationThreshold.json'));
const SevenDayVoting = JSON.parse(fs.readFileSync('./build/contracts/SevenDayVoting.json'));
const FeatureFarmSignaling = JSON.parse(fs.readFileSync('./build/contracts/FeatureFarmSignaling.json'));
export const MODULES = [
  {
    artefact: OneThirdParticipationThreshold,
    metadata: {
      flavor: 'signal',
      name: '1/3 Participation Threshold',
      details: 'A nice explainer...',
    },
  },
  {
    artefact: SevenDayVoting,
    metadata: {
      flavor: 'binary',
      name: 'Seven Day Voting - Simple Majority Voting',
      details: 'A nice explainer...',
    },
  },
  {
    artefact: FeatureFarmSignaling,
    metadata: {
      flavor: 'signal',
      name: 'Feature Farm Signaling Module',
      details: 'A nice explainer...',
    },
  },
];

for (const module of MODULES) {
  const bytecode = getDeployCode(module.artefact.deployedBytecode);
  // deploy
  module.contractAddress = (await deploy({ bytecode, abi: [] }, [], wallet)).address;
  // register module
  const args = {
    contractAddress: module.contractAddress,
    metadata: JSON.stringify(module.metadata),
  };
  const { txHash, receipt } = await sendTransaction('SubmitModule', args, wallet, layer2);
  assert.equal(receipt.status, '0x1', 'transaction successful');
}
