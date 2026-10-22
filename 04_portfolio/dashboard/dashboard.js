import { loadWorks } from "../my_works/my_works.js";
import { loadProjects } from "../my_projects/my_projects.js";
import { loadSkills } from "../skills/skills.js";

// The Portfolio's first layer: everything in the three sections, counted and
// charted. Nothing here is typed in by hand - every number comes from the same
// Data/ files the sections render, so adding a work updates the overview too.
// Every tile, slice, bar and point opens the section it counts.

// Work types in the order of the My Works tabs. A colour belongs to its type,
// so Design is the same violet in the donut and in the skills bars. Types with
// no works are left out of the charts (Good Person :) has no file at all).
const WORK_TYPES = [
    { key: "design", label: "Design" },
    { key: "programming", label: "Programming" },
    { key: "engineering", label: "Engineering" },
];
const TYPE_COLORS = {
    design: "var(--dash-design)",
    programming: "var(--dash-programming)",
    engineering: "var(--dash-engineering)",
};

const ARROW_ICON = `
    <svg class="dash-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 17 17 7"/>
        <path d="M8 7h9v9"/>
    </svg>`;

const SVG_NS = "http://www.w3.org/2000/svg";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function makeSvg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
    return el;
}

function button(className, onClick) {
    const el = make("button", className);
    el.type = "button";
    el.addEventListener("click", onClick);
    return el;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function plural(count, one, many = `${one}s`) {
    return count === 1 ? one : many;
}

// "2026-05" -> a running month number (year * 12 + month), so months can be
// subtracted and counted. Anything else -> null (that entry has no date).
function monthIndex(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
    if (!match) return null;
    return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function monthLabel(index, withYear = false) {
    const date = new Date(Math.floor(index / 12), index % 12, 1);
    return date.toLocaleString("en", withYear ? { month: "short", year: "numeric" } : { month: "short" });
}

function currentMonth() {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
}

// --- numbers -----------------------------------------------------------------

function summarize(works, projects, skills) {
    const byType = WORK_TYPES
        .map(type => ({ ...type, count: works.filter(work => work.type === type.key).length }))
        .filter(type => type.count > 0);

    const areas = Object.entries(skills ?? {}).map(([key, group]) => ({
        key,
        label: capitalize(key),
        skills: Object.values(group ?? {}),
    }));

    // The timeline counts the same entries as the tiles (a work listed in two
    // tabs counts twice), placed at the month written in their "date".
    const events = [
        ...works.map(work => ({ name: work.name, type: work.type, month: monthIndex(work.date) })),
        ...projects.map(project => ({ name: project.name, type: "project", month: monthIndex(project.date) })),
    ].filter(event => event.month !== null);

    return {
        works: works.length,
        projects,
        skills: areas.reduce((sum, area) => sum + area.skills.length, 0),
        byType,
        areas,
        timeline: buildTimeline(events),
    };
}

// Month-by-month running total from the first dated entry up to this month,
// plus what launched in each month. A launch opens where it lives: a project
// opens Projects, a work opens My Works on the first tab that lists it.
function buildTimeline(events) {
    if (events.length === 0) return null;

    const first = Math.min(...events.map(event => event.month));
    const last = Math.max(currentMonth(), ...events.map(event => event.month));

    const months = [];
    let total = 0;
    for (let month = first; month <= last; month++) {
        const here = events.filter(event => event.month === month);
        total += here.length;

        const launches = [];
        here.forEach(event => {
            let launch = launches.find(item => item.name === event.name);
            if (!launch) {
                launch = { name: event.name, added: 0, kinds: [] };
                launches.push(launch);
            }
            launch.added += 1;
            launch.kinds.push(event.type);
        });
        launches.forEach(launch => {
            const firstType = WORK_TYPES.find(type => launch.kinds.includes(type.key));
            launch.target = launch.kinds.includes("project") || !firstType
                ? ["projects", {}]
                : ["myWorks", { tab: firstType.key, open: launch.name }];
        });

        months.push({ month, total, launches });
    }

    return { first, months };
}

// --- tooltip -----------------------------------------------------------------

// One tooltip for the whole dashboard. Value first and strong, label after.
function createTooltip(root) {
    const tip = make("div", "dash-tooltip");
    tip.setAttribute("aria-hidden", "true");
    const value = make("strong", "dash-tooltip-value");
    const label = make("span", "dash-tooltip-label");
    tip.append(value, label);
    root.appendChild(tip);

    return {
        // x/y: viewport point the tooltip should sit just above.
        show(text, detail, x, y) {
            value.textContent = text;
            label.textContent = detail;
            const box = root.getBoundingClientRect();
            const half = tip.offsetWidth / 2;
            const left = Math.min(Math.max(x - box.left, half + 4), box.width - half - 4);
            tip.style.left = `${left}px`;
            tip.style.top = `${y - box.top}px`;
            tip.classList.add("shown");
        },
        hide() {
            tip.classList.remove("shown");
        },
    };
}

// Hover and keyboard focus show the same readout, above the element.
function bindTip(tip, el, read) {
    const show = () => {
        const box = el.getBoundingClientRect();
        const [text, detail] = read();
        tip.show(text, detail, box.left + box.width / 2, box.top);
    };
    el.addEventListener("pointerenter", show);
    el.addEventListener("focus", show);
    el.addEventListener("pointerleave", tip.hide);
    el.addEventListener("blur", tip.hide);
}

// --- pieces ------------------------------------------------------------------

function buildCard(className, title, hint) {
    const card = make("section", `dash-card ${className}`);
    const head = make("header", "dash-card-head");
    head.appendChild(make("h3", "dash-card-title", title));
    if (hint) head.appendChild(make("span", "dash-card-hint", hint));
    const body = make("div", "dash-card-body");
    card.append(head, body);
    return { card, body };
}

// Big-number tile. A tile with onClick is a button into its section.
function buildKpi(label, onClick) {
    const tile = onClick ? button("dash-card dash-kpi", onClick) : make("div", "dash-card dash-kpi");
    const value = make("span", "dash-kpi-value", "–");
    const note = make("span", "dash-kpi-note", " ");
    tile.append(make("span", "dash-kpi-label", label), value, note);
    if (onClick) tile.insertAdjacentHTML("beforeend", ARROW_ICON);

    return {
        tile,
        set(count, text, reveal) {
            note.textContent = text;
            reveal(() => countUp(value, count));
        },
    };
}

function countUp(el, target) {
    if (reducedMotion() || target === 0) {
        el.textContent = String(target);
        return;
    }
    const start = performance.now();
    const duration = 700;
    const step = now => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function fillDonut(body, byType, tip, open, reveal) {
    const total = byType.reduce((sum, type) => sum + type.count, 0);
    if (total === 0) {
        body.appendChild(make("p", "dash-empty", "No works yet"));
        return;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    // A 2px-ish gap of card colour between slices; none when there is only one.
    const gap = byType.length > 1 ? 1.4 : 0;

    const wrap = make("div", "dash-donut");
    const svg = makeSvg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
    svg.appendChild(makeSvg("circle", { class: "dash-donut-track", cx: 50, cy: 50, r: radius }));

    const slices = [];
    // Pointing at a slice or its legend row dims every other slice.
    const highlight = key => slices.forEach(({ slice, type }) => {
        slice.classList.toggle("dimmed", key !== null && type.key !== key);
    });
    let start = 0;
    byType.forEach(type => {
        const length = (type.count / total) * circumference;
        const slice = makeSvg("circle", {
            class: "dash-donut-slice",
            cx: 50, cy: 50, r: radius,
            stroke: TYPE_COLORS[type.key],
            "stroke-dashoffset": -start,
            "stroke-dasharray": `0 ${circumference}`,
            transform: "rotate(-90 50 50)",
        });
        const finalDash = `${Math.max(length - gap, 0.01)} ${circumference}`;
        start += length;

        const share = Math.round((type.count / total) * 100);
        const readout = () => [`${type.count} ${plural(type.count, "work")}`, `${type.label} · ${share}%`];
        const go = () => open("myWorks", { tab: type.key });

        slice.addEventListener("click", go);
        slice.addEventListener("pointermove", e => {
            const [text, detail] = readout();
            tip.show(text, detail, e.clientX, e.clientY - 10);
        });
        slice.addEventListener("pointerenter", () => highlight(type.key));
        slice.addEventListener("pointerleave", () => {
            tip.hide();
            highlight(null);
        });
        slices.push({ slice, finalDash, type, readout, go });
        svg.appendChild(slice);
    });

    const center = make("div", "dash-donut-center");
    const centerValue = make("span", "dash-donut-total", String(total));
    center.append(centerValue, make("span", "dash-donut-unit", plural(total, "work")));

    wrap.append(svg, center);

    // The legend carries every value, so nothing depends on hovering; it is
    // also the keyboard way into each tab.
    const legend = make("ul", "dash-legend");
    slices.forEach(({ type, readout, go }) => {
        const item = make("li");
        const link = button("dash-legend-item", go);
        const swatch = make("span", "dash-swatch");
        swatch.style.background = TYPE_COLORS[type.key];
        link.append(swatch, make("span", "dash-legend-label", type.label), make("span", "dash-legend-value", String(type.count)));
        link.addEventListener("pointerenter", () => highlight(type.key));
        link.addEventListener("pointerleave", () => highlight(null));
        link.addEventListener("focus", () => highlight(type.key));
        link.addEventListener("blur", () => highlight(null));
        link.setAttribute("aria-label", `${readout().join(", ")}. Open in My Works`);
        item.appendChild(link);
        legend.appendChild(item);
    });

    body.append(wrap, legend);
    reveal(() => slices.forEach(({ slice, finalDash }) => slice.setAttribute("stroke-dasharray", finalDash)));
}

function fillSkills(body, areas, tip, open, reveal) {
    const max = Math.max(1, ...areas.map(area => area.skills.length));
    if (areas.length === 0) {
        body.appendChild(make("p", "dash-empty", "No skills yet"));
        return;
    }

    const fills = [];
    areas.forEach(area => {
        const count = area.skills.length;
        const block = make("div", "dash-area");

        const row = button("dash-bar-row", () => open("skills", { tab: area.key }));
        const track = make("span", "dash-bar-track");
        const fill = make("span", "dash-bar-fill");
        fill.style.background = TYPE_COLORS[area.key] ?? "var(--dash-ink-2)";
        fill.style.setProperty("--share", count / max);
        track.appendChild(fill);
        row.append(make("span", "dash-bar-label", area.label), track, make("span", "dash-bar-value", String(count)));
        row.setAttribute("aria-label", `${area.label}: ${count} ${plural(count, "skill")}. Open in Skills`);
        bindTip(tip, row, () => [`${count} ${plural(count, "skill")}`, area.label]);
        fills.push(fill);

        const chips = make("div", "dash-chips");
        area.skills.forEach(skill => {
            const name = (skill.name ?? "").trim();
            const chip = button("dash-chip", () => open("skills", { tab: area.key, open: name }));
            chip.textContent = name;
            chips.appendChild(chip);
        });

        block.append(row, chips);
        body.appendChild(block);
    });

    reveal(() => fills.forEach(fill => fill.classList.add("grown")));
}

function fillTimeline(body, timeline, tip, open, reveal) {
    if (!timeline) {
        body.appendChild(make("p", "dash-empty", "Add a \"date\" to a work to see it here"));
        return;
    }

    const { months } = timeline;
    const max = Math.max(1, ...months.map(item => item.total));
    const span = Math.max(months.length - 1, 1);
    // Leaves room above the highest point for its label.
    const x = i => (months.length === 1 ? 50 : (i / span) * 100);
    const y = total => 100 - (total / max) * 70 - 4;

    const chart = make("div", "dash-timeline");
    const plot = make("div", "dash-plot");

    // Running totals only change when something launches, so the line steps:
    // flat through quiet months, straight up in a launch month.
    let line = `M ${x(0)} ${y(months[0].total)}`;
    months.forEach((item, i) => {
        if (i === 0) return;
        line += ` H ${x(i)} V ${y(item.total)}`;
    });
    if (months.length === 1) line = `M 0 ${y(months[0].total)} H 100`;

    const svg = makeSvg("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
    [25, 50, 75].forEach(level => svg.appendChild(makeSvg("line", {
        class: "dash-grid", x1: 0, x2: 100, y1: level, y2: level, "vector-effect": "non-scaling-stroke",
    })));
    svg.appendChild(makeSvg("line", {
        class: "dash-baseline", x1: 0, x2: 100, y1: 96, y2: 96, "vector-effect": "non-scaling-stroke",
    }));
    svg.appendChild(makeSvg("path", { class: "dash-area-fill", d: `${line} V 96 H 0 Z` }));
    svg.appendChild(makeSvg("path", { class: "dash-line", d: line, "vector-effect": "non-scaling-stroke" }));
    const crosshair = makeSvg("line", { class: "dash-crosshair", x1: 0, x2: 0, y1: 0, y2: 96, "vector-effect": "non-scaling-stroke" });
    svg.appendChild(crosshair);
    plot.appendChild(svg);

    const readout = item => {
        const added = item.launches.map(launch => launch.name).join(", ");
        return [`${item.total} total`, `${monthLabel(item.month, true)}${added ? ` · ${added}` : ""}`];
    };

    // Launch months get a dot and a label naming what launched; both open it.
    months.forEach((item, i) => {
        if (item.launches.length === 0) return;
        const edge = i === 0 ? "start" : i === months.length - 1 ? "end" : "middle";

        const dot = button("dash-point", () => open(...item.launches[0].target));
        dot.tabIndex = -1; // the labels below are the keyboard targets
        dot.setAttribute("aria-hidden", "true");
        dot.style.left = `${x(i)}%`;
        dot.style.top = `${y(item.total)}%`;
        plot.appendChild(dot);

        const labels = make("div", `dash-point-labels at-${edge}`);
        labels.style.left = `${x(i)}%`;
        labels.style.top = `${y(item.total)}%`;
        item.launches.forEach(launch => {
            const label = button("dash-point-label", () => open(...launch.target));
            label.append(make("span", "dash-point-name", launch.name), make("span", "dash-point-added", `+${launch.added}`));
            label.setAttribute("aria-label", `${launch.name}, ${monthLabel(item.month, true)}, added ${launch.added}. Open it`);
            bindTip(tip, label, () => readout(item));
            labels.appendChild(label);
        });
        plot.appendChild(labels);
    });

    // The crosshair finds the month nearest the pointer anywhere in the plot.
    plot.addEventListener("pointermove", e => {
        const box = plot.getBoundingClientRect();
        const i = Math.round(Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1) * span);
        const item = months[Math.min(i, months.length - 1)];
        const at = x(Math.min(i, months.length - 1));
        crosshair.setAttribute("x1", at);
        crosshair.setAttribute("x2", at);
        crosshair.classList.add("shown");
        const [text, detail] = readout(item);
        tip.show(text, detail, box.left + (at / 100) * box.width, box.top + (y(item.total) / 100) * box.height - 12);
    });
    plot.addEventListener("pointerleave", () => {
        crosshair.classList.remove("shown");
        tip.hide();
    });

    const axis = make("div", "dash-axis");
    months.forEach((item, i) => {
        // Every month while they fit; past a year only every third one.
        if (months.length > 12 && i % 3 !== 0 && i !== months.length - 1) return;
        // Month names only - the start year sits in the card's corner - with
        // the year added where a new one begins.
        const tick = make("span", "dash-tick", monthLabel(item.month, item.month % 12 === 0));
        tick.style.left = `${x(i)}%`;
        if (i === 0) tick.classList.add("at-start");
        if (i === months.length - 1 && months.length > 1) tick.classList.add("at-end");
        axis.appendChild(tick);
    });

    chart.append(plot, axis);
    body.appendChild(chart);
    reveal(() => chart.classList.add("drawn"));
}

function fillFeatured(card, body, project, open) {
    if (!project) {
        card.remove();
        return;
    }

    const link = button("dash-featured", () => open("projects"));
    const colors = Array.isArray(project.colors) && project.colors.length ? project.colors : ["#004225", "#4A067D"];
    link.style.setProperty("--project-stripe", `linear-gradient(90deg, ${colors.join(", ")})`);

    const top = make("span", "dash-featured-top");
    if (project.logo) {
        const mark = make("img", "dash-featured-mark");
        mark.src = project.logo;
        mark.alt = "";
        mark.addEventListener("error", () => mark.remove());
        top.appendChild(mark);
    }
    const heading = make("span", "dash-featured-heading");
    heading.appendChild(make("span", "dash-featured-name", project.name ?? ""));
    const since = monthIndex(project.date);
    if (since !== null) heading.appendChild(make("span", "dash-featured-since", `Since ${monthLabel(since, true)}`));
    top.appendChild(heading);

    link.append(top);
    if (project.tagline) link.appendChild(make("span", "dash-featured-tagline", project.tagline));
    link.appendChild(make("span", "dash-featured-stripe"));
    const cta = make("span", "dash-featured-cta", "Open project");
    cta.insertAdjacentHTML("beforeend", ARROW_ICON);
    link.appendChild(cta);

    body.appendChild(link);
}

// --- the dashboard -----------------------------------------------------------

// Builds the overview and returns its root right away; the numbers fill in
// once the data files arrive. open(section, options) is portfolio.js's way
// into a section: open("myWorks", { tab: "design", open: "Congix" }).
export function buildDashboard(open) {
    const root = make("section", "portfolio-dashboard");
    root.id = "portfolio-dashboard";
    root.setAttribute("aria-label", "Portfolio overview");
    const tip = createTooltip(root);

    // Charts animate in the first time the overview is on screen. Anything
    // filled in later than that animates as soon as it is filled.
    let live = false;
    const waiting = [];
    const reveal = fn => (live ? requestAnimationFrame(() => requestAnimationFrame(fn)) : waiting.push(fn));
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        live = true;
        root.classList.add("is-live");
        requestAnimationFrame(() => requestAnimationFrame(() => waiting.splice(0).forEach(fn => fn())));
    }, { threshold: 0.2 });
    observer.observe(root);

    const intro = make("div", "dash-intro");
    intro.append(
        make("h2", "dash-intro-title", "Overview"),
        make("p", "dash-intro-hint", "Click any number, chart or name to open it")
    );

    const kpis = make("div", "dash-kpis");
    const worksKpi = buildKpi("Works", () => open("myWorks"));
    const projectsKpi = buildKpi("Projects", () => open("projects"));
    const skillsKpi = buildKpi("Skills", () => open("skills"));
    const monthsKpi = buildKpi("Months building");
    kpis.append(worksKpi.tile, projectsKpi.tile, skillsKpi.tile, monthsKpi.tile);

    const donut = buildCard("dash-donut-card", "Works by type", "Opens the tab");
    const skills = buildCard("dash-skills-card", "Skills by area", "Opens the skill");
    const featured = buildCard("dash-featured-card", "Featured project");
    const timeline = buildCard("dash-timeline-card", "Works & projects over time", "Running total");

    const actions = make("nav", "dash-actions");
    actions.setAttribute("aria-label", "Portfolio sections");
    [["Check works", "myWorks"], ["Check projects", "projects"], ["Check skills", "skills"]].forEach(([text, name]) => {
        const action = button("dash-action", () => open(name));
        action.textContent = text;
        action.insertAdjacentHTML("beforeend", ARROW_ICON);
        actions.appendChild(action);
    });

    root.append(intro, kpis, donut.card, skills.card, featured.card, timeline.card, actions);

    Promise.all([loadWorks(), loadProjects(), loadSkills()]).then(([works, projects, skillData]) => {
        const stats = summarize(works, projects, skillData);

        worksKpi.set(stats.works, stats.byType.map(type => `${type.label} ${type.count}`).join(" · ") || "None yet", reveal);
        projectsKpi.set(stats.projects.length, stats.projects.map(project => project.name).join(" · ") || "None yet", reveal);
        skillsKpi.set(stats.skills, stats.areas.map(area => `${area.label} ${area.skills.length}`).join(" · ") || "None yet", reveal);
        if (stats.timeline) {
            const first = stats.timeline.first;
            monthsKpi.set(currentMonth() - first + 1, `Since ${monthLabel(first, true)}`, reveal);
            timeline.card.querySelector(".dash-card-hint").textContent = `Running total since ${monthLabel(first, true)}`;
        } else {
            monthsKpi.set(0, "No dates yet", reveal);
        }

        fillDonut(donut.body, stats.byType, tip, open, reveal);
        fillSkills(skills.body, stats.areas, tip, open, reveal);
        fillFeatured(featured.card, featured.body, stats.projects.find(project => project.pinned) ?? stats.projects[0], open);
        fillTimeline(timeline.body, stats.timeline, tip, open, reveal);
    });

    return root;
}
