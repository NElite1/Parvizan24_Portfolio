import { initMyWorks } from "./my_works/my_works.js";
import { initProjects } from "./my_projects/my_projects.js";
import { initSkills } from "./skills/skills.js";
import { buildDashboard } from "./dashboard/dashboard.js";

const portfolio = document.getElementById("portfolio");
const portfolioContent = document.getElementById("portfolio-content");

// Each section's markup for #portfolio-active-content. My Works and Skills
// carry their tab bars; Projects is one empty stage that my_projects.js fills.
const ACTIVE_CONTENT = {
    myWorks: `
        <div id="portfolio-active-content-navbar">
            <div id="slider"></div>
            <h3 class="works_section active">Design</h3>
            <h3 class="works_section">Programming</h3>
            <h3 class="works_section">Engineering</h3>
            <h3 class="works_section">Good Person :)</h3>
            <div class="style-selector">
              <button id="line-style-selector" class="active">
                <img src="icons/Menu.png">
              </button>
              <button id="grid-style-selector">
                <img src="icons/Grid.png">
              </button>
            </div>
        </div>
        <div class="my-work"></div>
    `,
    projects: `
        <div class="projects-stage"></div>
    `,
    skills: `
        <div id="portfolio-active-content-navbar">
            <div id="slider"></div>
            <h3 class="works_section active">Programming</h3>
            <h3 class="works_section">Design</h3>
        </div>
        <div class="my-work"></div>
    `,
};

// Sidebar order, top to bottom. A section switch slides through every section
// between the current and the target one, in this order.
const ORDER = ["myWorks", "projects", "skills"];
const PANEL_MS = 320; // slide time per panel crossed - keeps speed constant

let activeSection = null;
let shellBuilt = false;
let transitioning = false;

// The first layer: the overview dashboard. Shown on load and again whenever
// the sidebar's Overview button is pressed - that tears the activated shell
// down, so the next section click builds it fresh.
function mountDashboard() {
    if (!portfolioContent) return;

    activeSection = null;
    shellBuilt = false;
    transitioning = false;

    portfolioContent.replaceChildren(buildDashboard(openSection));
    // navbar.js keeps the bar hidden while the overview fills the screen.
    document.dispatchEvent(new CustomEvent("portfolio:layer"));
}

function showDashboard() {
    mountDashboard();
    bringPortfolioIntoView();
}

// Entry point for everything on the dashboard: a section, optionally on one of
// its tabs ({ tab: "design" }) and with one item opened ({ open: "Congix" }).
function openSection(name, options = {}) {
    renderPortfolio(name, options);
    bringPortfolioIntoView();
}

// The dashboard can be taller than the screen (phones), the activated shell
// never is. When switching between the two leaves the top of the section
// scrolled away, bring it back so the new layer starts in view.
function bringPortfolioIntoView() {
    if (portfolio && portfolio.getBoundingClientRect().top < 0) {
        portfolio.scrollIntoView({ block: "start" });
    }
}

// Builds the activated layout (sidebar + empty content area) once, on the first
// section click. Later clicks keep this shell and only swap the content, so the
// sidebar never re-renders and the content can animate its own way in/out.
function buildShell() {
    portfolioContent.innerHTML = `
        <div id="portfolio-content-activated">
            <div id="portfolio-navigation-activated">

                <div id="portfolio-websection-logo-activated">
                  <h3>Portfolio</h3>
                </div>

                <div class="portfolio-section-activated" id="myWorks">
                    <img src="icons/Cube.png" alt="My Works" class="portfolio-section-icon-activated">
                    <h3>My Works</h3>
                </div>

                <div class="portfolio-section-activated" id="projects">
                    <img src="icons/cube_focus.png" alt="Projects" class="portfolio-section-icon-activated">
                    <h3>Projects</h3>
                </div>

                <div class="portfolio-section-activated" id="skills">
                    <img src="icons/address_book.png" alt="Skills" class="portfolio-section-icon-activated">
                    <h3>Skills</h3>
                </div>

                <button type="button" class="portfolio-overview-activated" id="portfolioOverview">
                    <img src="icons/Grid.png" alt="" class="portfolio-overview-icon">
                    <h3>Overview</h3>
                </button>

            </div>

            <div id="portfolio-active-content"></div>

            <!-- Phone only: floating line/grid switcher docked by the bottom
                 navigation. my_works.js moves its selector in here; it slides
                 in from the right while My Works is the open section. -->
            <div id="style-selector-dock"></div>
        </div>
    `;

    addPortfolioListeners();
    shellBuilt = true;
}

function updateClicked(active) {
    document.querySelectorAll(".portfolio-section-activated").forEach(el => {
        el.classList.toggle("portfolio-section-clicked", el.id === active);
    });
}

