import { getConfig } from '/lib/utils.js';
import HabitatCommunity from '/lib/HabitatCommunity.js';

const { EVOLUTION_SIGNAL_VAULT, EVOLUTION_ACTION_VAULT, EVOLUTION_COMMUNITY_ID } = getConfig();

export default class HabitatEvolution extends HabitatCommunity {
  constructor() {
    super();
  }

  async render () {
    this.communityId = EVOLUTION_COMMUNITY_ID;
    this.removeAttribute('controls');
    this.setTitle('Evolution of Habitat');
    this.vaults = {
      [EVOLUTION_SIGNAL_VAULT]: {
        type: 'Signal',
        title: 'Community Signals',
        details: 'Help Habitat grow and express your preferences. This area is about signaling your priority by adding HBT votes on single topics and their subtopics. To submit a new topic you need to hold at least 0.001% of the TVL of HBT.',
      },
      [EVOLUTION_ACTION_VAULT]: {
        type: 'Action',
        title: 'Rollup Governance',
        details: 'Vote on important rollup governance decisions with HBT tokens. Info: 7 day voting period with a 10% quorum of TVL (HBT) needed to pass. To submit a proposal you need to own 0.1% of HBT on the rollup (TVL).',
      }
    };
    this.actionVault = EVOLUTION_ACTION_VAULT;
    this.signalVault = EVOLUTION_SIGNAL_VAULT;

    return super.render();
  }
}
customElements.define('habitat-evolution', HabitatEvolution);
