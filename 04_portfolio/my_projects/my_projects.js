import { resolveAsset } from "../my_works/my_works.js";

// One file for every project; see Data/my_projects/_TEMPLATE.jsonc for the
// fields. Unlike My Works there are no tabs and no list - each project takes
// the whole panel: its story on one side, a deck of its screens on the other.
const PROJECTS_FILE = "Data/my_projects/projects.json";

// Glow behind the screens when a project names no colours of its own.
const DEFAULT_COLORS = ["#004225", "#4A067D"];

const ARROW_ICON = `
    <svg class="project-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 17 17 7"/>
        <path d="M8 7h9v9"/>
    </svg>`;

// Shared in-flight fetch: the stage can be built several times in a row (it is
// drawn every time its slide is created, even when the user only scrolls past
// it), and all of those should wait on one request.
let projectsPromise = null;

function loadProjects() {
    if (!projectsPromise) {
        // no-cache for the same reason as the works files: this is edited by
        // hand, and a stale copy would keep showing the old project.
        projectsPromise = fetch(PROJECTS_FILE, { cache: "no-cache" })
            .then(response => response.json())
            .then(list => (Array.isArray(list) ? list : []).map(project => ({
                ...project,
                logo: resolveAsset(project.logo, PROJECTS_FILE),
                shots: (Array.isArray(project.shots) ? project.shots : [])
                    .filter(shot => shot && shot.src)
                    .map(shot => ({ ...shot, src: resolveAsset(shot.src, PROJECTS_FILE) })),
            })))
            .catch(() => []);
    }
    return projectsPromise;
}

