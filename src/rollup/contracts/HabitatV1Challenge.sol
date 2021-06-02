
contract HabitatV1Challenge {
  /// @dev Challenge the solution or just verify the next pending block directly.
  function _onChallenge (uint256 challengeOffset) internal {
    // all power the core protocol
    require(msg.sender == address(this));

    assembly {
      
function _parseTransaction (o) -> success, offset {
  // zero memory
  calldatacopy(0, calldatasize(), msize())
  offset := o

  let v := byte(0, calldataload(offset))
  offset := add(offset, 1)
  let r := calldataload(offset)
  offset := add(offset, 32)
  let s := calldataload(offset)
  offset := add(offset, 32)
  let primaryType := byte(0, calldataload(offset))
  offset := add(offset, 1)

  switch primaryType

// start of TransferToken
// typeHash: 0xf121759935d81b9588e8434983e70b870ab10987a39b454ac893e1480f028e46
// function: onTransferToken(address,uint256,address,address,uint256)
case 0 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of TransferToken
  mstore(0, 0xf121759935d81b9588e8434983e70b870ab10987a39b454ac893e1480f028e46)
  // uint256 TransferToken.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address TransferToken.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address TransferToken.to
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 TransferToken.value
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 160)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(352, 0x11d4aec1)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of TransferToken

// start of ClaimUsername
// typeHash: 0x8b505a1c00897e3b1949f8e114b8f1a4cdeed6d6a26926931f57f885f33f6cfa
// function: onClaimUsername(address,uint256,bytes32)
case 1 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of ClaimUsername
  mstore(0, 0x8b505a1c00897e3b1949f8e114b8f1a4cdeed6d6a26926931f57f885f33f6cfa)
  // uint256 ClaimUsername.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes32 ClaimUsername.shortString
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0x0827bab8)
  mstore(256, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of ClaimUsername

// start of CreateCommunity
// typeHash: 0x4b8e81699d7dc349aa2eca5d6740c23aff4244d26288627f4ca3be7d236f5127
// function: onCreateCommunity(address,uint256,address,bytes)
case 2 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of CreateCommunity
  mstore(0, 0x4b8e81699d7dc349aa2eca5d6740c23aff4244d26288627f4ca3be7d236f5127)
  // uint256 CreateCommunity.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address CreateCommunity.governanceToken
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes CreateCommunity.metadata
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 128)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0x5b292e29)
  mstore(320, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 316, sub(endOfSlot, 316), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateCommunity

// start of CreateVault
// typeHash: 0xd039a4c4cd9e9890710392eef9936bf5d690ec47246e5d6f4693c764d6b62635
// function: onCreateVault(address,uint256,bytes32,address,bytes)
case 3 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of CreateVault
  mstore(0, 0xd039a4c4cd9e9890710392eef9936bf5d690ec47246e5d6f4693c764d6b62635)
  // uint256 CreateVault.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes32 CreateVault.communityId
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address CreateVault.condition
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes CreateVault.metadata
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(128, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 160)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(352, 0x9617e0c5)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateVault

// start of SubmitModule
// typeHash: 0xb9d41eae8b3cfe47bbf999b0c3182fe59b7cc2c28bb712fdb7de4aa9821639ec
// function: onSubmitModule(address,uint256,address,bytes)
case 4 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of SubmitModule
  mstore(0, 0xb9d41eae8b3cfe47bbf999b0c3182fe59b7cc2c28bb712fdb7de4aa9821639ec)
  // uint256 SubmitModule.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address SubmitModule.contractAddress
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes SubmitModule.metadata
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 128)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0x2c894020)
  mstore(320, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 316, sub(endOfSlot, 316), 0, 0)
  success := or(success, returndatasize())
}
// end of SubmitModule

