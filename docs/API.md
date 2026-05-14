# Habitat Rollup API Reference

## Overview

Habitat uses **EIP-712 typed data** for all L2 transactions. Users sign structured messages with their Ethereum private keys, and the rollup node processes them. The domain name is `"Habitat V1"`.

All transactions are submitted to the NutBerry node's JSON-RPC endpoint (default: `http://localhost:8111`).

## EIP-712 Domain

```json
{
  "name": "Habitat V1"
}
```

## Transaction Types

### TransferToken

Transfer tokens between L2 accounts.

```json
{
  "nonce": "uint256",
  "token": "address",
  "to": "address",
  "value": "uint256"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce (must match current on-chain nonce) |
| `token` | address | L2 token address to transfer |
| `to` | address | Recipient address |
| `value` | uint256 | Amount to transfer |

### ClaimUsername

Claim a unique username on the rollup.

```json
{
  "nonce": "uint256",
  "shortString": "bytes32"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `shortString` | bytes32 | Username encoded as bytes32 (max 32 chars) |

### CreateCommunity

Create a new governance community.

```json
{
  "nonce": "uint256",
  "governanceToken": "address",
  "metadata": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `governanceToken` | address | Address of the governance token (use `address(0)` for 1-token-1-vote) |
| `metadata` | bytes | ABI-encoded community metadata (name, description, etc.) |

### CreateVault

Create a community treasury vault.

```json
{
  "nonce": "uint256",
  "communityId": "bytes32",
  "condition": "address",
  "metadata": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `communityId` | bytes32 | ID of the parent community |
| `condition` | address | Access control condition contract (or `address(0)` for open) |
| `metadata` | bytes | ABI-encoded vault metadata |

### CreateProposal

Create a governance proposal within a vault.

```json
{
  "nonce": "uint256",
  "startDate": "uint256",
  "vault": "address",
  "internalActions": "bytes",
  "externalActions": "bytes",
  "metadata": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `startDate` | uint256 | Unix timestamp when voting begins (must be ≥ `block.timestamp + 32h`) |
| `vault` | address | Vault address the proposal belongs to |
| `internalActions` | bytes | ABI-encoded actions to execute on the rollup if approved |
| `externalActions` | bytes | ABI-encoded actions to execute on L1 if approved |
| `metadata` | bytes | ABI-encoded proposal metadata (title, description, etc.) |

### VoteOnProposal

Cast a vote on an active proposal.

```json
{
  "nonce": "uint256",
  "proposalId": "bytes32",
  "shares": "uint256",
  "delegatedFor": "address",
  "signalStrength": "uint8"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `proposalId` | bytes32 | ID of the proposal to vote on |
| `shares` | uint256 | Number of voting shares to use |
| `delegatedFor` | address | `address(0)` for direct vote, or address of the delegator |
| `signalStrength` | uint8 | Vote strength (0-100, where 100 = full support) |

### ProcessProposal

Finalize and execute an approved proposal.

```json
{
  "nonce": "uint256",
  "proposalId": "bytes32",
  "internalActions": "bytes",
  "externalActions": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `proposalId` | bytes32 | ID of the proposal to process |
| `internalActions` | bytes | Internal actions to execute |
| `externalActions` | bytes | External actions to execute |

### TributeForOperator

Pay a tribute (fee) to the rollup operator.

```json
{
  "nonce": "uint256",
  "operator": "address",
  "token": "address",
  "amount": "uint256"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `operator` | address | Operator address to pay |
| `token` | address | Token address for the tribute |
| `amount` | uint256 | Tribute amount |

> **Note:** 1% of the tribute goes to the staking pool (configurable via `STAKING_POOL_FEE_DIVISOR`).

### DelegateAmount

Delegate voting power to another address.

```json
{
  "nonce": "uint256",
  "delegatee": "address",
  "token": "address",
  "value": "uint256"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `delegatee` | address | Address receiving delegation |
| `token` | address | Token whose voting power is being delegated |
| `value` | uint256 | Amount to delegate |

### ClaimStakingReward

Claim accumulated staking rewards.

```json
{
  "nonce": "uint256",
  "token": "address",
  "sinceEpoch": "uint256"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `token` | address | Token address for reward claiming |
| `sinceEpoch` | uint256 | Epoch number to claim rewards from |

### ModifyRollupStorage

Governance-authorized storage modification (restricted).

```json
{
  "nonce": "uint256",
  "data": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `data` | bytes | ABI-encoded storage modification data |

### CreateVirtualERC20

Create a new virtual ERC-20 token on L2.

```json
{
  "nonce": "uint256",
  "factoryAddress": "address",
  "args": "bytes"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | uint256 | Account nonce |
| `factoryAddress` | address | Address of the VirtualERC20 factory |
| `args` | bytes | ABI-encoded token constructor arguments |

## Contract Interfaces

### IBridge

The L1↔L2 bridge interface:

```solidity
interface IBridge {
  /// @notice Check execution permit for a vault-proposal pair
  function executionPermit(address vault, bytes32 proposalId) external view returns (bytes32);

  /// @notice Deposit tokens from L1 to L2
  function deposit(address token, uint256 amountOrId, address receiver) external;
}
```

## Rollup Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_BLOCK_SIZE` | 31,744 bytes | Maximum L2 block size |
| `INSPECTION_PERIOD` | 43,200 blocks (~7 days) | Challenge window for submitted blocks |
| `INSPECTION_PERIOD_MULTIPLIER` | 3 | Challenge period extension factor |
| `EPOCH_GENESIS` | 1624406400 (2021-06-23) | Start of epoch 0 |
| `SECONDS_PER_EPOCH` | 604,800 (7 days) | Duration of one epoch |
| `STAKING_POOL_FEE_DIVISOR` | 100 | 1% fee on operator tributes |
| `_PROPOSAL_DELAY` | 115,200 seconds (32 hours) | Minimum delay before proposal voting starts |
| `ROLLUP_MANAGER` | Multisig address | Contract upgrade authority |

## JSON-RPC Endpoint

The NutBerry node exposes a standard Ethereum-compatible JSON-RPC:

```
POST http://localhost:8111
Content-Type: application/json
```

Standard methods:
- `eth_sendRawTransaction` — Submit signed transactions
- `eth_call` — Execute read-only calls
- `eth_getBalance` — Query account balance
- `eth_blockNumber` — Current block height
- `eth_getTransactionReceipt` — Transaction status

## Example: Transfer Tokens

```javascript
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8111');
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const domain = { name: 'Habitat V1' };
const types = {
  TransferToken: [
    { name: 'nonce', type: 'uint256' },
    { name: 'token', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
  ],
};

const tx = {
  nonce: 0,
  token: '0x0aCe32f6E87Ac1457A5385f8eb0208F37263B415',
  to: '0x1234567890123456789012345678901234567890',
  value: ethers.utils.parseUnits('10', 18),
};

const signature = await wallet._signTypedData(domain, types, tx);
// Submit signature + tx to the rollup node
```
