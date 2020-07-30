
contract GovBrickChallenge {
  /// @dev Challenge the solution or just verify the next pending block directly.
  function _onChallenge (uint256 challengeOffset) internal {
    // all power the core protocol
    require(msg.sender == address(this));

    assembly {
      
function _parseTransaction (o) -> success, offset {
  // TODO: clear memory?
  // calldatacopy(0, calldatasize(), msize())
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

// start of InitMoloch
// typeHash: 0x2dfdcad7468aaf00f76b0ff8234ab2862ce6a33a8ed6eab59a319453887ef142
// function: onInitMoloch(address,uint256,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)
case 0 {
  let headSize := 384
  let typeLen := 0
  let txPtr := 832
  let endOfSlot := add(txPtr, 384)

  txPtr := 864
  // typeHash of InitMoloch
  mstore(0, 0x2dfdcad7468aaf00f76b0ff8234ab2862ce6a33a8ed6eab59a319453887ef142)
  // uint256 InitMoloch.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address InitMoloch.summoner
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address InitMoloch.approvedToken
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(96, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.periodDuration
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(128, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.votingPeriod
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(160, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.gracePeriod
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(192, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.abortWindow
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(224, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.proposalDeposit
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(256, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.dilutionBound
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(288, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.processingReward
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(320, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 InitMoloch.summoningTime
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(352, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 384)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(800, 0xf47cdbc1)
  mstore(832, mload(128))

  success := call(gas(), address(), 0, 828, sub(endOfSlot, 828), 0, 0)
  success := or(success, returndatasize())
}
// end of InitMoloch

// start of SubmitProposal
// typeHash: 0xfd87472e121f06cd8d7e56ec374113119a190c33c0f2083752f976644930fecd
// function: onSubmitProposal(address,uint256,uint256,string)
case 1 {
  let headSize := 128
  let typeLen := 0
  let txPtr := 320
  let endOfSlot := add(txPtr, 128)

  txPtr := 352
  // typeHash of SubmitProposal
  mstore(0, 0xfd87472e121f06cd8d7e56ec374113119a190c33c0f2083752f976644930fecd)
  // uint256 SubmitProposal.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 SubmitProposal.startingPeriod
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // string SubmitProposal.details
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
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(288, 0xcfe3a4de)
  mstore(320, mload(128))

  success := call(gas(), address(), 0, 316, sub(endOfSlot, 316), 0, 0)
  success := or(success, returndatasize())
}
// end of SubmitProposal

// start of SubmitVote
// typeHash: 0x134e11916d58088dfad382b368ce217a3115751f2480031b41ae24c702f28b1a
// function: onSubmitVote(address,uint256,uint8)
case 2 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of SubmitVote
  mstore(0, 0x134e11916d58088dfad382b368ce217a3115751f2480031b41ae24c702f28b1a)
  // uint256 SubmitVote.proposalIndex
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint8 SubmitVote.uintVote
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0xd4fc0aba)
  mstore(256, mload(128))

  success := call(gas(), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of SubmitVote

// start of ProcessProposal
// typeHash: 0x3d97852889670d5742fbda05f411e1657839476a097126030b1579df018c2374
// function: onProcessProposal(address,uint256)
case 3 {
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
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
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

  success := call(gas(), address(), 0, 188, sub(endOfSlot, 188), 0, 0)
  success := or(success, returndatasize())
}
// end of ProcessProposal

// start of Ragequit
// typeHash: 0xea13e6e4adfb0277747eb857cdc973a1b6f71601cda8195856c9d37ed412d255
// function: onRagequit(address,uint256,uint256)
case 4 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of Ragequit
  mstore(0, 0xea13e6e4adfb0277747eb857cdc973a1b6f71601cda8195856c9d37ed412d255)
  // uint256 Ragequit.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // uint256 Ragequit.sharesToBurn
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0x1c6b038a)
  mstore(256, mload(128))

  success := call(gas(), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of Ragequit

// start of Abort
// typeHash: 0xfa48dff6f6d2ba086f807bd3af3e16d8fce730b3ae7365ee2ac40c4841d24d75
// function: onAbort(address,uint256)
case 5 {
  let headSize := 64
  let typeLen := 0
  let txPtr := 192
  let endOfSlot := add(txPtr, 64)

  txPtr := 224
  // typeHash of Abort
  mstore(0, 0xfa48dff6f6d2ba086f807bd3af3e16d8fce730b3ae7365ee2ac40c4841d24d75)
  // uint256 Abort.proposalIndex
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 64)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(160, 0x4cb4583d)
  mstore(192, mload(128))

  success := call(gas(), address(), 0, 188, sub(endOfSlot, 188), 0, 0)
  success := or(success, returndatasize())
}
// end of Abort

// start of UpdateDelegateKey
// typeHash: 0xd4d4abc8d123e6702461127d22894b13978b55a1bfe9859b73273cd3bad0a42c
// function: onUpdateDelegateKey(address,uint256,address)
case 6 {
  let headSize := 96
  let typeLen := 0
  let txPtr := 256
  let endOfSlot := add(txPtr, 96)

  txPtr := 288
  // typeHash of UpdateDelegateKey
  mstore(0, 0xd4d4abc8d123e6702461127d22894b13978b55a1bfe9859b73273cd3bad0a42c)
  // uint256 UpdateDelegateKey.nonce
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(32, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // address UpdateDelegateKey.newDelegateKey
  typeLen := byte(0, calldataload(offset))
  offset := add(offset, 1)
  mstore(txPtr, 0)
  calldatacopy(add(txPtr, sub(32, typeLen)), offset, typeLen)
  mstore(64, mload(txPtr))
  offset := add(offset, typeLen)
  txPtr := add(txPtr, 32)

  // typeHash
  let structHash := keccak256(0, 96)
  // prefix
  mstore(0, 0x1901000000000000000000000000000000000000000000000000000000000000)
  // DOMAIN struct hash
  mstore(2, 0xe985bf5cbd28ce1e554c6017034480982d5c3a37ad241143b90544854d11547f)
  // transactionStructHash
  mstore(34, structHash)
  mstore(0, keccak256(0, 66))
  mstore(32, v)
  mstore(64, r)
  mstore(96, s)
  mstore(128, 0)
  success := staticcall(gas(), 1, 0, 128, 128, 32)
  // functionSig
  mstore(224, 0xd2527a14)
  mstore(256, mload(128))

  success := call(gas(), address(), 0, 252, sub(endOfSlot, 252), 0, 0)
  success := or(success, returndatasize())
}
// end of UpdateDelegateKey
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
