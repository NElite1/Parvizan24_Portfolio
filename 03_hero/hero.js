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
