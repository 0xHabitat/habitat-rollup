export default function bananaFever () {
  const elements = [];
  for (let i = 0; i < 30; i++) {
    const e = document.createElement('p');
    e.textContent = '🍌';
    e.style.fontSize = '8em';
    e.style.position = 'absolute';

    const x = window.innerWidth * Math.random();
    const y = window.innerHeight * Math.random();

    e.style.left = `${x}px`;
    e.style.bottom = '0';
    e.style.setProperty('--tx', i % 2 === 0 ? `${x+y}px` : `${x-y}px`);
    e.style.setProperty('--ts', `${Math.random()}`);
    e.style.setProperty('--rz', `${(Math.random() * 360) % 360}deg`);
    e.style.animation = `${Math.random()}s banana ease-out`;
    e.onanimationend = (evt) => evt.target.remove();

    elements.push(e);
  }
  document.body.append(...elements);
}
