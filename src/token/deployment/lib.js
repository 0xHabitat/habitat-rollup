import ethers from 'ethers';
import _Artifacts from '@NutBerry/NutBerry/src/common/Artifacts.js';

export async function deploy (artifact, wallet, ...args) {
  const _factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );
  const gwei = process.env.gwei || '2';
  console.log(`Deploying ${artifact.contractName} using ${gwei} gwei`);
  const contract = await _factory.deploy(...args, { gasPrice: ethers.utils.parseUnits(gwei, 'gwei') });
  console.log(`tx: ${contract.deployTransaction.hash}`);
  await contract.deployTransaction.wait();
  console.log(`Deployed ${artifact.contractName} ${contract.address}`);

  return contract;
}

export const Artifacts = _Artifacts;
export const network = process.env.network || 'ropsten';
export const privKey = process.env.key || '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750bcbd';
export const wallet = new ethers.Wallet(privKey, ethers.getDefaultProvider(network));
