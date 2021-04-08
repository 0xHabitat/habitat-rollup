import { renderTransaction } from '../common.js';

async function render () {
  const hash = window.location.hash.replace('#', '');
  const container = document.querySelector('#tx');

  renderTransaction(container, hash);
}

window.addEventListener('DOMContentLoaded', render, false);