function makeSlide(name, options = {}) {
    const slide = document.createElement("div");
    slide.className = "section-content";
    slide.innerHTML = ACTIVE_CONTENT[name] ?? "";

    // Start on the asked-for tab instead of the first one. Both tabbed
    // sections open on whichever tab is marked active when they initialise.
    if (options.tab) {
        const tabs = [...slide.querySelectorAll(".works_section")];
        const pick = tabs.find(tab => tab.textContent.trim().toLowerCase() === options.tab);
        if (pick) tabs.forEach(tab => tab.classList.toggle("active", tab === pick));
    }

    // Projects is built the moment its slide exists rather than after the
    // slide lands: it works on its own slide only (no ids, nothing shared), so
    // it can already be drawn while it scrolls into - or past - the view.
    if (name === "projects") initProjects(slide);

    return slide;
}

// My Works and Skills find their markup by id, so they can only be set up once
// their slide is the only one left in the DOM. Projects is done in makeSlide.
function initSection(name, options = {}) {
    if (name === "myWorks") initMyWorks(options);
    if (name === "skills") initSkills(options);
}

// First-ever activation: nothing to slide from, so just drop the section in.
function firstMount(active, options) {
    const container = document.getElementById("portfolio-active-content");

    const strip = document.createElement("div");
    strip.className = "section-strip intro";
    strip.appendChild(makeSlide(active, options));
    container.replaceChildren(strip);

    strip.addEventListener("animationend", e => {
        if (e.target === strip) strip.classList.remove("intro");
    }, { once: true });

    activeSection = active;
    initSection(active, options);
}

function renderPortfolio(active, options = {}) {
    if (!portfolioContent) return;
    if (active === activeSection) return;
    if (transitioning) return; // let the current slide finish before the next

    if (!shellBuilt) buildShell();
    updateClicked(active);

    // The floating selector only belongs to My Works - slide it away (to the
    // right) as soon as another section is chosen, back in when returning.
    document.getElementById("style-selector-dock")
        ?.classList.toggle("dock-shown", active === "myWorks");

    if (activeSection === null) {
        firstMount(active, options);
        return;
    }

    const container = document.getElementById("portfolio-active-content");
    const oldStrip = container.querySelector(".section-strip");
    if (!oldStrip) {
        firstMount(active, options);
        return;
    }

    const from = ORDER.indexOf(activeSection);
    const to = ORDER.indexOf(active);
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const steps = hi - lo;

    // Build a strip stacking every section from lo..hi. The section we're
    // leaving keeps its live DOM (rendered lists, slider position, ...) by
    // being moved across; the rest are fresh markup. The only section that can
    // ever sit between two others is Projects, which builds itself in makeSlide
    // - so nothing is ever shown mid-slide without being initialised.
    const strip = document.createElement("div");
    strip.className = "section-strip";

    const currentSlide = oldStrip.firstElementChild;
    for (let i = lo; i <= hi; i++) {
        if (i === from) strip.appendChild(currentSlide);
        else strip.appendChild(makeSlide(ORDER[i], i === to ? options : {}));
    }

    container.replaceChildren(strip);

    // Start on the current section, then slide to the target. Percentages are
    // relative to the strip's height (one panel), so -N*100% shows panel N.
    strip.style.transform = `translateY(${-(from - lo) * 100}%)`;
    void strip.offsetWidth; // commit the start position before transitioning

    transitioning = true;
    strip.style.transition = `transform ${steps * PANEL_MS}ms ease`;
    strip.style.transform = `translateY(${-(to - lo) * 100}%)`;

    const onDone = e => {
        if (e.propertyName !== "transform" || e.target !== strip) return;
        strip.removeEventListener("transitionend", onDone);

        // Collapse to just the target panel, then initialise it (now that the
        // section we left - and its duplicate ids - is gone from the DOM).
        const targetSlide = strip.children[to - lo];
        strip.style.transition = "";
        strip.style.transform = "translateY(0)";
        strip.replaceChildren(targetSlide);

        activeSection = active;
        transitioning = false;
        initSection(active, options);
    };
    strip.addEventListener("transitionend", onDone);
}

function addPortfolioListeners() {
    document.getElementById("portfolioOverview")
        ?.addEventListener("click", showDashboard);

    document.getElementById("myWorks")
        ?.addEventListener("click", () => renderPortfolio("myWorks"));

    document.getElementById("projects")
        ?.addEventListener("click", () => renderPortfolio("projects"));

    document.getElementById("skills")
        ?.addEventListener("click", () => renderPortfolio("skills"));
}

mountDashboard();
