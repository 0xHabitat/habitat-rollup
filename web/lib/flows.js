import { getSigner, setupTokenlist, getErc20, getToken, getTokenSymbol, walletIsConnected } from './utils.js';
import { getProviders, sendTransaction, setupModulelist, doQuery, resolveName, getShortString } from './rollup.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

export function stringDance (ele, str, _childs, idx, _skip) {
  if (_skip) {
    window.requestAnimationFrame(
      function ()  {
        stringDance(ele, str, _childs, idx, !_skip);
      }
    );
    return;
  }

  const len = str.length;

  if (!_childs) {
    ele.textContent = '';
    for (let i = 0; i < len; i++) {
      let c = document.createElement('span');
      let val = str[i];
      let x = '#';
      if (val === '.' || val === ' ' || val === '\n') {
        x = val;
      }
      c.textContent = x;
      ele.appendChild(c);
    }
    _childs = ele.children;
    idx = 0;
  }

  if (_childs.length !== len) {
    console.log('stringDance skip');
    return;
  }

  if (idx < len) {
    _childs[idx].textContent = str[idx];
    idx++;
  }

  const done = idx === len;
  if (!done) {
      window.requestAnimationFrame(
      function ()  {
        stringDance(ele, str, _childs, idx, !_skip);
      }
    );
  }
}

export class BaseFlow {
  constructor (root) {
    const existingFlow = root.querySelector('.flow');
    if (existingFlow) {
      existingFlow.remove();
    }

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
    this.container.parentElement.id = 'expanded';
  }

  _trap (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
  }

  ask (str, placeholder, callback) {
    this._inputCallback = callback;
    this.input.placeholder = placeholder;
    this.input.disabled = false;
    this.input.focus();

    stringDance(this.notifyBox, str);

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
      const str = this.input.value.split(' - ')[0];

      this.input.blur();
      this.input.value = '';
      this.input.placeholder = '';
      this.input.disabled = true;

      this.handleCallback(this._inputCallback, str);
    }
  }

  confirm (label, str, callback) {
    this._buttonCallback = callback;
    this.confirmButton.textContent = label;
    this.confirmButton.style.visibility = 'visible';
    this.confirmButton.style.animation = 'jumpIn 1s';

    if (str) {
      stringDance(this.notifyBox, str);
    }
  }

  onConfirm (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();

    this.confirmButton.style.animation = 'none';
    this.confirmButton.style.visibility = 'hidden';

    this.handleCallback(this._buttonCallback);
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
      console.log(e);
      this.notifyBox.textContent = '';
      this.writeError((e.error ? e.error.message : '') || e.message || e.toString());
      this.confirm('Retry', '', () => this.handleCallback(oldCallback, oldArg));
    }
  }

  async runNext (callback, arg) {
    this.prev = callback;
    this.prevArg = arg;

    await this.handleCallback(callback, arg);
  }

  writeError (str) {
    stringDance(this.errorBox, str);
  }

  write (str) {
    stringDance(this.notifyBox, str);
  }

  onDone () {
    this._destroyed = true;

    const root = this.container.parentElement;
    const container = this.container;

    function animate () {
      root.style.animation = 'none';
      container.removeEventListener('animationend', animate, false);
      container.remove();
      root.id = '';
    }

    container.addEventListener('animationend', animate, false);
    container.style.animation = 'jumpIn 1s reverse';
    root.style.animation = 'blink 1s reverse';
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

    this.signer = await getSigner();
    this.runNext(this.setupFlow);
  }
}

export class DepositFlow extends BaseFlow {
  constructor (root, callback) {
    super(root);

    this.context = { callback };
    this.runNext(this.setupWallet);
  }

  async setupFlow () {
    await setupTokenlist();
    this.input.setAttribute('list', 'tokenlist');

    this.ask(
      'Which Token do you like to deposit?',
      'Select',
      this.amountStep
    );
  }

  async amountStep (str) {
    this.input.setAttribute('list', '');
    this.erc20 = await getToken(str);
    this.tokenSymbol = await getTokenSymbol(this.erc20.address);

    this.ask(
      `How much ${this.tokenSymbol} do you want to deposit?`,
      'Deposit amount',
      this.confirmDeposit
    );
  }

