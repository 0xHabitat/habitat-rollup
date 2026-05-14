# Habitat Rollup Architecture

## Overview

Habitat is an **optimistic rollup** Layer 2 solution built on Ethereum, powered by the [NutBerry](https://github.com/NutBerry/NutBerry) rollup framework. It provides a scalable, low-cost environment for community governance, token transfers, and on-chain voting.

The system operates as an application-specific rollup — it bundles user transactions (transfers, votes, proposals) off-chain and periodically submits state roots to Ethereum L1, where they can be challenged during an inspection period.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Users / DApps                      │
│            (MetaMask, Web UI, API Clients)            │
└──────────────────────┬───────────────────────────────┘
                       │ EIP-712 Signed Transactions
                       ▼
┌──────────────────────────────────────────────────────┐
│                 NutBerry Rollup Node                  │
│              (L2 Block Producer)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Tx Pool     │→ │ Block Builder│→ │ State Mgmt  │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │ Submit State Root
                       ▼
┌──────────────────────────────────────────────────────┐
│              Ethereum L1 (Root Chain)                 │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────┐ │
│  │ RollupProxy  │  │ Bridge / Vault │  │ Staking  │ │
│  │ (State Root) │  │ (Deposits)     │  │ Pool     │ │
│  └──────────────┘  └────────────────┘  └──────────┘ │
└──────────────────────────────────────────────────────┘
```

## Core Components

### 1. Smart Contracts (`src/rollup/contracts/`)

The rollup logic is implemented as a set of Solidity contracts that compose into the main `HabitatV1` contract:

| Contract | Description |
|----------|-------------|
| **HabitatV1.sol** | Main entry point — composes all modules into a single rollup contract |
| **HabitatBase.sol** | Global state management, storage helpers, epoch/nonce utilities |
| **HabitatAccount.sol** | Account management and username claiming |
| **HabitatWallet.sol** | Token transfer handling within L2 |
| **HabitatVERC20.sol** | Virtual ERC-20 token support (L2-native tokens) |
| **HabitatCommunity.sol** | Community creation and management |
| **HabitatVault.sol** | Treasury/vault management for communities |
| **HabitatVoting.sol** | Proposal creation, voting, and execution |
| **HabitatModule.sol** | Extensible module system for custom actions |
| **HabitatStakingPool.sol** | Staking rewards and fee distribution |
| **HabitatV1Challenge.sol** | Fraud proof / challenge mechanism |
| **UpgradableRollup.sol** | Rollup upgrade logic |
| **RollupProxy.sol** | Proxy pattern for the rollup contract |
| **IBridge.sol** | Interface for L1↔L2 bridge operations |

**Key Parameters:**
- `MAX_BLOCK_SIZE`: 31,744 bytes
- `INSPECTION_PERIOD`: 43,200 blocks (~7 days)
- `INSPECTION_PERIOD_MULTIPLIER`: 3x
- `SECONDS_PER_EPOCH`: 604,800 (7 days)
- `STAKING_POOL_FEE_DIVISOR`: 100 (1% fee on operator tributes)

### 2. Token Contracts (`src/token/contracts/`)

| Contract | Description |
|----------|-------------|
| **HabitatToken.sol** | The HBT governance token |
| **CommunityReservePipe.sol** | Community reserve token flows |
| **DropletWrapper.sol** | Wrapper for token "droplets" (fractional units) |
| **TokenTurner.sol** | Token conversion/exchange logic |
| **MultiCallHelper.sol** | Batch multiple calls in a single transaction |
| **Utilities.sol** | Shared token utilities |

### 3. NutBerry Rollup Node

The rollup node is provided by the `@NutBerry/NutBerry` dependency. It handles:
- **Transaction collection**: Receives EIP-712 signed transactions from users
- **Block production**: Bundles transactions into L2 blocks
- **State management**: Maintains the L2 state trie
- **L1 submission**: Posts state roots to the root chain contract
- **RPC endpoint**: Exposes an Ethereum-compatible JSON-RPC on port 8111

### 4. Bridge (L1 ↔ L2)

The bridge enables asset transfers between Ethereum L1 and the Habitat L2:

- **Deposits**: Users deposit ERC-20 tokens into the L1 bridge contract; tokens are minted on L2
- **Withdrawals**: Users initiate exits on L2; after the challenge period, funds are released on L1
- The `IBridge` interface defines `deposit()` and `executionPermit()` methods

### 5. Web Interface (`web/`)

A browser-based DApp providing:
- Community management UI
- Proposal creation and voting interface
- Token management dashboard
- Block explorer

### 6. Evolution Backend (`backends/evolution/`)

A Node.js service providing:
- Community and governance data aggregation
- Discord integration (`discord.mjs`)
- Operator monitoring (`operator.mjs`)
- Notification/paging (`pager.mjs`)
- Typed data utilities (`typedData.mjs`)

## Transaction Flow

1. **User signs transaction** — EIP-712 typed data with Habitat-specific types
2. **Transaction submitted** to the NutBerry node via JSON-RPC
3. **Node validates** the transaction against current rollup state
4. **Block produced** — transactions bundled into an L2 block
5. **State root submitted** to L1 `RollupProxy` contract
6. **Inspection period begins** — validators can challenge incorrect state
7. **After inspection** — state is finalized, withdrawals can be claimed

## Supported Transaction Types

Defined in `src/rollup/habitatV1.js`:

| Type | Description |
|------|-------------|
| `TransferToken` | Transfer tokens between L2 accounts |
| `ClaimUsername` | Claim a unique username |
| `CreateCommunity` | Create a new governance community |
| `CreateVault` | Create a community treasury vault |
| `CreateProposal` | Create a governance proposal |
| `VoteOnProposal` | Vote on an active proposal |
| `ProcessProposal` | Finalize and execute a proposal |
| `TributeForOperator` | Pay tribute to the rollup operator |
| `DelegateAmount` | Delegate voting power |
| `ClaimStakingReward` | Claim earned staking rewards |
| `ModifyRollupStorage` | Governance-authorized storage fixes |
| `CreateVirtualERC20` | Create a new virtual ERC-20 token |

## Challenge Mechanism

Habitat uses an optimistic rollup challenge system:

1. After a block is submitted, there's a **7-day inspection period** (43,200 L1 blocks)
2. Any party can submit a **fraud proof** via `HabitatV1Challenge`
3. If the challenge succeeds, the invalid block is reverted
4. The challenge period multiplier (3x) may extend the window for contested blocks
5. The challenge implementation is stored in a separate contract at `_CHALLENGE_IMPLEMENTATION_ADDRESS`

## Security Model

- **Permissionless validation**: Anyone can run a validator and challenge invalid blocks
- **Economic security**: Operators stake tokens; malicious behavior results in slashing
- **Upgrade governance**: `ROLLUP_MANAGER` controls contract upgrades (currently a multisig, planned migration to community governance)
- **Nonce-based replay protection**: Each account maintains a transaction nonce
- **Proposal delay**: 32-hour minimum delay between proposal creation and voting start
