import { getSigner, setupTokenlistV2, getErc20, getTokenV2, walletIsConnected } from './utils.js';
import {
  getProviders,
  sendTransaction,
  simulateTransaction,
  setupModulelist,
  doQueryWithOptions,
  resolveName,
  getShortString,
  getErc20Exit,
  encodeMetadata
} from './rollup.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

export class BaseFlow {
  constructor (root, ctx) {
    const existingFlow = root.querySelector('.flow');
    if (existingFlow) {
      existingFlow.remove();
    }

    this.context = ctx || {};

    this.container = document.createElement('div');
    this.container.className = 'flow';

    this.errorBox = document.createElement('p');
    this.errorBox.className = 'error';
    this.container.appendChild(this.errorBox);

    this.notifyBox = document.createElement('p');
    this.container.appendChild(this.notifyBox);

    this.input = document.createElement('input');
    this.input.disabled = true;
    this.input.addEventListener('keyup', this.onInput.bind(this), false);
    this.input.autocomplete = 'off';
    this.container.appendChild(this.input);

    this.cancelButton = document.createElement('button');
    this.cancelButton.textContent = 'Cancel';
    this.cancelButton.addEventListener('click', this.onDone.bind(this), false);
    this.container.appendChild(this.cancelButton);

    this.confirmButton = document.createElement('button');
    this.confirmButton.style.visibility = 'hidden';
    this.confirmButton.addEventListener('click', this.onConfirm.bind(this), false);
    this.container.appendChild(this.confirmButton);

    this.container.addEventListener('click', this._trap, false);

    const self = this;
    function animate () {
      self.container.style.animation = 'none';
      root.style.animation = 'none';
      root.removeEventListener('animationend', animate, false);
    }
    root.addEventListener('animationend', animate, false);
    root.style.animation = 'blink 1s';
    root.appendChild(this.container);
    this.container.parentElement.classList.add('expanded');
  }

  _trap (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
  }

  ask (str, placeholder, key, callback) {
    this._key = key;
    this._inputCallback = callback;
    this.input.placeholder = placeholder;
    this.input.disabled = false;
    this.input.focus();

    this.notifyBox.textContent = str;

    this._buttonCallback = () => this.onInput();
    this.confirmButton.textContent = 'Continue';
    this.confirmButton.style.visibility = 'visible';
    this.confirmButton.style.animation = 'jumpIn 1s';
  }

  onInput (evt) {
    if (evt) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
    }

    // enter
    if (!evt || evt.which === 13) {
      /// xxx hacky workaround for some datalist ?
      //const str = this.input.value.split(' - ')[0];
      const str = this.input.value;

      this.input.blur();
      this.input.value = '';
      this.input.placeholder = '';
      this.input.disabled = true;

      this.context[this._key] = str;
      this.handleCallback(this._inputCallback, this.context);
    }
  }

  confirm (label, str, callback) {
    this._buttonCallback = callback;
    this.confirmButton.textContent = label;
    this.confirmButton.style.visibility = 'visible';
    this.confirmButton.style.animation = 'jumpIn 1s';

    if (str) {
      this.notifyBox.textContent = str;
    }
  }

  onConfirm (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();

    this.confirmButton.style.animation = 'none';
    this.confirmButton.style.visibility = 'hidden';

    this.handleCallback(this._buttonCallback, this.context);
  }

  async handleCallback (callback, arg, error) {
    if (this._destroyed) {
      return;
    }

    if (!error) {
      this.errorBox.textContent = '';
    }

    const oldCallback = this.prev;
    const oldArg = this.prevArg;

    try {
      await callback.call(this, arg);
      this.prev = callback;
      this.prevArg = arg;
    } catch (e) {
      console.warn(e);
      this.notifyBox.textContent = '';
      this.writeError((e.error ? e.error.message : '') || e.message || e.toString());
      this.confirm('Retry', '', () => this.handleCallback(oldCallback, oldArg));
    }
  }

  async runNext (callback) {
    this.prev = callback;
    this.prevArg = this.context;

    await this.handleCallback(callback, this.context);
  }

  writeError (str) {
    this.errorBox.textContent = str;
  }

  write (str) {
    this.notifyBox.textContent = str;
  }

  onDone (ctx) {
    this._destroyed = true;

    const root = this.container.parentElement;
    const container = this.container;

    function animate () {
      root.style.animation = 'none';
      container.removeEventListener('animationend', animate, false);
      container.remove();
      root.classList.remove('expanded');
    }

    container.addEventListener('animationend', animate, false);
    container.style.animation = 'jumpIn 1s reverse';
    root.style.animation = 'blink 1s reverse';

    if (ctx.callback) {
      ctx.callback(this.context);
    }
  }

  async setupWallet () {
    if (walletIsConnected()) {
      this.onSetupWallet();
      return;
    }
    this.confirm('Connect', 'Please Connect your Wallet.', this.onSetupWallet);
  }

  async onSetupWallet () {
    this.write('Connecting to wallet...');

    this.context.signer = await getSigner();
    this.runNext(this.setupFlow);
  }
}