  confirmDeposit (str) {
    const number = parseFloat(str);
    if (!number || number <= 0) {
      throw new Error('Invalid Amount.');
    }

    this._amount = str;
    this.confirm(
      'Confirm',
      `Tap 'Confirm' to deposit ${this._amount} ${this.tokenSymbol}.`,
      this.onConfirmDeposit
    );
  }

  async onConfirmDeposit () {
    const decimals = await this.erc20.decimals();
    const amount = ethers.utils.parseUnits(this._amount, decimals);

    this.runNext(this.deposit, amount);
  }

  async deposit (val) {
    const signer = await getSigner();
    const { habitat } = await getProviders();
    const allowance = await this.erc20.allowance(await signer.getAddress(), habitat.address);
    const erc20 = this.erc20.connect(signer);

    if (allowance.lt(val)) {
      this.write('Allowance too low.\nPlease sign a transaction to increase the token allowance first.');
      const tx = await erc20.approve(habitat.address, val);
      this.write(`Waiting for the transaction to be mined...`);
      await tx.wait();
    }

    this.write('Waiting for wallet...');
    const tx = await habitat.connect(signer).deposit(erc20.address, val, await signer.getAddress());
    this.write(`Waiting for the transaction to be mined...`);
    await tx.wait();

    this.context.callback();
    this.confirm(
      'Done',
      `Deposit Completed 🙌`,
      this.onDone
    );
  }
}

// xxx implement and combine Exit & Withdraw steps
export class WithdrawFlow extends BaseFlow {
  constructor (root, token) {
    super(root);

    if (token) {
      this.runNext(this.amountStep, token);
    } else {
      this.runNext(this.setupFlow);
    }
  }

  async setupFlow () {
    const signer = await getSigner();
    const { habitat } = await getProviders();
    const erc20 = 0;
    const availableForExit =
      (await habitat.connect(signer).getERC20Exit(erc20.address, await signer.getAddress())).toHexString();

    const str = ethers.utils.formatUnits(availableForExit, await erc20.decimals());

    if (Number(str) === 0) {
      throw new Error('Nothing to withdraw yet. It can take a while for ragequited shares to become available.');
    }

    this.confirm(
      'Confirm',
      `Tap 'Confirm' to withdraw ${str} ${this.tokenSymbol}.`,
      this.onConfirmWithdraw
    );
  }

  async onConfirmWithdraw () {
    this.write('Waiting for wallet...');

    const tx = await this.habitat.connect(signer).withdraw(this.erc20.address, 0);
    this.confirm(
      'Done',
      `Withdraw transaction hash: ${tx.hash}.`,
      this.onDone
    );
  }
}

export class CreateCommunityFlow extends BaseFlow {
  constructor (root) {
    super(root);

    this.context = {};
    this.runNext(this.setupWallet);
  }

  async setupFlow () {
    this.ask(
      `What should be the name of your community?`,
      'Community Name',
      this.confirmName
    );
  }

  async confirmName (str) {
    this.context.name = str;
    await setupTokenlist();
    this.input.setAttribute('list', 'tokenlist');

    this.ask(
      `What is the Governance Token of the community?`,
      'Governance Token',
      this.confirmGovernanceToken
    );
  }

  async confirmGovernanceToken (str) {
    this.input.setAttribute('list', '');
    const erc20 = await getToken(str);
    this.context.governanceToken = erc20.address;
    const tknName = await erc20.name();

    this.confirm(
      'Looks Good',
      `So, you are creating ${this.context.name} by using ${tknName}?`,
      this.looksGood
    );
  }

  async looksGood () {
    let args = {
      governanceToken: this.context.governanceToken,
      metadata: JSON.stringify({ title: this.context.name }),
    };
    let tmp = await sendTransaction('CreateCommunity', args, this.signer, this.habitat);

    this.confirm(
      'Done',
      'Confirmed! Welcome to the 🏕',
      this.onDone
    );
  }
}

