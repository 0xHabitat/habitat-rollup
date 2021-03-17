import {
  wrapListener,
  renderAmount,
} from '/lib/utils.js';

const ONE_WEEK = 3600 * 24 * 7; // seconds
const MAX_WEEKS = ONE_WEEK * 12;
const MAX_HBT = 2_000_000;
const MAX_SHARE = Math.sqrt(MAX_HBT) * (MAX_WEEKS * MAX_WEEKS);
const MAX_REWARD = 1200;
const DAY = 3600 * 24;

function calcDailyReward (amount) {
  let cumulative = 0;
  const rewards = [];

  for (let seconds = 0; seconds < MAX_WEEKS; seconds += DAY) {
    const share = (Math.sqrt(amount) * (seconds * seconds)) / MAX_SHARE;
    const r = MAX_REWARD * share;
    rewards.push(r);
    cumulative += r;
  }

  return { cumulative, rewards };
}

async function render () {
  const description = document.querySelector('#description');
  const grid = document.querySelector('div#data');
  const input = document.querySelector('input#amt');
  const canvas = document.querySelector('canvas#graph');
  const ctx = canvas.getContext('2d');
  const scale = window.devicePixelRatio;
  const width = canvas.width;
  const height = canvas.height;

  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.scale(scale, scale);
  input.max = MAX_HBT;

  function draw () {
    const amount = Number(input.value);
    const { cumulative, rewards } = calcDailyReward(amount);
    const len = rewards.length;
    const maxReward = renderAmount(MAX_REWARD);

    description.textContent =
      `Daily max. Reward is ${maxReward} HBT for up to ${MAX_WEEKS / ONE_WEEK} Weeks.\nThe sum of all your rewards are ${renderAmount(cumulative)} HBT.`;
    let html = '';
    for (let day = 0; day < len; day++) {
      const v = renderAmount(rewards[day]);
      html += `<p>Day ${day + 1}</p><p>${v} HBT</p>`;
    }
    grid.innerHTML = html;

    const gap = width / len;
    const MAX_RELATIVE = rewards[len - 1];
    ctx.clearRect(0, 0, width, height);
    {
      ctx.strokeStyle = '#635BFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      let x = 0;
      for (let i = 0; i < len; i++) {
        const r = rewards[i] / MAX_RELATIVE;
        const y = height - (height * r);
        ctx.lineTo(x, y);
        //ctx.arc(x, y, 1, 0, Math.PI * 2);
        x += gap;
      }
      ctx.stroke();
      ctx.closePath();
    }

    /*
    {
      ctx.strokeStyle = '#FBDC60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      let x = 0;
      for (let i = 0; i < len; i++) {
        const r = rewards[i] / MAX_REWARD;
        const y = height - (height * r);
        ctx.lineTo(x, y);
        x += gap;
      }
      ctx.stroke();
      ctx.closePath();
    }
    */
  }

  wrapListener(input, draw, 'keyup');
  draw();
}

window.addEventListener('DOMContentLoaded', render, false);
