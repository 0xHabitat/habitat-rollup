import { Artifacts, deploy, wallet, network } from './lib.js';
import repl from 'repl';

const { DropletWrapperMainnet } = Artifacts;
const ctx = repl.start().context;
ctx.DropletWrapperMainnet = DropletWrapperMainnet;
ctx.wallet = wallet;