export class CreateCommunityFlow extends BaseFlow {
  constructor (root, ctx) {
    super(root, ctx);

    this.runNext(this.setupWallet);
  }

  async setupFlow () {
    this.ask(
      `What should be the name of your community?`,
      'Community Name',
      'name',
      this.confirmName
    );
  }

  async confirmName (ctx) {
    await setupTokenlistV2(this.container);
    this.input.setAttribute('list', 'tokenlistv2');

    this.ask(
      `What is the Governance Token of the community?`,
      'Governance Token',
      'governanceToken',
      this.confirmGovernanceToken
    );
  }

  async confirmGovernanceToken (ctx) {
    this.input.setAttribute('list', '');
    ctx.erc20 = await getTokenV2(ctx.governanceToken);
    ctx.governanceToken = ctx.erc20.address;
    const tknName = ctx.erc20.name;

    this.confirm(
      'Looks Good',
      `So, you are creating ${ctx.name} by using ${tknName}?`,
      this.looksGood
    );
  }

  async looksGood (ctx) {
    let args = {
      governanceToken: ctx.governanceToken,
      metadata: encodeMetadata({ title: ctx.name }),
    };
    let tmp = await sendTransaction('CreateCommunity', args);

    this.confirm(
      'Done',
      'Confirmed! Welcome to the 🏕',
      this.onDone
    );
  }
}

export class CreateTreasuryFlow extends CreateCommunityFlow {
  constructor (root, ctx) {
    super(root, ctx);

    this.runNext(this.setupFlow);
  }

  async setupFlow () {
    this.ask(
      `What should be the name of the Treasury?`,
      'e.g. Marketing 💰',
      'name',
      this.confirmName
    );
  }

  async confirmName (ctx) {
    if (ctx.name.length === 0) {
      throw new Error('name too short');
    }
    if (ctx.name.length > 32) {
      throw new Error('name too long');
    }
    await setupModulelist(this.container);
    this.input.setAttribute('list', 'modulelist');

    this.ask(
      `Which smart contract is the gatekeeper of this treasury?`,
      'Choose from the list',
      'module',
      this.confirmCondition
    );
  }

  async confirmCondition (ctx) {
    const [moduleName, address] = ctx.module.split(' @ ');
    ctx.address = address;
    this.confirm(
      'Looks Good',
      `So, you are creating ${ctx.name} which is managed by ${moduleName}?`,
      this.looksGood
    );
  }

  async looksGood (ctx) {
    const args = {
      communityId: ctx.communityId,
      condition: ctx.address,
      metadata: encodeMetadata({ title: ctx.name }),
    };
    try {
      await simulateTransaction('CreateVault', args);
    } catch (e) {
      if (e.toString().indexOf('ACTIVE') !== -1) {
        // activate the module first
        this.write('You have activate the module first...');
        await sendTransaction('ActivateModule', { communityId: ctx.communityId, condition: ctx.address });
      }
    }
    ctx.receipt = await sendTransaction('CreateVault', args);

    this.confirm(
      'Done',
      'Confirmed! You can now fill your chest with 🍌',
      this.onDone
    );
  }
}

export class UsernameFlow extends BaseFlow {
  constructor (root, ctx) {
    super(root, ctx);

    this.runNext(this.setupFlow);
  }

