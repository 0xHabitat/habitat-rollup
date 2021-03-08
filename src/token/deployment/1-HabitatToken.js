import { Artifacts, deploy, wallet, network } from './lib.js';

const { HabitatToken } = Artifacts;
const tokenTurner = await deploy(HabitatToken, wallet);
