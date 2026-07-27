let slider = null;
let navbar = null;
let myWorkContainer = null;

let worksData = [];
let currentStyle = "line"; // "line" | "grid"

// Panels are built once per (style, tab) combo and kept around instead of
// being torn down on every tab switch, keyed by "style:type". Reset on every
// initMyWorks() call since a fresh call means the DOM subtree was rebuilt.
let panelCache = new Map();

// Bumped on every initMyWorks() call so a superseded call (e.g. the user
// navigated away and back before the first call's fetch resolved) can tell
// it's no longer current and bail out instead of acting on stale elements.
let initToken = 0;

const MY_WORK_FIELDS = [
    ["my-work-image", "image"],
    ["my-work-name", "name"],
    ["my-work-description", "description"],
    ["my-work-url", "url"],
    ["my-work-skill", "skill"],
];

// One JSON file per tab; the tab (and thus entry.type) is decided by which
// file an entry lives in, so the files themselves don't carry a "type" field.
// "Good Person :)" has no file - it just shows an empty-state message.
const WORKS_FILES = {
    design: "Data/my_works/design.json",
    programming: "Data/my_works/programming.json",
    engineering: "Data/my_works/engineering.json",
};

// Text shown when a tab has no entries yet. Anything not listed uses the
// default; the moment its file gains entries they render normally instead.
const DEFAULT_EMPTY = "No works yet";
const EMPTY_MESSAGES = {
    "good person :)": "Will be filled on last update :)",
};

// A value counts as an image when it looks like a path/URL (has a "." or "/");
// plain words like "image" stay as literal text (handy placeholders).
function isImagePath(value) {
    return typeof value === "string" && /[./]/.test(value);
}

// Photo paths inside a works file are written relative to THAT FILE - which is
// how "../work_photos/congix.jpg" reads sitting in Data/my_works/. A bare src,
// though, is resolved by the browser against the *page*, so the same entry
// would point somewhere else on the live site than on a preview page and 404.
// Rebasing them once, at load time, makes the JSON mean what it looks like it
// means from wherever it's loaded.
function resolveAsset(value, file) {
    if (!isImagePath(value)) return value; // plain-text placeholder, leave it be
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//") || value.startsWith("/")) {
        return value; // already absolute (http:, data:, site root, ...)
    }
    return new URL(value, new URL(file, window.location.href)).href;
}

// Fills a thumbnail cell: a real <img> that fills the frame when the value is
// a path/URL, otherwise the raw text. Falls back to text if the image 404s.
function fillImageCell(cell, value) {
    if (isImagePath(value)) {
        cell.classList.add("has-image");
        const img = document.createElement("img");
        img.src = value;
        img.alt = "";
        img.addEventListener("error", () => {
            cell.classList.remove("has-image");
            cell.textContent = value;
        });
        cell.appendChild(img);
    } else {
        cell.textContent = value ?? "";
    }
}

// Fills the address cell with a real link that opens in a new tab. The click
// is kept to itself so following the link doesn't also open the detail
// overlay behind it. An empty url just leaves the cell blank.
function fillUrlCell(cell, entry) {
    if (!entry.url) return;

    cell.appendChild(buildUrlLink(entry, "my-work-url-link", true));
}

// The clickable address: "displayUrl" is the wording shown to the reader
// ("Visit the site", the project's name, anything), and only the underlying
// "url" is ever opened. Without it the address itself is shown, tidied up.
function buildUrlLink(entry, className, stopClick = false) {
    const link = document.createElement("a");
    link.className = className;
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = entry.displayUrl || prettyUrl(entry.url);
    if (stopClick) link.addEventListener("click", e => e.stopPropagation());

    return link;
}

