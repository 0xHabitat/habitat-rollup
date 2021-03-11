import {
  wrapListener,
} from '/lib/utils.js';

const STATS_URL = 'https://raw.githubusercontent.com/0xHabitat/statistics/master/stats.json';

async function update () {
  const ret = await (await fetch(STATS_URL)).json();
  document.querySelector('#topics').textContent = ret.totalTopics;
  document.querySelector('#members').textContent = ret.totalHolders;
  document.querySelector('#votes').textContent = ret.totalVotes;
}

function onTab (evt) {
  const target = evt.target.getAttribute('target');
  const ACTIVE = 'active';
  evt.target.parentElement.parentElement.querySelector('.active').classList.remove(ACTIVE);
  evt.target.parentElement.classList.add(ACTIVE);
  const targetSection = document.querySelector(target);
  const parentContainer = targetSection.parentElement;

  for (let i = 0, len = parentContainer.children.length; i < len; i++) {
    const section = parentContainer.children[i];
    if (section === targetSection) {
      parentContainer.style.transform = `translateX(-${100 * i}vw)`;
      break;
    }
  }
}

async function render () {
  for (const e of document.querySelectorAll('.tabs div')) {
    wrapListener(e, onTab);
  }

  setInterval(update, 30000);
  update();
}

window.addEventListener('DOMContentLoaded', render, false);