// start of CreateProposal
// typeHash: 0x4d8a9f544d08772d597445c015580bcc93a38fd87bcf6be01f7b542ccdb97814
// function: onCreateProposal(address,uint256,uint256,address,bytes,bytes,bytes)
case 5 {
  let headSize := 224
  let typeLen := 0
  let txPtr := 512
  let endOfSlot := add(txPtr, 224)

  txPtr := 544
  // typeHash of CreateProposal
  mstore(0, 0x4d8a9f544d08772d597445c015580bcc93a38fd87bcf6be01f7b542ccdb97814)
  // uint256 CreateProposal.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 CreateProposal.startDate
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address CreateProposal.vault
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes CreateProposal.internalActions
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(128, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // bytes CreateProposal.externalActions
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(160, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // bytes CreateProposal.metadata
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(192, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 224)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(480, 0x9cc39bbe)
  mstore(512, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 508, sub(endOfSlot, 508), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateProposal

// start of VoteOnProposal
// typeHash: 0xeedce560579f8160e8bbb71ad5823fb1098eee0d1116be92232ee87ab1bce294
// function: onVoteOnProposal(address,uint256,bytes32,uint256,address,uint8)
case 6 {
  let headSize := 192
  let typeLen := 0
  let txPtr := 448
  let endOfSlot := add(txPtr, 192)

  txPtr := 480
  // typeHash of VoteOnProposal
  mstore(0, 0xeedce560579f8160e8bbb71ad5823fb1098eee0d1116be92232ee87ab1bce294)
  // uint256 VoteOnProposal.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes32 VoteOnProposal.proposalId
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 VoteOnProposal.shares
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address VoteOnProposal.delegatedFor
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint8 VoteOnProposal.signalStrength
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(160, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 192)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(416, 0xd87eafef)
  mstore(448, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 444, sub(endOfSlot, 444), 0, 0)
  success := or(success, returndatasize())
}
// end of VoteOnProposal

// start of ProcessProposal
// typeHash: 0xb4da110edbcfa262bdf7849c0e02e03ed15ced328922eca5a0bc1c547451b4af
// function: onProcessProposal(address,uint256,bytes32,bytes,bytes)
case 7 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of ProcessProposal
  mstore(0, 0xb4da110edbcfa262bdf7849c0e02e03ed15ced328922eca5a0bc1c547451b4af)
  // uint256 ProcessProposal.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes32 ProcessProposal.proposalId
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes ProcessProposal.internalActions
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(96, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // bytes ProcessProposal.externalActions
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(128, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 160)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(352, 0x36b54032)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of ProcessProposal

// start of TributeForOperator
// typeHash: 0x1d7f2e50c4a73ada77cc1796f78f259a43e44d6d99adaf69a6628ef42c527df7
// function: onTributeForOperator(address,uint256,address,address,uint256)
case 8 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of TributeForOperator
  mstore(0, 0x1d7f2e50c4a73ada77cc1796f78f259a43e44d6d99adaf69a6628ef42c527df7)
  // uint256 TributeForOperator.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address TributeForOperator.operator
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address TributeForOperator.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 TributeForOperator.amount
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 160)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(352, 0x24fa29ea)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of TributeForOperator

// start of DelegateAmount
// typeHash: 0x7595f378ac19fee39d9d6a79a8240d32afae43c5943289e491976d85c9e9ad54
// function: onDelegateAmount(address,uint256,address,address,uint256)
case 9 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of DelegateAmount
  mstore(0, 0x7595f378ac19fee39d9d6a79a8240d32afae43c5943289e491976d85c9e9ad54)
  // uint256 DelegateAmount.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address DelegateAmount.delegatee
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address DelegateAmount.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 DelegateAmount.value
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 160)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(352, 0x1b5e17db)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of DelegateAmount

// start of ClaimStakingReward
// typeHash: 0x5b7e01fd1453024a599fa59870e9edca08c3468a89c0f132a921bebc95b3e11a
// function: onClaimStakingReward(address,uint256,address)
case 10 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of ClaimStakingReward
  mstore(0, 0x5b7e01fd1453024a599fa59870e9edca08c3468a89c0f132a921bebc95b3e11a)
  // uint256 ClaimStakingReward.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address ClaimStakingReward.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0x3242d952)
  mstore(256, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of ClaimStakingReward

// start of ModifyRollupStorage
// typeHash: 0x31a8f1b3e855fde3871d440618da073d0504133dc34db1896de6774ed15abb70
// function: onModifyRollupStorage(address,uint256,bytes)
case 11 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of ModifyRollupStorage
  mstore(0, 0x31a8f1b3e855fde3871d440618da073d0504133dc34db1896de6774ed15abb70)
  // uint256 ModifyRollupStorage.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes ModifyRollupStorage.data
  typeLen := shr(240, calldataload(offset))
  offset := add(offset, 2)
  mstore(txPtr, headSize)
  headSize := add(headSize, add( 32, mul( 32, div( add(typeLen, 31), 32 ) ) ))
  txPtr := add(txPtr, 32)
  mstore(endOfSlot, typeLen)
  endOfSlot := add(endOfSlot, 32)
  calldatacopy(endOfSlot, offset, typeLen)
  mstore(64, keccak256(endOfSlot, typeLen))
  endOfSlot := add(endOfSlot, mul( 32, div( add(typeLen, 31), 32 ) ))
  offset := add(offset, typeLen)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0x304ec29f98f26858cfb6274d5e19cdfa117eec7545a64cf0be2d71c917f6b43e)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0x10ea8892)
  mstore(256, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of ModifyRollupStorage
default { success := 1 }
}


      let blockSize := calldataload(36)
      let startOfBlockData := sub(calldatasize(), blockSize)
      let endOfBlockData := add(startOfBlockData, blockSize)
      challengeOffset := add(challengeOffset, startOfBlockData)

      // block-data is everything after the
      // function signature (4 bytes)
      // + block type (32 bytes)
      // + block size
      // + rounds
      // + witness
      // + block data

      // TODO: add batchDeposit support
      if eq(calldataload(4), 1) {
        // function onDeposit (address token, address owner, uint256 value) external
        mstore(0, 0x412c6d50)
        // owner
        mstore(64, shr(96, calldataload(startOfBlockData)))
        // token
        mstore(32, shr(96, calldataload(add(startOfBlockData, 20))))
        // value
        mstore(96, calldataload(add(startOfBlockData, 40)))

        let success := call(gas(), address(), 0, 28, 100, 0, 0)

        // block complete
        mstore(0, endOfBlockData)
        return(0, 32)
      }


      // TODO: witness
      let witnessOffset := 100
      let npairs := calldataload(witnessOffset)
      for { let i := 0 } lt(i, npairs) { i := add(i, 1) } {
        let key := calldataload(witnessOffset)
        witnessOffset := add(witnessOffset, 32)
        let val := calldataload(witnessOffset)
        witnessOffset := add(witnessOffset, 32)
        //sstore(key, val)
      }

      // iterate over the block data
      let rounds := calldataload(68)
      for { } lt(challengeOffset, endOfBlockData) { } {
        if iszero(rounds) {
          break
        }
        rounds := sub(rounds, 1)

        // if returndatasize > 0
        //   success; even if reverted
        // else
        //   out of gas?
        // TODO: the Bridge needs a global timeout,
        // otherwise it becomes possible that we spin here forever.
        let success, nextOffset := _parseTransaction(challengeOffset)

        if iszero(success) {
          break
        }
        challengeOffset := nextOffset
      }

      // if you do more stuff that doesn't fit into a single transaction,
      // then you can return false here. You have to keep track of progression.
      // Be aware, you may potentially miss the finalization deadline if this takes too long.
      // done
      mstore(0, sub(challengeOffset, startOfBlockData))
      return(0, 32)
    }
  }
}
