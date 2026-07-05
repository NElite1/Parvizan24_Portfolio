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
    ["my-work-customer-review", "customerReview"],
    ["my-work-skill", "skill"],
];

function buildPanel(entries, extraClass, buildItem) {
    const panel = document.createElement("div");
    panel.className = extraClass ? `my-work-panel ${extraClass}` : "my-work-panel";

    entries.forEach((entry, index) => panel.appendChild(buildItem(entry, index)));

    return panel;
}

function buildLinePanel(entries) {
    return buildPanel(entries, null, (entry, index) => {
        const line = document.createElement("div");
        line.className = "line";
        line.style.animationDelay = `${index * 60}ms`;

        MY_WORK_FIELDS.forEach(([className, field]) => {
            const el = document.createElement("div");
            el.className = className;
            el.textContent = entry[field] ?? "";
            line.appendChild(el);
        });

        return line;
    });
}

function buildGridPanel(entries) {
    return buildPanel(entries, "my-work-grid-panel", entry => {
        const card = document.createElement("div");
        card.className = "grid";

        const image = document.createElement("div");
        image.className = "grid-image";
        image.textContent = entry.image ?? "";

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
        return card;
    });
}

function buildWorkPanel(type) {
    const entries = worksData.filter(entry => entry.type === type);
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

    if (!worksDataPromise) {
        worksDataPromise = fetch("Data/my_works.json").then(response => response.json());
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

function moveSliderTo(target) {
    if (!slider || !target) return;

    const currentLeft = slider.offsetLeft;
    const newLeft = target.offsetLeft + (target.offsetWidth - slider.offsetWidth) / 2;

    slider.classList.add("moving");
    slider.style.left = `${newLeft}px`;

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
