# Rollup Governance v1

The Habitat Rollup is governed and upgraded by the HBT token-holders. This includes technical upgrades, as well as fee structures and incentives. The initial first version (v1) of the Rollup Governance will help the Habitat community to propose, vote and implement changes to the shared infrastructure.

Starting with mainnet launch, governance will focus on controlling the reward structure and managing the operator fees. Within the first months, the Habitat genesis team stays involved in network and rollup governance for emergency situations and downtime assistance.

## xHBT

Members can take part in HBT Governance when they acquire HBT on the Ethereum Mainnet and deposit it on the Habitat Rollup. HBT is converted/wrapped to xHBT, which is essentially a staked version with voting power on the rollup governance, given out in a 1:1 ratio.

![img](assets/v1gov.png)

> Deposits enable Governance Participation

## Voting Modules

After mainnet launch, the HBT Community will have 2 voting modules to decide and vote about changes and receive signaling feedback for adjustments and incentives:

* **Signaling** - used in Feature Farms, deciding about app layer integrations.
  * Continous voting, no deadline
  * No quorum required

* **On-Chain Votes** - used for rollup upgrades and finalizing funding proposals.
  * 7 day voting period
  * 10% quorum required

![img](assets/votingmodules.png)

**Both initial Voting Modules share the same parameters:**

* `total member count `- how many users interacted at least once with the community?
* `total vote count` - how many votes have been submitted?
* `total voting shares` - total shares voted on a proposal
* `total signal` - determines yes/no by range of 1-100

The modules can be implemented by all communities on Habitat to govern their own DAO/Community.

### Voting/Staking on Proposals

It is not enough to “hold” the voting power, HBT tokens need to be placed and removed actively. Governance participants “stake” their tokens on proposals, therefore they need to be on the rollup and actively voted on an outcome to be counted into the final results.

Users will need to stake their tokens on proposals they vote on and want to support. So each time tokens need to be moved from one proposal to another, being staked and un-staked. This way Habitat ensures no “Double-Vote” fraud.

## Gas Tank

When landing on the rollup, users need to deposit a small amount of xHBT into the “Gas Tank”. This extra balance is responsible to pay the gas cost for users in xHBT.

> Voting Balance and Gas Balance are two different components/metrics.

## Proposing

Proposals have a simple and straight-forward format and can be used for signaling votes and for on-chain governance. Simply Create/Import Github Issues to Habitat, or simply insert a link to your proposal.

*A proposal shall include:*

* ID & title
* Markdown text
* Github link & tags

## Delegation

When HBT holders delegate votes, they assign their voting power to other delegates. Which allows them to form alliances and influence the outcome to their preference.

*Potential upcoming features for delegation:*

* Connect delegate address to Twitter & Github for social links
* Verification Tweet for further proof, until a decentralized identity solution is working.

## Minimum Proposer Balance

Delegation might be necessary to unite voting power and issue proposals, as a minimal HBT Proposer Balance is required to initiate votes.

![minproposerbalance](assets/minproposerbalance.png)