// Shows the address the way people read it: no scheme, no trailing slash.
function prettyUrl(value) {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function buildPanel(entries, extraClass, buildItem) {
    const panel = document.createElement("div");
    panel.className = extraClass ? `my-work-panel ${extraClass}` : "my-work-panel";

    entries.forEach((entry, index) => panel.appendChild(buildItem(entry, index)));

    return panel;
}

// Detail overlay, same pattern as the Skills section: an in-page panel that
// covers the list and shows the clicked work in full; ✕ closes it.
function openWorkDetail(entry) {
    closeWorkDetail();

    const overlay = document.createElement("div");
    overlay.className = "work-detail-overlay";

    const close = document.createElement("button");
    close.className = "work-detail-close";
    close.textContent = "✕";
    close.addEventListener("click", closeWorkDetail);

    const name = document.createElement("h2");
    name.className = "work-detail-name";
    name.textContent = entry.name ?? "";

    overlay.appendChild(close);
    overlay.appendChild(name);

    // Gallery: render every URL in `images` (any count) as its own image.
    // When there's no gallery, fall back to the single `image` thumbnail so
    // the overlay still shows something. Non-path values render as a text box.
    const gallery = Array.isArray(entry.images) ? entry.images.filter(Boolean) : [];
    if (gallery.length === 0 && entry.image) gallery.push(entry.image);

    if (gallery.length) {
        const wrap = document.createElement("div");
        wrap.className = "work-detail-gallery";
        gallery.forEach(src => {
            if (isImagePath(src)) {
                const img = document.createElement("img");
                img.className = "work-detail-photo";
                img.src = src;
                img.alt = entry.name ?? "";
                img.addEventListener("error", () => img.remove());
                wrap.appendChild(img);
            } else {
                const box = document.createElement("div");
                box.className = "work-detail-image-box";
                box.textContent = src;
                wrap.appendChild(box);
            }
        });
        overlay.appendChild(wrap);
    }

    // The overlay shows the long-form copy, falling back to the short version
    // (the one shown on the line/grid list) when no full text was written.
    const descText = entry.fullDescription || entry.description;
    if (descText) {
        const desc = document.createElement("div");
        desc.className = "work-detail-description";
        desc.textContent = descText;
        overlay.appendChild(desc);
    }

    if (entry.url) overlay.appendChild(buildUrlLink(entry, "work-detail-url"));

    // The customer review lives only here, in the overlay - the list shows the
    // work's address in its place.
    if (entry.fullReview) {
        const review = document.createElement("blockquote");
        review.className = "work-detail-review";
        review.textContent = entry.fullReview;
        overlay.appendChild(review);
    }

    if (entry.skill) {
        const skill = document.createElement("span");
        skill.className = "work-detail-skill";
        skill.textContent = entry.skill;
        overlay.appendChild(skill);
    }

    myWorkContainer.appendChild(overlay);
}

function closeWorkDetail() {
    myWorkContainer?.querySelector(".work-detail-overlay")?.remove();
}

function buildLinePanel(entries) {
    return buildPanel(entries, null, (entry, index) => {
        const line = document.createElement("div");
        line.className = "line";
        line.style.animationDelay = `${index * 60}ms`;

        MY_WORK_FIELDS.forEach(([className, field]) => {
            const el = document.createElement("div");
            el.className = className;
            if (field === "image") fillImageCell(el, entry.image);
            else if (field === "url") fillUrlCell(el, entry);
            else el.textContent = entry[field] ?? "";
            line.appendChild(el);
        });

        line.addEventListener("click", () => openWorkDetail(entry));
        return line;
    });
}

function buildGridPanel(entries) {
    return buildPanel(entries, "my-work-grid-panel", entry => {
        const card = document.createElement("div");
        card.className = "grid";

        const image = document.createElement("div");
        image.className = "grid-image";
        fillImageCell(image, entry.image);

        const name = document.createElement("h2");
        name.className = "grid-name";
        name.textContent = entry.name ?? "";

        const description = document.createElement("div");
        description.className = "grid-description";
        description.textContent = entry.description ?? "";

        const info = document.createElement("div");
        info.className = "grid-info";
        info.appendChild(name);
        info.appendChild(description);

        card.appendChild(image);
        card.appendChild(info);
        card.addEventListener("click", () => openWorkDetail(entry));
        return card;
    });
}

// An empty-state panel: shown for any tab that has no entries (Engineering
// until it gets works, Good Person :) always). Same .my-work-panel shell so
// showTab slides it in/out like any other panel.
function buildEmptyPanel(type) {
    const panel = document.createElement("div");
    panel.className = "my-work-panel my-work-empty-panel";

    const message = document.createElement("div");
    message.className = "my-work-empty";
    message.textContent = EMPTY_MESSAGES[type] ?? DEFAULT_EMPTY;

    panel.appendChild(message);
    return panel;
}

function buildWorkPanel(type) {
    const entries = worksData.filter(entry => entry.type === type);
    if (entries.length === 0) return buildEmptyPanel(type);
    return currentStyle === "grid" ? buildGridPanel(entries) : buildLinePanel(entries);
}

function animateLineEntrance(panel) {
    panel.querySelectorAll(".line").forEach(line => line.classList.add("entering"));
}

// Marks every element as leaving and calls onDone once all of their exit
// animations have finished (immediately if there's nothing to wait for).
function waitForLeaveThenApply(elements, onDone) {
    if (elements.length === 0) {
        onDone();
        return;
    }

    let remaining = elements.length;
    elements.forEach(el => {
        el.classList.add("leaving");
        el.addEventListener("animationend", () => {
            remaining -= 1;
            if (remaining === 0) onDone();
        }, { once: true });
    });
}

// Groups the panel's cards into their actual rendered rows, then assigns each
// card an entrance direction: the left half of a row slides in from the left,
// the right half from the right, and - when a row has an odd count - the
// middle card drops in from the top.
function animateGridEntrance(panel) {
    const cards = [...panel.querySelectorAll(".grid")];
    if (cards.length === 0) return;

    const rows = [];
    cards.forEach(card => {
        const top = card.offsetTop;
        let row = rows.find(r => Math.abs(r.top - top) < 1);
        if (!row) {
            row = { top, cards: [] };
            rows.push(row);
        }
        row.cards.push(card);
    });

    rows.forEach(row => {
        const count = row.cards.length;
        const middle = count % 2 === 1 ? (count - 1) / 2 : -1;

        row.cards.forEach((card, i) => {
            let x = 0;
            let y = 0;

            if (i === middle) y = -60;
            else if (i < count / 2) x = -80;
            else x = 80;

            card.style.setProperty("--slide-x", `${x}px`);
            card.style.setProperty("--slide-y", `${y}px`);
            card.style.animationDelay = `${i * 60}ms`;
            card.classList.add("entering");
        });
    });
}

// direction: 0 = no previous content to slide from (instant swap),
// 1 = new tab is to the right (content enters from the right),
// -1 = new tab is to the left (content enters from the left).
//
// Panels persist in the DOM once built (see panelCache) so revisiting a tab
// is a pure slide with no rebuild. The per-item entrance choreography only
// plays when forceEntrance is set (a deliberate line/grid style switch) -
// plain tab navigation never triggers it, even the first time a tab is built.
function showTab(typeLabel, direction = 0, forceEntrance = false) {
    if (!myWorkContainer) return;

    closeWorkDetail();

    const type = typeLabel.trim().toLowerCase();
    const key = `${currentStyle}:${type}`;

    let panel = panelCache.get(key);
    if (!panel) {
        panel = buildWorkPanel(type);
        panelCache.set(key, panel);
    }

    // Strip any leftover "leaving" state from a previous style switch away
    // from this panel, so revisiting it doesn't resume mid-exit.
    panel.querySelectorAll(".leaving").forEach(el => el.classList.remove("leaving"));

    const oldPanel = myWorkContainer.querySelector(".my-work-panel.visible");
    if (oldPanel === panel) return;

    if (panel.parentNode !== myWorkContainer) myWorkContainer.appendChild(panel);
    if (oldPanel) oldPanel.classList.remove("visible");
    panel.classList.add("visible");

    if (!oldPanel || direction === 0) {
        panel.style.transition = "none";
        panel.style.transform = "translateX(0)";
        void panel.offsetWidth;
        panel.style.transition = "";
    } else {
        panel.style.transition = "none";
        panel.style.transform = `translateX(${direction * 100}%)`;

        // force layout so the starting position is committed before animating
        void panel.offsetWidth;

        requestAnimationFrame(() => {
            panel.style.transition = "";
            oldPanel.style.transform = `translateX(${-direction * 100}%)`;
            panel.style.transform = "translateX(0)";
        });
    }

    if (forceEntrance) {
        if (panel.classList.contains("my-work-grid-panel")) animateGridEntrance(panel);
        else animateLineEntrance(panel);
    }
}

function sectionIndex(item) {
    return [...document.querySelectorAll(".works_section")].indexOf(item);
}

// Shared in-flight fetch, so overlapping initMyWorks() calls (e.g. rapidly
// navigating away from and back to My Works) await the same request instead
// of each firing their own.
let worksDataPromise = null;

async function loadWorksData() {
    if (worksData.length > 0) return;

    // Fetch every tab's file in parallel and tag each entry with its type
    // (taken from the file it came from). A missing or empty file just means
    // that tab has no works yet - it shows the empty state instead of failing.
    if (!worksDataPromise) {
        worksDataPromise = Promise.all(
            Object.entries(WORKS_FILES).map(([type, file]) =>
                fetch(file)
                    .then(response => response.json())
                    .then(list => (Array.isArray(list) ? list : []).map(entry => ({
                        ...entry,
                        type,
                        image: resolveAsset(entry.image, file),
                        images: Array.isArray(entry.images)
                            ? entry.images.map(src => resolveAsset(src, file))
                            : entry.images,
                    })))
                    .catch(() => [])
            )
        ).then(results => results.flat());
    }
    worksData = await worksDataPromise;
}

function setActive(target) {
    const current = document.querySelector(".works_section.active");
    const direction = current ? Math.sign(sectionIndex(target) - sectionIndex(current)) : 0;

    if (current) current.classList.remove("active");
    target.classList.add("active");

    showTab(target.textContent, direction);
}

// The slider hugs whatever tab it selects: its width follows the tab's width
// (plus a little breathing room for the glow), on every screen size.
const SLIDER_PAD = 26;

function moveSliderTo(target) {
    if (!slider || !target) return;

    const currentLeft = slider.offsetLeft;
    const newWidth = target.offsetWidth + SLIDER_PAD;
    // Never let the halo poke past the bar's left edge (first tab sits close).
    const newLeft = Math.max(target.offsetLeft - SLIDER_PAD / 2, 2);

    slider.classList.add("moving");
    slider.style.width = `${newWidth}px`;
    slider.style.left = `${newLeft}px`;

    // When the bar scrolls (phone chips), keep the selected tab in view.
    if (navbar && navbar.scrollWidth > navbar.clientWidth) {
        const chipLeft = target.offsetLeft - 40;
        const chipRight = target.offsetLeft + target.offsetWidth + 40;
        if (chipLeft < navbar.scrollLeft) {
            navbar.scrollTo({ left: chipLeft, behavior: "smooth" });
        } else if (chipRight > navbar.scrollLeft + navbar.clientWidth) {
            navbar.scrollTo({ left: chipRight - navbar.clientWidth, behavior: "smooth" });
        }
    }

    // Left isn't actually changing (e.g. a press-release with no drag), so
    // no "left" transitionend will ever fire to clear the dimmed glow.
    if (Math.round(currentLeft) === Math.round(newLeft)) slider.classList.remove("moving");
}

// Sets up the My Works section against whatever markup is currently in the
// DOM. Safe to call more than once (e.g. every time portfolio.js injects a
// fresh copy of the markup) - it re-queries every element, resets the panel
// cache (the old panels belonged to a now-discarded subtree), and reattaches
// every listener from scratch.
export async function initMyWorks() {
    myWorkContainer = document.querySelector(".my-work");
    if (!myWorkContainer) return;

    const token = ++initToken;

    slider = document.getElementById("slider");
    navbar = document.getElementById("portfolio-active-content-navbar");

    currentStyle = "line";
    panelCache = new Map();

    if (slider) {
        slider.addEventListener("transitionend", e => {
            if (e.propertyName === "left") slider.classList.remove("moving");
        });
    }

    document.querySelectorAll(".works_section").forEach(item => {
        item.addEventListener("click", () => {
            setActive(item);
            moveSliderTo(item);
        });
    });

    const initialActive = document.querySelector(".works_section.active") || document.querySelector(".works_section");
    moveSliderTo(initialActive);

    // On phones the selector leaves the tabs bar and floats in the dock by the
    // bottom navigation (portfolio.js slides the dock in/out per section).
    // Clearing first drops the stale selector left from a previous visit.
    const dock = document.getElementById("style-selector-dock");
    if (dock) {
        dock.replaceChildren();
        const selector = document.querySelector(".style-selector");
        if (selector && window.matchMedia("(max-width: 680px)").matches) {
            dock.appendChild(selector);
        }
    }

    // Guards against a click landing mid-transition (e.g. clicking line then
    // grid again before the first exit animation finishes) - without this,
    // currentStyle hasn't flipped yet so the second click can't tell it's
    // mid-exit, and yanking the still-animating panel out of the DOM cancels
    // its animationend, dropping the first click's pending callback.
    let styleTransitioning = false;

    const styleSelectorButtons = document.querySelectorAll(".style-selector button");
    styleSelectorButtons.forEach(button => {
        button.addEventListener("click", () => {
            if (styleTransitioning || button.classList.contains("active")) return;
            styleTransitioning = true;

            const switchingToGrid = button.id === "grid-style-selector";
            const leavingLineView = currentStyle === "line" && switchingToGrid;
            const leavingGridView = currentStyle === "grid" && !switchingToGrid;

            styleSelectorButtons.forEach(other => other.classList.remove("active"));
            button.classList.add("active");

            const activeItem = document.querySelector(".works_section.active") || document.querySelector(".works_section");
            if (!activeItem) {
                styleTransitioning = false;
                return;
            }

            const visiblePanel = myWorkContainer.querySelector(".my-work-panel.visible");

            const applyStyle = () => {
                // Discard every panel mounted for the old style (they stay
                // referenced in panelCache, so switching back later rebuilds
                // nothing - just replays the entrance since it's a fresh mount).
                [...myWorkContainer.children].forEach(child => child.remove());

                currentStyle = switchingToGrid ? "grid" : "line";
                showTab(activeItem.textContent, 0, true);
                styleTransitioning = false;
            };

            if (leavingLineView) {
                const lines = visiblePanel ? [...visiblePanel.querySelectorAll(".line")] : [];
                waitForLeaveThenApply(lines, applyStyle);
                return;
            }

            if (leavingGridView) {
                const cards = visiblePanel ? [...visiblePanel.querySelectorAll(".grid")] : [];
                waitForLeaveThenApply(cards, applyStyle);
                return;
            }

            applyStyle();
        });
    });

    // Drag the slider left/right; releasing past the halfway point to a
    // neighboring tab snaps it there, otherwise it snaps back.
    if (slider && navbar) {
        let dragging = false;
        let startX = 0;
        let startLeft = 0;

        const center = el => el.offsetLeft + el.offsetWidth / 2;

        slider.addEventListener("pointerdown", e => {
            dragging = true;
            startX = e.clientX;
            startLeft = slider.offsetLeft;

            slider.classList.add("moving");
            slider.style.transition = "box-shadow .5s ease";
            slider.setPointerCapture(e.pointerId);
        });

        slider.addEventListener("pointermove", e => {
            if (!dragging) return;

            const delta = e.clientX - startX;
            const maxLeft = navbar.clientWidth - slider.offsetWidth;

            slider.style.left = `${Math.min(Math.max(startLeft + delta, 0), maxLeft)}px`;
        });

        slider.addEventListener("pointerup", e => {
            if (!dragging) return;
            dragging = false;
            slider.style.transition = "";

            const items = [...document.querySelectorAll(".works_section")];
            const activeItem = document.querySelector(".works_section.active");
            const activeIndex = items.indexOf(activeItem);
            const delta = e.clientX - startX;

            let targetItem = activeItem;

            if (delta < 0 && activeIndex > 0) {
                const neighbor = items[activeIndex - 1];
                if (Math.abs(delta) > (center(activeItem) - center(neighbor)) / 2) targetItem = neighbor;
            } else if (delta > 0 && activeIndex < items.length - 1) {
                const neighbor = items[activeIndex + 1];
                if (Math.abs(delta) > (center(neighbor) - center(activeItem)) / 2) targetItem = neighbor;
            }

            if (targetItem !== activeItem) setActive(targetItem);
            moveSliderTo(targetItem);
        });

        slider.addEventListener("pointercancel", () => {
            dragging = false;
            slider.style.transition = "";
            moveSliderTo(document.querySelector(".works_section.active"));
        });
    }

    await loadWorksData();
    if (token !== initToken) return; // a newer initMyWorks() call has since taken over
    if (initialActive) showTab(initialActive.textContent, 0, true);
}

// Preview pages (e.g. my_works_preview.html) already have the markup present
// at load time and don't go through portfolio.js's dynamic injection - so
// self-init when that's the case.
if (document.querySelector(".my-work")) initMyWorks();
