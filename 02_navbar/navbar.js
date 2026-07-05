let lastScroll=0;
const navbar = document.getElementById("navbar");
window.addEventListener("scroll",() => {
  const currentScroll = window.scrollY;
  if (currentScroll>lastScroll) {
    navbar.classList.add("hidden-navbar");
  } else if (currentScroll<lastScroll) {
    navbar.classList.remove("hidden-navbar");
  }
  lastScroll = currentScroll;
})