Table of Contents
=================

* [CallMock](#callmock)
* [DAI](#dai)
* [DropletMock](#dropletmock)
* [DropletWrapper](#dropletwrapper)
  * [recoverLostTokens(address)](#recoverlosttokensaddress)
* [DropletWrapperMainnet](#dropletwrappermainnet)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-1)
* [DropletWrapperMock](#dropletwrappermock)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-2)
* [ERC20](#erc20)
* [ExecutionProxy](#executionproxy)
* [ExecutionTest](#executiontest)
* [FreeToken](#freetoken)
* [GovBase](#govbase)
  * [BOND_AMOUNT()](#bond_amount)
  * [INSPECTION_PERIOD()](#inspection_period)
  * [MAX_BLOCK_SIZE()](#max_block_size)
  * [MAX_SOLUTION_SIZE()](#max_solution_size)
  * [VERSION()](#version)
  * [batchDeposit()](#batchdeposit)
  * [batchWithdraw()](#batchwithdraw)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256)
  * [challenge()](#challenge)
  * [deposit(address,uint256,address)](#depositaddressuint256address)
  * [dispute(uint256,uint256)](#disputeuint256uint256)
  * [finalizeSolution(uint256)](#finalizesolutionuint256)
  * [submitBlock()](#submitblock)
  * [submitSolution()](#submitsolution)
  * [withdraw(address,uint256)](#withdrawaddressuint256)
* [GovBrick](#govbrick)
  * [BOND_AMOUNT()](#bond_amount-1)
  * [INSPECTION_PERIOD()](#inspection_period-1)
  * [MAX_BLOCK_SIZE()](#max_block_size-1)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-1)
  * [VERSION()](#version-1)
  * [batchDeposit()](#batchdeposit-1)
  * [batchWithdraw()](#batchwithdraw-1)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-1)
  * [challenge()](#challenge-1)
  * [deposit(address,uint256,address)](#depositaddressuint256address-1)
  * [dispute(uint256,uint256)](#disputeuint256uint256-1)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-1)
  * [onChallenge()](#onchallenge)
  * [onDeposit(address,address,uint256)](#ondepositaddressaddressuint256)
  * [onFinalizeSolution(uint256,bytes32)](#onfinalizesolutionuint256bytes32)
  * [submitBlock()](#submitblock-1)
  * [submitSolution()](#submitsolution-1)
  * [withdraw(address,uint256)](#withdrawaddressuint256-1)
* [GovBrickChallenge](#govbrickchallenge)
* [GovBrickMock](#govbrickmock)
  * [BOND_AMOUNT()](#bond_amount-2)
  * [INSPECTION_PERIOD()](#inspection_period-2)
  * [MAX_BLOCK_SIZE()](#max_block_size-2)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-2)
  * [VERSION()](#version-2)
  * [batchDeposit()](#batchdeposit-2)
  * [batchWithdraw()](#batchwithdraw-2)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-2)
  * [challenge()](#challenge-2)
  * [deposit(address,uint256,address)](#depositaddressuint256address-2)
  * [dispute(uint256,uint256)](#disputeuint256uint256-2)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-2)
  * [onChallenge()](#onchallenge-1)
  * [onDeposit(address,address,uint256)](#ondepositaddressaddressuint256-1)
  * [onFinalizeSolution(uint256,bytes32)](#onfinalizesolutionuint256bytes32-1)
  * [submitBlock()](#submitblock-2)
  * [submitSolution()](#submitsolution-2)
  * [withdraw(address,uint256)](#withdrawaddressuint256-2)
* [HabitatAccount](#habitataccount)
  * [BOND_AMOUNT()](#bond_amount-3)
  * [INSPECTION_PERIOD()](#inspection_period-3)
  * [MAX_BLOCK_SIZE()](#max_block_size-3)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-3)
  * [VERSION()](#version-3)
  * [batchDeposit()](#batchdeposit-3)
  * [batchWithdraw()](#batchwithdraw-3)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-3)
  * [challenge()](#challenge-3)
  * [deposit(address,uint256,address)](#depositaddressuint256address-3)
  * [dispute(uint256,uint256)](#disputeuint256uint256-3)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-3)
  * [onClaimUsername(address,uint256,bytes32)](#onclaimusernameaddressuint256bytes32)
  * [submitBlock()](#submitblock-3)
  * [submitSolution()](#submitsolution-3)
  * [withdraw(address,uint256)](#withdrawaddressuint256-3)
* [HabitatBase](#habitatbase)
  * [BOND_AMOUNT()](#bond_amount-4)
  * [INSPECTION_PERIOD()](#inspection_period-4)
  * [MAX_BLOCK_SIZE()](#max_block_size-4)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-4)
  * [VERSION()](#version-4)
  * [batchDeposit()](#batchdeposit-4)
  * [batchWithdraw()](#batchwithdraw-4)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-4)
  * [challenge()](#challenge-4)
  * [deposit(address,uint256,address)](#depositaddressuint256address-4)
  * [dispute(uint256,uint256)](#disputeuint256uint256-4)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-4)
  * [submitBlock()](#submitblock-4)
  * [submitSolution()](#submitsolution-4)
  * [withdraw(address,uint256)](#withdrawaddressuint256-4)
* [HabitatGlobals](#habitatglobals)
* [HabitatToken](#habitattoken)
  * [approve(address,uint256)](#approveaddressuint256)
  * [permit(address,address,uint256,uint256,uint8,bytes32,bytes32)](#permitaddressaddressuint256uint256uint8bytes32bytes32)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-3)
  * [transfer(address,uint256)](#transferaddressuint256)
  * [transferFrom(address,address,uint256)](#transferfromaddressaddressuint256)
* [HabitatV1](#habitatv1)
  * [BOND_AMOUNT()](#bond_amount-5)
  * [INSPECTION_PERIOD()](#inspection_period-5)
  * [MAX_BLOCK_SIZE()](#max_block_size-5)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-5)
  * [VERSION()](#version-5)
  * [batchDeposit()](#batchdeposit-5)
  * [batchWithdraw()](#batchwithdraw-5)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-5)
  * [challenge()](#challenge-5)
  * [deposit(address,uint256,address)](#depositaddressuint256address-5)
  * [dispute(uint256,uint256)](#disputeuint256uint256-5)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-5)
  * [onChallenge()](#onchallenge-2)
  * [onClaimUsername(address,uint256,bytes32)](#onclaimusernameaddressuint256bytes32-1)
  * [onDeposit(address,address,uint256)](#ondepositaddressaddressuint256-2)
  * [onExitToken(address,uint256,address,address,uint256)](#onexittokenaddressuint256addressaddressuint256)
  * [onFinalizeSolution(uint256,bytes32)](#onfinalizesolutionuint256bytes32-2)
  * [onTransferToken(address,uint256,address,address,uint256)](#ontransfertokenaddressuint256addressaddressuint256)
  * [submitBlock()](#submitblock-5)
  * [submitSolution()](#submitsolution-5)
  * [withdraw(address,uint256)](#withdrawaddressuint256-5)
* [HabitatV1Challenge](#habitatv1challenge)
* [HabitatV1Mock](#habitatv1mock)
  * [BOND_AMOUNT()](#bond_amount-6)
  * [INSPECTION_PERIOD()](#inspection_period-6)
  * [MAX_BLOCK_SIZE()](#max_block_size-6)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-6)
  * [VERSION()](#version-6)
  * [batchDeposit()](#batchdeposit-6)
  * [batchWithdraw()](#batchwithdraw-6)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-6)
  * [challenge()](#challenge-6)
  * [deposit(address,uint256,address)](#depositaddressuint256address-6)
  * [dispute(uint256,uint256)](#disputeuint256uint256-6)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-6)
  * [onChallenge()](#onchallenge-3)
  * [onClaimUsername(address,uint256,bytes32)](#onclaimusernameaddressuint256bytes32-2)
  * [onDeposit(address,address,uint256)](#ondepositaddressaddressuint256-3)
  * [onExitToken(address,uint256,address,address,uint256)](#onexittokenaddressuint256addressaddressuint256-1)
  * [onFinalizeSolution(uint256,bytes32)](#onfinalizesolutionuint256bytes32-3)
  * [onTransferToken(address,uint256,address,address,uint256)](#ontransfertokenaddressuint256addressaddressuint256-1)
  * [submitBlock()](#submitblock-6)
  * [submitSolution()](#submitsolution-6)
  * [withdraw(address,uint256)](#withdrawaddressuint256-6)
* [HabitatVault](#habitatvault)
  * [BOND_AMOUNT()](#bond_amount-7)
  * [INSPECTION_PERIOD()](#inspection_period-7)
  * [MAX_BLOCK_SIZE()](#max_block_size-7)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-7)
  * [VERSION()](#version-7)
  * [batchDeposit()](#batchdeposit-7)
  * [batchWithdraw()](#batchwithdraw-7)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-7)
  * [challenge()](#challenge-7)
  * [deposit(address,uint256,address)](#depositaddressuint256address-7)
  * [dispute(uint256,uint256)](#disputeuint256uint256-7)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-7)
  * [submitBlock()](#submitblock-7)
  * [submitSolution()](#submitsolution-7)
  * [withdraw(address,uint256)](#withdrawaddressuint256-7)
* [HabitatWallet](#habitatwallet)
  * [BOND_AMOUNT()](#bond_amount-8)
  * [INSPECTION_PERIOD()](#inspection_period-8)
  * [MAX_BLOCK_SIZE()](#max_block_size-8)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-8)
  * [VERSION()](#version-8)
  * [batchDeposit()](#batchdeposit-8)
  * [batchWithdraw()](#batchwithdraw-8)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-8)
  * [challenge()](#challenge-8)
  * [deposit(address,uint256,address)](#depositaddressuint256address-8)
  * [dispute(uint256,uint256)](#disputeuint256uint256-8)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-8)
  * [onDeposit(address,address,uint256)](#ondepositaddressaddressuint256-4)
  * [onExitToken(address,uint256,address,address,uint256)](#onexittokenaddressuint256addressaddressuint256-2)
  * [onTransferToken(address,uint256,address,address,uint256)](#ontransfertokenaddressuint256addressaddressuint256-2)
  * [submitBlock()](#submitblock-8)
  * [submitSolution()](#submitsolution-8)
  * [withdraw(address,uint256)](#withdrawaddressuint256-8)
* [IDroplet](#idroplet)
* [IERC20](#ierc20)
* [IUniswapV2Callee](#iuniswapv2callee)
* [IUniswapV2Pair](#iuniswapv2pair)
* [IWETH](#iweth)
* [Math](#math)
* [Moloch](#moloch)
  * [BOND_AMOUNT()](#bond_amount-9)
  * [INSPECTION_PERIOD()](#inspection_period-9)
  * [MAX_BLOCK_SIZE()](#max_block_size-9)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-9)
  * [VERSION()](#version-9)
  * [batchDeposit()](#batchdeposit-9)
  * [batchWithdraw()](#batchwithdraw-9)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-9)
  * [challenge()](#challenge-9)
  * [deposit(address,uint256,address)](#depositaddressuint256address-9)
  * [dispute(uint256,uint256)](#disputeuint256uint256-9)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-9)
  * [submitBlock()](#submitblock-9)
  * [submitSolution()](#submitsolution-9)
  * [withdraw(address,uint256)](#withdrawaddressuint256-9)
* [RollupCoreBrick](#rollupcorebrick)
  * [BOND_AMOUNT()](#bond_amount-10)
  * [INSPECTION_PERIOD()](#inspection_period-10)
  * [MAX_BLOCK_SIZE()](#max_block_size-10)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-10)
  * [VERSION()](#version-10)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-10)
  * [challenge()](#challenge-10)
  * [dispute(uint256,uint256)](#disputeuint256uint256-10)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-10)
  * [submitBlock()](#submitblock-10)
  * [submitSolution()](#submitsolution-10)
* [SafeMath](#safemath)
* [TestERC20](#testerc20)
* [TokenBridgeBrick](#tokenbridgebrick)
  * [BOND_AMOUNT()](#bond_amount-11)
  * [INSPECTION_PERIOD()](#inspection_period-11)
  * [MAX_BLOCK_SIZE()](#max_block_size-11)
  * [MAX_SOLUTION_SIZE()](#max_solution_size-11)
  * [VERSION()](#version-11)
  * [batchDeposit()](#batchdeposit-10)
  * [batchWithdraw()](#batchwithdraw-10)
  * [canFinalizeBlock(uint256)](#canfinalizeblockuint256-11)
  * [challenge()](#challenge-11)
  * [deposit(address,uint256,address)](#depositaddressuint256address-10)
  * [dispute(uint256,uint256)](#disputeuint256uint256-11)
  * [finalizeSolution(uint256)](#finalizesolutionuint256-11)
  * [submitBlock()](#submitblock-11)
  * [submitSolution()](#submitsolution-11)
  * [withdraw(address,uint256)](#withdrawaddressuint256-10)
* [TokenInventoryBrick](#tokeninventorybrick)
* [TokenTurner](#tokenturner)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-4)
  * [swapIn(address,uint256,uint256[],bytes)](#swapinaddressuint256uint256bytes)
  * [swapOut(address,uint256,uint256,uint256[],bytes)](#swapoutaddressuint256uint256uint256bytes)
* [TokenTurnerMainnet](#tokenturnermainnet)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-5)
  * [swapIn(address,uint256,uint256[],bytes)](#swapinaddressuint256uint256bytes-1)
  * [swapOut(address,uint256,uint256,uint256[],bytes)](#swapoutaddressuint256uint256uint256bytes-1)
* [TokenTurnerMock](#tokenturnermock)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-6)
  * [swapIn(address,uint256,uint256[],bytes)](#swapinaddressuint256uint256bytes-2)
  * [swapOut(address,uint256,uint256,uint256[],bytes)](#swapoutaddressuint256uint256uint256bytes-2)
* [TokenTurnerRopsten](#tokenturnerropsten)
  * [recoverLostTokens(address)](#recoverlosttokensaddress-7)
  * [swapIn(address,uint256,uint256[],bytes)](#swapinaddressuint256uint256bytes-3)
  * [swapOut(address,uint256,uint256,uint256[],bytes)](#swapoutaddressuint256uint256uint256bytes-3)
* [UQ112x112](#uq112x112)
* [UniswapV2ERC20](#uniswapv2erc20)
* [UniswapV2Factory](#uniswapv2factory)
* [UniswapV2Library](#uniswapv2library)
* [UniswapV2Pair](#uniswapv2pair)
* [Utilities](#utilities)
* [UtilityBrick](#utilitybrick)
* [WETH](#weth)


# CallMock

# DAI

# DropletMock

# DropletWrapper

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

# DropletWrapperMainnet

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

# DropletWrapperMock

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

# ERC20

# ExecutionProxy

# ExecutionTest

# FreeToken

# GovBase

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# GovBrick

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onChallenge()
(0xc47c519d)

Challenge the lowest pending block.


## onDeposit(address,address,uint256)
(0x412c6d50)

State transition when a user deposits a token.


## onFinalizeSolution(uint256,bytes32)
(0xc8470b09)

Finalize solution and move to the next block. Calldata contains a blob of key:value pairs that we are going to apply. If this functions reverts, then the block can only be finalised by a call to `challenge`.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# GovBrickChallenge

# GovBrickMock

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onChallenge()
(0xc47c519d)

Challenge the lowest pending block.


## onDeposit(address,address,uint256)
(0x412c6d50)

State transition when a user deposits a token.


## onFinalizeSolution(uint256,bytes32)
(0xc8470b09)

Finalize solution and move to the next block. Calldata contains a blob of key:value pairs that we are going to apply. If this functions reverts, then the block can only be finalised by a call to `challenge`.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatAccount

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onClaimUsername(address,uint256,bytes32)
(0x0827bab8)

State transition when a user claims a (short) username.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatBase

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatGlobals

# HabitatToken

## approve(address,uint256)
(0x095ea7b3)

- amount The maximum collective amount that `spender` can draw.
- spender Address of the party that can draw from msg.sender's account.

## permit(address,address,uint256,uint256,uint8,bytes32,bytes32)
(0xd505accf)

- deadline This permit must be redeemed before this deadline (UTC timestamp in seconds).
- owner Address of the owner.
- spender The address of the spender that gets approved to draw from `owner`.
- value The maximum collective amount that `spender` can draw.

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

## transfer(address,uint256)
(0xa9059cbb)

- amount of the tokens to move.
- to The address to move the tokens.

## transferFrom(address,address,uint256)
(0x23b872dd)

- amount The token amount to move.
- from Address to draw tokens from.
- to The address to move the tokens.

# HabitatV1

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onChallenge()
(0xc47c519d)

Challenge the lowest pending block.


## onClaimUsername(address,uint256,bytes32)
(0x0827bab8)

State transition when a user claims a (short) username.


## onDeposit(address,address,uint256)
(0x412c6d50)

State transition when a user deposits a token.


## onExitToken(address,uint256,address,address,uint256)
(0xe8614f53)

State transition when a user exits a token.


## onFinalizeSolution(uint256,bytes32)
(0xc8470b09)

Finalize solution and move to the next block. Calldata contains a blob of key:value pairs that we are going to apply. If this functions reverts, then the block can only be finalised by a call to `challenge`.


## onTransferToken(address,uint256,address,address,uint256)
(0x11d4aec1)

State transition when a user transfers a token.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatV1Challenge

# HabitatV1Mock

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onChallenge()
(0xc47c519d)

Challenge the lowest pending block.


## onClaimUsername(address,uint256,bytes32)
(0x0827bab8)

State transition when a user claims a (short) username.


## onDeposit(address,address,uint256)
(0x412c6d50)

State transition when a user deposits a token.


## onExitToken(address,uint256,address,address,uint256)
(0xe8614f53)

State transition when a user exits a token.


## onFinalizeSolution(uint256,bytes32)
(0xc8470b09)

Finalize solution and move to the next block. Calldata contains a blob of key:value pairs that we are going to apply. If this functions reverts, then the block can only be finalised by a call to `challenge`.


## onTransferToken(address,uint256,address,address,uint256)
(0x11d4aec1)

State transition when a user transfers a token.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatVault

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# HabitatWallet

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## onDeposit(address,address,uint256)
(0x412c6d50)

State transition when a user deposits a token.


## onExitToken(address,uint256,address,address,uint256)
(0xe8614f53)

State transition when a user exits a token.


## onTransferToken(address,uint256,address,address,uint256)
(0x11d4aec1)

State transition when a user transfers a token.


## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# IDroplet

# IERC20

# IUniswapV2Callee

# IUniswapV2Pair

# IWETH

# Math

# Moloch

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# RollupCoreBrick

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


# SafeMath

# TestERC20

# TokenBridgeBrick

## BOND_AMOUNT()
(0xbcacc70a)

Constant, the bond amount a block producer has to deposit on block submission. Default: 1 ether


## INSPECTION_PERIOD()
(0xe70f0e35)

Constant, the inspection period defines how long it takes (in L1 blocks) until a submitted solution can be finalized. Default: 60 blocks ~ 14 minutes.


## MAX_BLOCK_SIZE()
(0x6ce02363)

Constant, the maximum size a single block can be. Default: 31744 bytes


## MAX_SOLUTION_SIZE()
(0x6f0ee0a0)

Constant, the maximum size a solution can be. Default: 31744 bytes


## VERSION()
(0xffa1ad74)

Constant, returns the version. Default: 1


## batchDeposit()
(0x24dbce54)

Batch deposits of tokens. functionSig: 0x24dbce54 Layout is <20 bytes token address> <2 bytes number of transfers for this token> numOfTransfers x <20 bytes owner, 32 bytes amountOrId> ..repeat... the full size of the blob must not exceed `MAX_BLOCK_SIZE() - 32`,


## batchWithdraw()
(0x8b38e59a)

Batch withdraw of tokens. functionSig: 0x8b38e59a Layout is <20 bytes token address> <2 bytes number of transfers for this token> <1 byte tokenType; 0 = ERC-20, 1 = ERC-721> if tokenType == 1   numOfTransfers x <20 bytes owner, 32 bytes nftId> else   numOfTransfers x <20 bytes owner> ..repeat...


## canFinalizeBlock(uint256)
(0x5b11ae01)

Returns true if `blockNumber` can be finalized, else false.

- blockNumber The number of the block in question.

## challenge()
(0xd2ef7398)

Challenge the solution or just verify the next pending block directly. Expects the block data right after the function signature to be included in the call.


## deposit(address,uint256,address)
(0xf45346dc)

Deposit `token` and value (`amountOrId`) into bridge.

- amountOrId Amount or the token id.
- receiver The account who receives the token(s).
- token The ERC20/ERC721 token address.

## dispute(uint256,uint256)
(0x1f2f7fc3)

Flag a solution.


## finalizeSolution(uint256)
(0xd5bb8c4b)

Finalize solution and move to the next block. Solution must not be bigger than `MAX_SOLUTION_SIZE`. `canFinalizeBlock` must return true for `blockNumber`.

- blockNumber The number of the block to finalize. This must happen in block order.

## submitBlock()
(0x25ceb4b2)

Submit a transaction blob (a block). The block-data is expected right after the 4-byte function signature. Only regular accounts are allowed to submit blocks.


## submitSolution()
(0x84634f44)

Register solution for given `blockNumber`. Up to 256 solutions can be registered ahead in time. calldata layout: <4 byte function sig> <32 bytes number of first block> <32 bytes for each solution for blocks starting at first block (increments by one)> Note: You can put `holes` in the layout by inserting a 32 byte zero value.


## withdraw(address,uint256)
(0xf3fef3a3)

Withdraw `token` and `tokenId` from bridge. `tokenId` is ignored if `token` is not a ERC721.

- token address of the token.
- tokenId ERC721 token id.

# TokenInventoryBrick

# TokenTurner

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

## swapIn(address,uint256,uint256[],bytes)
(0x78cf6623)

- inputAmount The amount of `swapRoute[0]` to trade for `OUTPUT_TOKEN`.
- permitData Optional EIP-2612 signed approval for `swapRoute[0]`.
- receiver The receiver of `OUTPUT_TOKEN`.
- swapRoute First element is the address of a ERC-20 used as input. If the address is not `INPUT_TOKEN` then this array should also include addresses for Uniswap(v2) pairs to swap from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)

## swapOut(address,uint256,uint256,uint256[],bytes)
(0x73a498be)

- epoch The epoch `OUTPUT_TOKEN` was acquired. Needed to calculate the decay rate.
- inputSellAmount The amount of `OUTPUT_TOKEN` to swap back.
- permitData Optional EIP-2612 signed approval for `OUTPUT_TOKEN`.
- receiver Address of the receiver for the returned tokens.
- swapRoute If `swapRoute.length` is greather than 1, then this array should also include addresses for Uniswap(v2) pairs to swap to/from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo) For receiving `INPUT_TOKEN` back, just use `swapRoute = [0]`. If ETH is wanted, then use `swapRoute [<address of WETH>, DAI-WETH-PAIR(see above for encoding)]`. Otherwise, use `swapRoute [0, DAI-WETH-PAIR(see above for encoding)]`.

# TokenTurnerMainnet

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

## swapIn(address,uint256,uint256[],bytes)
(0x78cf6623)

- inputAmount The amount of `swapRoute[0]` to trade for `OUTPUT_TOKEN`.
- permitData Optional EIP-2612 signed approval for `swapRoute[0]`.
- receiver The receiver of `OUTPUT_TOKEN`.
- swapRoute First element is the address of a ERC-20 used as input. If the address is not `INPUT_TOKEN` then this array should also include addresses for Uniswap(v2) pairs to swap from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)

## swapOut(address,uint256,uint256,uint256[],bytes)
(0x73a498be)

- epoch The epoch `OUTPUT_TOKEN` was acquired. Needed to calculate the decay rate.
- inputSellAmount The amount of `OUTPUT_TOKEN` to swap back.
- permitData Optional EIP-2612 signed approval for `OUTPUT_TOKEN`.
- receiver Address of the receiver for the returned tokens.
- swapRoute If `swapRoute.length` is greather than 1, then this array should also include addresses for Uniswap(v2) pairs to swap to/from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo) For receiving `INPUT_TOKEN` back, just use `swapRoute = [0]`. If ETH is wanted, then use `swapRoute [<address of WETH>, DAI-WETH-PAIR(see above for encoding)]`. Otherwise, use `swapRoute [0, DAI-WETH-PAIR(see above for encoding)]`.

# TokenTurnerMock

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

## swapIn(address,uint256,uint256[],bytes)
(0x78cf6623)

- inputAmount The amount of `swapRoute[0]` to trade for `OUTPUT_TOKEN`.
- permitData Optional EIP-2612 signed approval for `swapRoute[0]`.
- receiver The receiver of `OUTPUT_TOKEN`.
- swapRoute First element is the address of a ERC-20 used as input. If the address is not `INPUT_TOKEN` then this array should also include addresses for Uniswap(v2) pairs to swap from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)

## swapOut(address,uint256,uint256,uint256[],bytes)
(0x73a498be)

- epoch The epoch `OUTPUT_TOKEN` was acquired. Needed to calculate the decay rate.
- inputSellAmount The amount of `OUTPUT_TOKEN` to swap back.
- permitData Optional EIP-2612 signed approval for `OUTPUT_TOKEN`.
- receiver Address of the receiver for the returned tokens.
- swapRoute If `swapRoute.length` is greather than 1, then this array should also include addresses for Uniswap(v2) pairs to swap to/from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo) For receiving `INPUT_TOKEN` back, just use `swapRoute = [0]`. If ETH is wanted, then use `swapRoute [<address of WETH>, DAI-WETH-PAIR(see above for encoding)]`. Otherwise, use `swapRoute [0, DAI-WETH-PAIR(see above for encoding)]`.

# TokenTurnerRopsten

## recoverLostTokens(address)
(0xb9e8ce2c)

- token The address of the ERC-20 token to recover.

## swapIn(address,uint256,uint256[],bytes)
(0x78cf6623)

- inputAmount The amount of `swapRoute[0]` to trade for `OUTPUT_TOKEN`.
- permitData Optional EIP-2612 signed approval for `swapRoute[0]`.
- receiver The receiver of `OUTPUT_TOKEN`.
- swapRoute First element is the address of a ERC-20 used as input. If the address is not `INPUT_TOKEN` then this array should also include addresses for Uniswap(v2) pairs to swap from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo)

## swapOut(address,uint256,uint256,uint256[],bytes)
(0x73a498be)

- epoch The epoch `OUTPUT_TOKEN` was acquired. Needed to calculate the decay rate.
- inputSellAmount The amount of `OUTPUT_TOKEN` to swap back.
- permitData Optional EIP-2612 signed approval for `OUTPUT_TOKEN`.
- receiver Address of the receiver for the returned tokens.
- swapRoute If `swapRoute.length` is greather than 1, then this array should also include addresses for Uniswap(v2) pairs to swap to/from. In the format: uint256(address(pair) << 1 | direction) where direction = tokenA === token0 ? 0 : 1 (See Uniswap for ordering algo) For receiving `INPUT_TOKEN` back, just use `swapRoute = [0]`. If ETH is wanted, then use `swapRoute [<address of WETH>, DAI-WETH-PAIR(see above for encoding)]`. Otherwise, use `swapRoute [0, DAI-WETH-PAIR(see above for encoding)]`.

# UQ112x112

# UniswapV2ERC20

# UniswapV2Factory

# UniswapV2Library

# UniswapV2Pair

# Utilities

# UtilityBrick

# WETH

