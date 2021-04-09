const TEMPLATE =
`
<nav id="menu">
  <input type="checkbox" id="burger"/>
  <label for="burger"></label>
  <ul id="menu-items">
    <li><a href="/" class="lightred"><span class="icon">🏕️</span> Home</a></li>
    <li><a href="/evolution/" class="lightgreen"><span class="icon">🌱</span> Evolution</a></li>
    <li><a href="/token/" class="lightstraw"><span class="icon">🌞</span> Token</a></li>
    <li><a href="/lp/" class="lightblue"><span class="icon">💎</span> Mining</a></li>
    <li><a href="/testnet/" class="lightgrey"><span class="icon">🎮</span> Testnet</a></li>
  </ul>
</nav>`;

class HabitatMenu extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;

    const page = window.location.pathname;
    this.querySelectorAll('#menu a').forEach(a => {
      if (new URL(a.href).pathname === page) {
        a.classList.add("active")
      }
    });

    document.body.addEventListener("click", (e) => {
      if (e.target.parentNode.id === "menu") return;
      document.getElementById("burger").checked = false;
    });

    const breakpoint = document.querySelector("#menu-breakpoint");
    if (breakpoint) {
      const observer = new IntersectionObserver(entries => {
        const y = entries[0].boundingClientRect.y;

        if ((y - window.innerHeight ) <= 0  && !matchMedia("(max-width: 1024px)").matches) {
          document.body.classList.remove("with-burger-menu");
        } else {
          document.body.classList.add("with-burger-menu");
        }
      });
      observer.observe(breakpoint);
    } else {
      document.body.classList.add("with-burger-menu");
    }
  }
}

customElements.define('habitat-menu', HabitatMenu);