function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// Shows the address the way people read it: no scheme, no trailing slash.
function prettyUrl(value) {
    return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function buildCopy(project) {
    const copy = make("div", "project-copy");

    const title = make("h2", "project-title");
    if (project.logo) {
        const mark = make("img", "project-mark");
        mark.src = project.logo;
        mark.alt = "";
        mark.addEventListener("error", () => mark.remove());
        title.appendChild(mark);
    }
    title.appendChild(make("span", null, project.name ?? ""));
    copy.appendChild(title);

    if (project.tagline) copy.appendChild(make("p", "project-tagline", project.tagline));
    if (project.description) copy.appendChild(make("p", "project-description", project.description));

    const facts = Array.isArray(project.facts) ? project.facts.filter(fact => fact && fact.value) : [];
    if (facts.length) {
        const list = make("dl", "project-facts");
        facts.forEach(fact => {
            const row = make("div", "project-fact");
            row.appendChild(make("dt", null, fact.label ?? ""));
            row.appendChild(make("dd", null, fact.value));
            list.appendChild(row);
        });
        copy.appendChild(list);
    }

    if (project.url) {
        const link = make("a", "project-link");
        link.href = project.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.appendChild(make("span", null, `Visit ${project.displayUrl || prettyUrl(project.url)}`));
        link.insertAdjacentHTML("beforeend", ARROW_ICON);
        copy.appendChild(link);
    }

    return copy;
}

// The deck: every screen is the same frame, stacked back and to the right.
// Each one carries its place in the stack as data-pos (0 = in front) and the
// stylesheet does the rest, so bringing a screen forward is just renumbering.
function buildShow(project) {
    const show = make("div", "project-show");
    const deck = make("div", "project-deck");
    const tabs = make("div", "project-shot-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", `${project.name ?? "Project"} screens`);

    const shots = [];
    let active = 0;

    const place = () => {
        shots.forEach((shot, index) => {
            const pos = (index - active + shots.length) % shots.length;
            shot.frame.dataset.pos = pos;
            shot.tab.setAttribute("aria-selected", String(pos === 0));
        });
        // One screen needs no buttons to choose between.
        tabs.hidden = shots.length < 2;
        show.hidden = shots.length === 0;
    };

    const bringForward = shot => {
        active = shots.indexOf(shot);
        place();
    };

    project.shots.forEach((data, index) => {
        const frame = make("div", "project-shot");
        const img = make("img");
        img.src = data.src;
        img.alt = data.alt ?? "";
        frame.appendChild(img);

        const tab = make("button", "project-shot-tab", data.label || `Screen ${index + 1}`);
        tab.type = "button";
        tab.setAttribute("role", "tab");

        const shot = { frame, tab };

        // A screen behind comes forward; the one in front hands over to the
        // next, so tapping the deck alone walks through all of them.
        frame.addEventListener("click", () => {
            const inFront = shots[active] === shot;
            bringForward(inFront ? shots[(active + 1) % shots.length] : shot);
        });
        tab.addEventListener("click", () => bringForward(shot));

        // A screenshot that won't load leaves the deck (and its button) rather
        // than sitting there as an empty frame.
        img.addEventListener("error", () => {
            console.warn(`my_projects: screenshot not found - ${data.src}`);
            const front = shots[active];
            shots.splice(shots.indexOf(shot), 1);
            frame.remove();
            tab.remove();
            active = Math.max(shots.indexOf(front), 0);
            place();
        });

        shots.push(shot);
        deck.appendChild(frame);
        tabs.appendChild(tab);
    });

    place();

    show.appendChild(deck);
    show.appendChild(tabs);
    return show;
}

function buildProject(project) {
    const article = make("article", "project is-entering");

    const colors = Array.isArray(project.colors) && project.colors.length ? project.colors : DEFAULT_COLORS;
    // Closing on the first colour again keeps the ring seamless as it turns.
    article.style.setProperty("--project-glow", `conic-gradient(${[...colors, colors[0]].join(", ")})`);

    article.appendChild(make("div", "project-glow"));
    article.appendChild(buildCopy(project));
    article.appendChild(buildShow(project));

    return article;
}

// Only shown when there is something to switch between.
function buildSwitch(projects, onPick) {
    const nav = make("nav", "project-switch");
    nav.setAttribute("aria-label", "Projects");

    projects.forEach((project, index) => {
        const button = make("button", "project-switch-item");
        button.type = "button";
        if (project.logo) {
            const mark = make("img");
            mark.src = project.logo;
            mark.alt = "";
            mark.addEventListener("error", () => mark.remove());
            button.appendChild(mark);
        }
        button.appendChild(make("span", null, project.name ?? `Project ${index + 1}`));
        button.addEventListener("click", () => onPick(index));
        nav.appendChild(button);
    });

    return nav;
}

// The deck leans a little towards the pointer. Bound once per stage and looks
// the deck up each time, so it keeps working after a switch between projects.
function followPointer(stage) {
    if (!window.matchMedia("(hover:hover) and (prefers-reduced-motion:no-preference)").matches) return;

    let frame = 0;
    const lean = (x, y) => {
        const deck = stage.querySelector(".project-deck");
        if (!deck) return;
        deck.style.setProperty("--lean-x", x.toFixed(3));
        deck.style.setProperty("--lean-y", y.toFixed(3));
    };

    stage.addEventListener("pointermove", e => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const box = stage.getBoundingClientRect();
            lean(
                ((e.clientX - box.left) / box.width) * 2 - 1,
                ((e.clientY - box.top) / box.height) * 2 - 1
            );
        });
    });
    stage.addEventListener("pointerleave", () => lean(0, 0));
}

// Builds the Projects stage inside `root` (the section's slide). Safe to call
// more than once on the same slide - a stage is only ever built once.
export async function initProjects(root = document) {
    const stage = root.querySelector(".projects-stage");
    if (!stage || stage.dataset.built) return;
    stage.dataset.built = "true";

    const projects = await loadProjects();

    if (projects.length === 0) {
        stage.appendChild(make("p", "projects-empty", "No projects yet"));
        return;
    }

    let nav = null;
    const show = index => {
        stage.querySelector(".project")?.remove();
        stage.appendChild(buildProject(projects[index]));
        stage.scrollTop = 0;
        nav?.querySelectorAll(".project-switch-item").forEach((button, i) => {
            button.setAttribute("aria-pressed", String(i === index));
        });
    };

    if (projects.length > 1) {
        nav = buildSwitch(projects, show);
        stage.appendChild(nav);
    }

    show(0);
    followPointer(stage);
}