  async setupFlow () {
    this.ask(
      `What name do you like?`,
      'e.g. Sabrina the 🙀',
      'username',
      this.confirmName
    );
  }

  async confirmName (ctx) {
    ctx.shortString = getShortString(ctx.username);

    try {
      const ret = await simulateTransaction('ClaimUsername', ctx);
    } catch (e) {
      throw new Error('Ouch, that one is already taken 😢');
    }

    this.confirm(
      'Looks Good',
      `It's not taken! You are about to claim ${ctx.username}`,
      this.looksGood
    );
  }

  async looksGood (ctx) {
    const args = {
      shortString: ctx.shortString,
    };
    ctx.receipt = await sendTransaction('ClaimUsername', args);

    this.confirm(
      'Done',
      'Confirmed! You can now freak out 💃',
      this.onDone
    );
  }
}

export class TransferFlow extends BaseFlow {
  constructor (root, ctx) {
    super(root, ctx);

    if (this.context.token) {
      this.runNext(this.amountStep);
    } else {
      this.runNext(this.setupFlow);
    }
  }

  async setupFlow () {
    await setupTokenlistV2(this.container);
    this.input.setAttribute('list', 'tokenlistv2');

    this.ask(
      'Which Token do you like to Transfer?',
      'Select',
      'token',
      this.amountStep
    );
  }

  async amountStep (ctx) {
    this.input.setAttribute('list', '');
    ctx.erc20 = await getTokenV2(ctx.token);
    ctx.tokenSymbol = ctx.erc20.symbol;

    this.ask(
      `How much ${ctx.tokenSymbol} do you want to Transfer?`,
      'Amount',
      'amount',
      this.onConfirmAmount
    );
  }

  onConfirmAmount (ctx) {
    const number = parseFloat(ctx.amount);
    if (!number || number <= 0) {
      throw new Error('Invalid Amount.');
    }

    this.ask(
      `Who is the Receiver?`,
      'Address, Username or ENS',
      'receiver',
      this.onConfirmReceiver
    );
  }

  async onConfirmReceiver (ctx) {
    ctx.receiver = await resolveName(ctx.receiver);
    if (!ctx.receiver) {
      throw new Error('not found');
    }

    this.confirm(
      'Sign',
      `Please double check the receiver:\n${ctx.receiver}`,
      this.doTransfer
    );
  }

  async doTransfer (ctx) {
    const amount = ethers.utils.parseUnits(ctx.amount, ctx.erc20.decimals).toHexString();
    const args = {
      token: ctx.erc20.address,
      to: ctx.receiver,
      value: amount,
    };
    ctx.receipt = await sendTransaction('TransferToken', args);

    this.confirm(
      'Done',
      `and all that's left is glory`,
      this.onDone
    );
  }
}

export class AddTransferFlow extends TransferFlow {
  constructor (root, ctx) {
    super(root, ctx);
  }

  async onConfirmReceiver (ctx) {
    ctx.receiver = await resolveName(ctx.receiver);
    if (!ctx.receiver) {
      throw new Error('not found');
    }

    this.confirm(
      'Confirm',
      `Please double check the receiver:\n${ctx.receiver}`,
      this.doTransfer
    );
  }

  async doTransfer (ctx) {
    this.onDone(ctx);
  }
}

export class AddExecutionFlow extends BaseFlow {
  constructor (root, ctx) {
    super(root, ctx);

    this.runNext(this.setupFlow);
  }

  async setupFlow () {
    this.ask(
      'Enter the address of the contract to be called.',
      'Contract Address',
      'contractAddress',
      this.onAddress
    );
  }

  async onAddress (ctx) {
    const { rootProvider } = await getProviders();
    ctx.contractAddress = await resolveName(ctx.contractAddress);
    const codeHexStr = await rootProvider.send('eth_getCode', [ctx.contractAddress, 'latest']);
    if (codeHexStr.length < 4) {
      throw new Error('This seems not to be a contract.');
    }

    this.ask(
      `The 'calldata' aka the input data for this contract call`,
      '0x',
      'calldata',
      this.onCalldata
    );
  }

  async onCalldata (ctx) {
    if (!ethers.utils.isBytesLike(ctx.calldata)) {
      throw new Error('invalid value');
    }

    this.onDone(ctx);
  }
}
