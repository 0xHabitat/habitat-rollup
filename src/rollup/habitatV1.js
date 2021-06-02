export default {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    // Transactions that can be replayed need nonces.
    // Other transaction types revert if replayed.
    TransferToken: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    ClaimUsername: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'shortString', type: 'bytes32' },
    ],
    CreateCommunity: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'governanceToken', type: 'address' },
      { name: 'metadata', type: 'bytes' },
    ],
    CreateVault: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'communityId', type: 'bytes32' },
      { name: 'condition', type: 'address' },
      { name: 'metadata', type: 'bytes' },
    ],
    SubmitModule: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'contractAddress', type: 'address' },
      { name: 'metadata', type: 'bytes' },
    ],
    CreateProposal: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'startDate', 'type': 'uint256' },
      { name: 'vault', type: 'address' },
      { name: 'internalActions', type: 'bytes' },
      { name: 'externalActions', type: 'bytes' },
      { name: 'metadata', type: 'bytes' },
    ],
    VoteOnProposal: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'proposalId', type: 'bytes32' },
      { name: 'shares', type: 'uint256' },
      { name: 'delegatedFor', type: 'address' },
      { name: 'signalStrength', type: 'uint8' },
    ],
    ProcessProposal: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'proposalId', type: 'bytes32' },
      { name: 'internalActions', type: 'bytes' },
      { name: 'externalActions', type: 'bytes' },
    ],
    TributeForOperator: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'operator', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    DelegateAmount: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'delegatee', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    ClaimStakingReward: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'token', 'type': 'address' },
    ],
    ModifyRollupStorage: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'data', 'type': 'bytes' },
    ],
  },
  domain: {
    name: 'Habitat V1',
    version: '1',
  },
  primaryTypes: [
    'TransferToken',
    'ClaimUsername',
    'CreateCommunity',
    'CreateVault',
    'SubmitModule',
    'CreateProposal',
    'VoteOnProposal',
    'ProcessProposal',
    'TributeForOperator',
    'DelegateAmount',
    'ClaimStakingReward',
    'ModifyRollupStorage',
  ],
}