export class CreateTreasuryFlow extends CreateCommunityFlow {
  constructor (root, communityId, callback) {
    super(root);

    this.context.communityId = communityId;
    this.context.callback = callback;
    this.runNext(this.setupFlow);
  }

  async setupFlow () {
    this.ask(
      `What should be the name of the Treasury?`,
      'e.g. Marketing 💰',
      this.confirmName
    );
  }

  async confirmName (str) {
    this.context.name = str;
    await setupModulelist();
    this.input.setAttribute('list', 'modulelist');

    this.ask(
      `Which smart contract is the gatekeeper of this treasury?`,
      'Choose from the list',
      this.confirmCondition
    );
  }

  async confirmCondition (str) {
    const [moduleName, address] = str.split('@');
    this.context.address = address;
    this.confirm(
      'Looks Good',
      `So, you are creating ${this.context.name} which is managed by ${moduleName}?`,
      this.looksGood
    );
  }

  async looksGood () {
    const args = {
      communityId: this.context.communityId,
      condition: this.context.address,
      metadata: JSON.stringify({ title: this.context.name }),
    };
    let tmp = await sendTransaction('CreateVault', args, this.signer, this.habitat);

    this.context.callback(tmp);
    this.confirm(
      'Done',
      'Confirmed! You can now fill your chest with 🍌',
      this.onDone
    );
  }
}

export class UsernameFlow extends BaseFlow {
  constructor (root, callback) {
    super(root);

    this.context = { callback };
    this.runNext(this.setupFlow);
  }

  async setupFlow () {
    this.ask(
      `What name do you like?`,
      'e.g. Sabrina the 🙀',
      this.confirmName
    );
  }

  async confirmName (username) {
    this.context.shortString = getShortString(username);
    const logs = await doQuery('ClaimUsername', null, this.context.shortString);
    if (logs.length) {
      throw new Error('Ouch, that one is already taken 😢');
    }

    this.confirm(
      'Looks Good',
      `It's not taken! You are about to claim ${username}`,
      this.looksGood
    );
  }

  async looksGood () {
    const args = {
      shortString: this.context.shortString,
    };
    let tmp = await sendTransaction('ClaimUsername', args, this.signer, this.habitat);

    this.context.callback(tmp);
    this.confirm(
      'Done',
      'Confirmed! You can now freak out 💃',
      this.onDone
    );
  }
}

export class TransferFlow extends BaseFlow {
  constructor (root, token) {
    super(root);

    this.context = {};
    if (token) {
      this.runNext(this.amountStep, token);
    } else {
      this.runNext(this.setupFlow);
    }
  }

  async setupFlow () {
    await setupTokenlist();
    this.input.setAttribute('list', 'tokenlist');

    this.ask(
      'Which Token do you like to Transfer?',
      'Select',
      this.amountStep
    );
  }

  async amountStep (str) {
    this.input.setAttribute('list', '');
    this.context.erc20 = await getToken(str);
    this.context.tokenSymbol = await getTokenSymbol(this.context.erc20.address);

    this.ask(
      `How much ${this.context.tokenSymbol} do you want to Transfer?`,
      'Amount',
      this.onConfirmAmount
    );
  }

  onConfirmAmount (str) {
    const number = parseFloat(str);
    if (!number || number <= 0) {
      throw new Error('Invalid Amount.');
    }

    this.context.amount = str;
    this.ask(
      `Who is the Receiver?`,
      'Address, Username or ENS',
      this.onConfirmReceiver
    );
  }

  async onConfirmReceiver (str) {
    this.context.receiver = await resolveName(str);
    if (!this.context.receiver) {
      throw new Error('not found');
    }

    this.confirm(
      'Sign',
      `Please double check the receiver:\n${this.context.receiver}`,
      this.doTransfer
    );
  }

  async doTransfer (val) {
    const amount = ethers.utils.parseUnits(this.context.amount, this.context.erc20._decimals).toHexString();
    const args = {
      token: this.context.erc20.address,
      to: this.context.receiver,
      value: amount,
    };
    const receipt = await sendTransaction('TransferToken', args);

    this.confirm(
      'Done',
      `Transaction hash: ${receipt.transactionHash}`,
      this.onDone
    );
  }
}
