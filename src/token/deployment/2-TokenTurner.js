import { Artifacts, deploy, wallet, network } from './lib.js';

const { TokenTurnerMainnet, TokenTurnerRopsten } = Artifacts;
const target = network === 'mainnet' ? TokenTurnerMainnet : TokenTurnerRopsten;
const tokenTurner = await deploy(target, wallet);
//const initialSupply = 2_000_000n * (10n**10n);
//await (await hbt.transfer(tokenTurner.address, initialSupply)).wait();
