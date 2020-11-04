export default {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ],
    // Transactions that can be replayed need nonces.
    // Other transaction types revert if replayed.
    InitMoloch: [
      { name: 'nonce', 'type': 'uint256' },
      { name: 'summoner', type: 'address' },
      { name: 'approvedToken', type: 'address' },
      { name: 'periodDuration', type: 'uint256' },
      { name: 'votingPeriod', type: 'uint256' },
      { name: 'gracePeriod', type: 'uint256' },
      { name: 'abortWindow', type: 'uint256' },
      { name: 'dilutionBound', type: 'uint256' },
      { name: 'summoningTime', type: 'uint256' },
    ],
    SubmitProposal: [
      { name: 'nonce', type: 'uint256' },
      { name: 'startingPeriod', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'details', type: 'string' },
      { name: 'actions', type: 'bytes' },
    ],
    SubmitVote: [
      { name: 'proposalIndex', type: 'uint256' },
      { name: 'uintVote', type: 'uint8' },
    ],
    ProcessProposal: [
      { name: 'proposalIndex', type: 'uint256' },
    ],
    Ragequit: [
      { name: 'nonce', type: 'uint256' },
      { name: 'sharesToBurn', type: 'uint256' },
    ],
    Abort: [
      { name: 'proposalIndex', type: 'uint256' },
    ],
    UpdateDelegateKey: [
      { name: 'nonce', type: 'uint256' },
      { name: 'newDelegateKey', type: 'address' },
    ],
  },
  domain: {
    name: 'GovBrick',
    version: '1',
  },
  primaryTypes: [
    'InitMoloch',
    'SubmitProposal',
    'SubmitVote',
    'ProcessProposal',
    'Ragequit',
    'Abort',
    'UpdateDelegateKey',
  ],
}
