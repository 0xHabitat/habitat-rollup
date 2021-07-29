const TEMPLATE =
`
<nav id="menu">
  <input type="checkbox" id="burger"/>
  <label for="burger"></label>
  <ul id="menu-items">
    <li><a href="/" class="lightred"><span class="icon"><emoji-camping></emoji-camping></span> Home</a></li>
    <li><a href="/app/#habitat-evolution" class="lightgreen"><span class="icon"><emoji-seedling></emoji-seedling></span> Evolution</a></li>
    <li><a href="/token/" class="lightstraw"><span class="icon"><emoji-sunface></emoji-sunface></span> Token</a></li>
    <li><a href="/lp/" class="lightblue"><span class="icon"><emoji-diamond></emoji-diamond></span> Mining</a></li>
    <li><a href="/app/" class="lightgrey"><span class="icon"><emoji-rainbow></emoji-rainbow></span> App</a></li>
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
      if (e.target.parentNode && e.target.parentNode.id === "menu") return;
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
