import { getSigner, walletIsConnected } from './utils.js';
import {
  sendTransaction,
  simulateTransaction,
  getShortString,
} from './rollup.js';

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
