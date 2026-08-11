/* Hero portrait roulette.

   soul.png is the face of the page, so the first view of a session always shows
   it - index.html ships with soul.png as the src and this script only ever
   swaps it away. From the second view on (a refresh, or back/forward into the
   page) dinozavrik gets a 1-in-5 shot.

   Note: a hard refresh (Ctrl+Shift+R) keeps sessionStorage alive too, so it
   behaves like a normal refresh here - the browser gives us no way to tell the
   two apart. Closing the tab is what resets the "first view" state. */

const DINO_CHANCE = 0.2;
const SEEN_KEY = "hero-photo-seen";

const photo = document.getElementById("hero-photo-img");

/* Private-mode browsers can throw on storage access, and a missing dice roll
   should never take the whole hero down with it. */
const readSeen = () => {
  try { return sessionStorage.getItem(SEEN_KEY) === "1"; }
  catch { return false; }
};
const markSeen = () => {
  try { sessionStorage.setItem(SEEN_KEY, "1"); }
  catch { /* nothing to do - we just always show soul.png */ }
};

if (photo) {
  const [navigation] = performance.getEntriesByType("navigation");
  const isRevisit = readSeen() || (navigation && navigation.type !== "navigate");

  if (isRevisit && Math.random() < DINO_CHANCE) {
    photo.src = "profile_photos/dinozavrik.png";
    photo.alt = "Dinozavrik";
  }
  markSeen();
}

/* ------------------------------------------------------------------------- *
   The dragon (dragon-embed.js)

   She stands under the copy, level with the cat's feet in the portrait. That
   line can't be a CSS number: the portrait is capped in vh and shrinks with the
   column, so the only way to hit it is to measure the rendered <img> and take
   the fraction of it the paws sit at. Below 900px the hero stacks and the CSS
   puts her back in the flow, so we clear whatever we wrote.
 * ------------------------------------------------------------------------- */

/* Where the paws land in soul.png, as a fraction of the file's full height -
   measured off the alpha channel (1226px of 1402px), including the transparent
   strip under it, since the <img> box keeps that padding. */
const CAT_FEET_RATIO = 0.874;

/* And where the dragon's own feet are, as a fraction of her cropped frame. She
   ends the animation standing (y=170.79 of a 13..221 viewBox), so lining her
   frame up centre-to-centre would sink her below the cat; this puts the two of
   them on one ground line. */
const DRAGON_FEET_RATIO = 0.759;

const COPY_GAP = 14;   // clear space between the last line of copy and her frame
const HERO_GAP = 10;   // and between her frame and the bottom of the section

const dragonBox = document.getElementById("hero-dragon");
const hero = document.getElementById("hero");
const heroContent = document.getElementById("hero-content");

if (dragonBox && hero && heroContent && photo && window.Dragon) {
  window.Dragon.mount(dragonBox, {
    size: "100%",                 // her frame is the box; hero.css sizes both
    dragon: "#ffffff",            // she is white, like the cat
    edge: "#c3d1cb",              // just enough grey to keep wing and body apart
    accent: "var(--main-color)",  // her eye
    entrance: 1200,
  });

  const stacked = window.matchMedia("(max-width:900px)");

  /* #hero-content is a full-height centred column, so its own box reaches far
     below the words in it. The last line is what she has to stay clear of, and
     which child holds it moves (#hero-intro is dropped on short phones), so ask
     the children rather than the column. */
  const copyBottom = () => {
    let bottom = heroContent.getBoundingClientRect().top;
    for (const kid of heroContent.children) {
      const rect = kid.getBoundingClientRect();
      if (rect.height) bottom = Math.max(bottom, rect.bottom);
    }
    return bottom;
  };

  const place = () => {
    if (stacked.matches) {
      dragonBox.style.left = "";
      dragonBox.style.top = "";
      dragonBox.classList.add("is-placed");
      return;
    }
    const heroRect = hero.getBoundingClientRect();
    const photoRect = photo.getBoundingClientRect();
    const contentRect = heroContent.getBoundingClientRect();
    const boxRect = dragonBox.getBoundingClientRect();
    if (!photoRect.height) return;   // portrait hasn't loaded yet

    const line = photoRect.top + photoRect.height * CAT_FEET_RATIO - heroRect.top;
    /* Where she'd have to start for her feet to meet that line - then pushed
       down if the copy runs that far, because landing on the text is worse than
       standing a little low. On a short viewport even that can't fit, and she
       sits out rather than hanging off the section. */
    const wanted = line - boxRect.height * DRAGON_FEET_RATIO;
    const top = Math.max(wanted, copyBottom() - heroRect.top + COPY_GAP);
    const fits = top + boxRect.height <= heroRect.height - HERO_GAP;

    dragonBox.style.left =
      contentRect.left - heroRect.left + (contentRect.width - boxRect.width) / 2 + "px";
    dragonBox.style.top = top + "px";
    dragonBox.classList.toggle("is-placed", fits);
  };

  place();
  /* The portrait decides the line, so watch it directly: that covers the first
     decode, the dino swap above, and every reflow the column goes through. */
  photo.addEventListener("load", place);
  window.addEventListener("resize", place);
  if ("ResizeObserver" in window) new ResizeObserver(place).observe(photo);
}
