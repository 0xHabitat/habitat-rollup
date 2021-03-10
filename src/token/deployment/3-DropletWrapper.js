import { Artifacts, deploy, wallet, network } from './lib.js';

const { DropletWrapperMainnet } = Artifacts;
const contract = await deploy(DropletWrapperMainnet, wallet);
