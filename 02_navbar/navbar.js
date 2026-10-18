const navbar = document.getElementById("navbar");
const navLinks = [...navbar.querySelectorAll(".navlink")];

/* Hide on scroll down, show on scroll up - but calmly:
   - small wiggles (under THRESHOLD px of travel in one direction) are ignored,
     so a trackpad nudge or a slow read doesn't flicker the bar;
   - near the top of the page the bar always stays visible;
   - iOS overscroll bounce (negative scrollY) is clamped away;
   - the bar never hides while it holds keyboard focus;
   - one check per frame, on a passive listener. */
const THRESHOLD = 10;
const ALWAYS_SHOW_ABOVE = 80;

let anchorY = Math.max(0, window.scrollY); // where the current direction began
let lastY = anchorY;
let ticking = false;

function setHidden(hidden) {
  if (hidden && navbar.matches(":focus-within")) return;
  navbar.classList.toggle("hidden-navbar", hidden);
}

function onScrollFrame() {
  ticking = false;
  const y = Math.max(0, window.scrollY);
  if (y === lastY) return;

  if (y <= ALWAYS_SHOW_ABOVE) {
    setHidden(false);
  } else {
    // Direction changed: restart measuring from here.
    if ((y > lastY) !== (lastY > anchorY)) anchorY = lastY;

    if (y - anchorY > THRESHOLD) setHidden(true);
    else if (anchorY - y > THRESHOLD) setHidden(false);
  }
  lastY = y;
}

window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });

// Tabbing into a hidden bar brings it back, so focus is never off-screen.
navbar.addEventListener("focusin", () => setHidden(false));

/* Current section: the link of whichever section crosses the middle of the
   screen gets aria-current (navbar.css draws the indicator under it). */
const sectionFor = new Map(
  navLinks.map(link => [link, document.querySelector(link.getAttribute("href"))])
);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        if (sectionFor.get(link) === entry.target) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -45% 0px" });

  new Set(sectionFor.values()).forEach(section => section && observer.observe(section));
}
