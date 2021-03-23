
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

// start of ExitToken
// typeHash: 0x280db1a18159ff0dba5229472289dbde248095bb34cc33278bee768af6cb8338
// function: onExitToken(address,uint256,address,address,uint256)
case 1 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of ExitToken
  mstore(0, 0x280db1a18159ff0dba5229472289dbde248095bb34cc33278bee768af6cb8338)
  // uint256 ExitToken.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address ExitToken.token
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address ExitToken.to
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 ExitToken.value
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
  mstore(352, 0xe8614f53)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of ExitToken

// start of ClaimUsername
// typeHash: 0x8b505a1c00897e3b1949f8e114b8f1a4cdeed6d6a26926931f57f885f33f6cfa
// function: onClaimUsername(address,uint256,bytes32)
case 2 {
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

// start of SetDelegate
// typeHash: 0x0976e4734b23f68e97fb754289639f7cde00c4a9f7421cbb59eab25341131dab
// function: onSetDelegate(address,uint256,address)
case 3 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of SetDelegate
  mstore(0, 0x0976e4734b23f68e97fb754289639f7cde00c4a9f7421cbb59eab25341131dab)
  // uint256 SetDelegate.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address SetDelegate.to
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
  mstore(224, 0x718bb386)
  mstore(256, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of SetDelegate

// start of CreateCommunity
// typeHash: 0x444a86b501cf5285015cf7d602819c806ff2b6d3e9a36753c81e1bf24abaa94b
// function: onCreateCommunity(address,uint256,address,string)
case 4 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of CreateCommunity
  mstore(0, 0x444a86b501cf5285015cf7d602819c806ff2b6d3e9a36753c81e1bf24abaa94b)
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

  // string CreateCommunity.metadata
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
  mstore(288, 0x4cfd2251)
  mstore(320, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 316, sub(endOfSlot, 316), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateCommunity

// start of CreateVault
// typeHash: 0x6f70797b7bf84e5eb6136f9bba812b553d6bfd37e9b86a9016c12a59a9b58eaf
// function: onCreateVault(address,uint256,bytes32,address,string)
case 5 {
  let headSize := 160
  let typeLen := 0
  let txPtr := 384
  let endOfSlot := add(txPtr, 160)

  txPtr := 416
  // typeHash of CreateVault
  mstore(0, 0x6f70797b7bf84e5eb6136f9bba812b553d6bfd37e9b86a9016c12a59a9b58eaf)
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

  // string CreateVault.metadata
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
  mstore(352, 0xa37bbbe8)
  mstore(384, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 380, sub(endOfSlot, 380), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateVault

// start of SubmitModule
// typeHash: 0x93bc8b942cd55880fdda01bec4a1c33a292820f03e3e05a2465f868a5bf787de
// function: onSubmitModule(address,uint256,address)
case 6 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of SubmitModule
  mstore(0, 0x93bc8b942cd55880fdda01bec4a1c33a292820f03e3e05a2465f868a5bf787de)
  // uint256 SubmitModule.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address SubmitModule.src
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
  mstore(224, 0x69dafa9c)
  mstore(256, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of SubmitModule

// start of ActivateModule
// typeHash: 0x0bf485f0f9090f0baf2ad8ca67e39f883400e7d9ac7e650c5d5881244c934901
// function: onActivateModule(address,uint256,bytes32,address)
case 7 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of ActivateModule
  mstore(0, 0x0bf485f0f9090f0baf2ad8ca67e39f883400e7d9ac7e650c5d5881244c934901)
  // uint256 ActivateModule.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // bytes32 ActivateModule.communityId
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address ActivateModule.condition
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

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
  mstore(288, 0xacd8076a)
  mstore(320, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 316, sub(endOfSlot, 316), 0, 0)
  success := or(success, returndatasize())
}
// end of ActivateModule

// start of CreateProposal
// typeHash: 0x08ca432aed00b336d83523efc8c7f5b8ab9e19df5f8398f2b2f80a5a03598b37
// function: onCreateProposal(address,uint256,uint256,address,string,bytes)
case 8 {
  let headSize := 192
  let typeLen := 0
  let txPtr := 448
  let endOfSlot := add(txPtr, 192)

  txPtr := 480
  // typeHash of CreateProposal
  mstore(0, 0x08ca432aed00b336d83523efc8c7f5b8ab9e19df5f8398f2b2f80a5a03598b37)
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

  // string CreateProposal.title
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

  // bytes CreateProposal.actions
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
  mstore(416, 0xdf6d7010)
  mstore(448, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 444, sub(endOfSlot, 444), 0, 0)
  success := or(success, returndatasize())
}
// end of CreateProposal

// start of VoteOnProposal
// typeHash: 0xcd0d2ed69cafe403ad5d62cea78fc2ff2fbb6b25e6f5cf7b7f8404431a9308c7
// function: onVoteOnProposal(address,uint256,bytes32,uint8,uint256,uint256)
case 9 {
  let headSize := 192
  let typeLen := 0
  let txPtr := 448
  let endOfSlot := add(txPtr, 192)

  txPtr := 480
  // typeHash of VoteOnProposal
  mstore(0, 0xcd0d2ed69cafe403ad5d62cea78fc2ff2fbb6b25e6f5cf7b7f8404431a9308c7)
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

  // uint8 VoteOnProposal.signalStrength
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 VoteOnProposal.shares
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 VoteOnProposal.timestamp
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
  mstore(416, 0xf2f4279b)
  mstore(448, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 444, sub(endOfSlot, 444), 0, 0)
  success := or(success, returndatasize())
}
// end of VoteOnProposal

// start of ProcessProposal
// typeHash: 0x3d97852889670d5742fbda05f411e1657839476a097126030b1579df018c2374
// function: onProcessProposal(address,uint256)
case 10 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of ProcessProposal
  mstore(0, 0x3d97852889670d5742fbda05f411e1657839476a097126030b1579df018c2374)
  // uint256 ProcessProposal.proposalIndex
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
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
  mstore(160, 0x0a625af4)
  mstore(192, mload(128))

  success := call(sub(gas(), 5000), address(), 0, 188, sub(endOfSlot, 188), 0, 0)
  success := or(success, returndatasize())
}
// end of ProcessProposal
default { success := 1 }
}


      // 0x412c6d50
      // function onDeposit (address token, address owner, uint256 value) external
      // TODO: add batchDeposit support
      if eq(calldataload(4), 1) {
        mstore(0, 0x412c6d50)
        // owner
        mstore(64, shr(96, calldataload(36)))
        // token
        mstore(32, shr(96, calldataload(56)))
        // value
        mstore(96, calldataload(76))
        let success := call(gas(), address(), 0, 28, 100, 0, 0)
        mstore(0, calldatasize())
        return(0, 32)
      }

      // block-data is everything after the function signature (4 bytes) + block type (32 bytes)
      // let blockSize := sub(calldatasize(), 36)

      if iszero(challengeOffset) {
        challengeOffset := 36
      }

      // iterate over the block data
      for { } lt(challengeOffset, calldatasize()) { } {
        // if returndatasize > 0
        //   success; even if reverted
        // else
        //   out of gas?
        // TODO: the Bridge needs a global timeout,
        // otherwise it becomes possible that we spin here forever.
        let success, nextOffset := _parseTransaction(challengeOffset)

        if iszero(success) {
          mstore(0, challengeOffset)
          return(0, 32)
        }
        challengeOffset := nextOffset
      }

      // if you do more stuff that doesn't fit into a single transaction,
      // then you can return false here. You have to keep track of progression.
      // Be aware, you may potentially miss the finalization deadline if this takes too long.
      // done
      mstore(0, challengeOffset)
      return(0, 32)
    }
  }
}
