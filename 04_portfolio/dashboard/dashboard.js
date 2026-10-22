import { loadWorks } from "../my_works/my_works.js";
import { loadProjects } from "../my_projects/my_projects.js";
import { loadSkills } from "../skills/skills.js";

// The Portfolio's first layer. A header bar names the section and sums it up
// in count tiles; the newest works follow as a carousel of their
// real pictures, with works by type, skills, works per month beside a table
// of totals, and a held place for social media stats still to come.
// Nothing is typed in by hand; every figure comes from the same Data/ files
// the sections render, and everything opens the section, tab or item it shows.
// Every view stays the same size however much is added: the carousel keeps
// the newest few, skills show the first few per area, and the monthly line
// groups long histories into quarters.
//
// The views are linked: pointing at a work lights its slices in the donut and
// its month on the line; pointing at a type lights everything of that type.

// Work types in the order of the My Works tabs. A colour belongs to its type
// in every view. Types with no works are left out (Good Person :) has no file).
const WORK_TYPES = [
    { key: "design", label: "Design" },
    { key: "programming", label: "Programming" },
    { key: "engineering", label: "Engineering" },
];
const TYPE_COLORS = {
    design: "var(--dash-design)",
    programming: "var(--dash-programming)",
    engineering: "var(--dash-engineering)",
    project: "var(--dash-project)",
};

// The carousel shows the newest works only; the rest live in My Works.
const CAROUSEL_SIZE = 5;
// Skill names shown per area before "+N more".
const SKILLS_PER_AREA = 3;
// Past this many months the line counts per quarter instead of per month.
const MAX_MONTHS = 24;
// Names listed in a point's tooltip before "+N more".
const NAMES_IN_TIP = 3;

const ARROW_ICON = `
    <svg class="dash-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 17 17 7"/>
        <path d="M8 7h9v9"/>
    </svg>`;
const CHEVRON_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6"/>
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

function swatch(color) {
    const el = make("span", "dash-swatch");
    el.style.background = color;
    return el;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function plural(count, one, many = `${one}s`) {
    return count === 1 ? one : many;
}

function typeLabel(key) {
    return WORK_TYPES.find(type => type.key === key)?.label ?? capitalize(key);
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

// One item per work, however many tabs list it, plus any project that is not
// also a work. This is what the carousel shows and what the views link by name.
function collectItems(works, projects) {
    const items = new Map();

    works.forEach(work => {
        let item = items.get(work.name);
        if (!item) {
            item = {
                name: work.name,
                month: monthIndex(work.date),
                types: [],
                // The work's own picture from its JSON entry; the first
                // gallery shot when it has none.
                image: work.image || (Array.isArray(work.images) && work.images.find(Boolean)),
                logo: work.logo,
                project: false,
            };
            items.set(work.name, item);
        }
        if (!item.types.includes(work.type)) item.types.push(work.type);
    });

    projects.forEach(project => {
        let item = items.get(project.name);
        if (!item) {
            item = {
                name: project.name,
                month: monthIndex(project.date),
                types: [],
                image: project.shots?.[0]?.src,
                logo: project.logo,
            };
            items.set(project.name, item);
        }
        item.project = true;
        item.logo ||= project.logo;
    });

    items.forEach(item => {
        // A project opens Projects; a work opens My Works on the first tab
        // that lists it, with its detail already open.
        const firstType = WORK_TYPES.find(type => item.types.includes(type.key));
        item.target = item.project || !firstType
            ? ["projects", {}]
            : ["myWorks", { tab: firstType.key, open: item.name }];
    });

    // Newest first; undated works go last, in file order.
    return [...items.values()].sort((a, b) => (b.month ?? -Infinity) - (a.month ?? -Infinity));
}

function summarize(works, projects, skills) {
    const byType = WORK_TYPES
        .map(type => ({ ...type, count: works.filter(work => work.type === type.key).length }))
        .filter(type => type.count > 0);

    const areas = Object.entries(skills ?? {}).map(([key, group]) => ({
        key,
        label: capitalize(key),
        skills: Object.values(group ?? {}),
    }));

    const items = collectItems(works, projects);

    // The monthly line counts the same entries as the headline (a work listed
    // in two tabs counts once per tab), placed at the month in their "date".
    const events = [
        ...works.map(work => ({ name: work.name, type: work.type, month: monthIndex(work.date) })),
        ...projects.map(project => ({ name: project.name, type: "project", month: monthIndex(project.date) })),
    ];

    return {
        works: works.length,
        projects: projects.length,
        skills: areas.reduce((sum, area) => sum + area.skills.length, 0),
        byType,
        areas,
        items,
        events,
        monthly: buildMonthly(events.filter(event => event.month !== null)),
    };
}

// How many entries were made in each month, from the first dated one up to
// this month - quiet months included, so the line falls as well as rises.
// Longer than MAX_MONTHS and it counts per quarter instead.
function buildMonthly(events) {
    if (events.length === 0) return null;

    const first = Math.min(...events.map(event => event.month));
    const last = Math.max(currentMonth(), ...events.map(event => event.month));
    const byQuarter = last - first + 1 > MAX_MONTHS;

    const bucketOf = month => (byQuarter ? Math.floor(month / 3) : month);
    const buckets = [];
    for (let key = bucketOf(first); key <= bucketOf(last); key++) {
        const year = Math.floor((byQuarter ? key * 3 : key) / 12);
        buckets.push({
            key,
            // Quarters always carry a short year ("Q2 ’25"): thinned out, a
            // bare "Q3" would not say which year it is.
            label: byQuarter ? `Q${(key % 4) + 1} ’${String(year).slice(2)}` : monthLabel(key),
            fullLabel: byQuarter ? `Q${(key % 4) + 1} ${year}` : monthLabel(key, true),
            // A month tick names the year where a new one begins.
            yearStart: !byQuarter && key % 12 === 0,
            year,
            count: 0,
            names: [],
            types: new Set(),
        });
    }

    events.forEach(event => {
        const bucket = buckets[bucketOf(event.month) - bucketOf(first)];
        bucket.count += 1;
        bucket.types.add(event.type);
        if (!bucket.names.includes(event.name)) bucket.names.push(event.name);
    });

    const busiest = buckets.reduce((best, bucket) => (bucket.count > best.count ? bucket : best), buckets[0]);
    const months = last - first + 1;

    return {
        first,
        byQuarter,
        buckets,
        busiest,
        perMonth: events.length / months,
    };
}

// --- linked views ------------------------------------------------------------

// A work's own marks carry data-work; a mark holding several works (a month
// on the line) carries data-works, names joined by "|"; both carry
// data-types. Type marks carry data-type. focus({ work }) or focus({ type })
// dims the rest of the dashboard; focus(null) clears it.
function createFocus(root, items) {
    const typesOf = name => items.find(item => item.name === name)?.types ?? [];

    const set = (el, state, on) => {
        el.classList.toggle("is-lit", Boolean(state) && on);
        el.classList.toggle("is-dim", !on);
    };

    return state => {
        root.classList.toggle("has-focus", Boolean(state));

        root.querySelectorAll("[data-work], [data-works]").forEach(el => {
            const names = el.dataset.works ? el.dataset.works.split("|") : [el.dataset.work];
            const types = el.dataset.types.split(" ");
            set(el, state, !state || (state.work !== undefined ? names.includes(state.work) : types.includes(state.type)));
        });

        root.querySelectorAll("[data-type]").forEach(el => {
            const on = !state
                || (state.type !== undefined ? el.dataset.type === state.type : typesOf(state.work).includes(el.dataset.type));
            set(el, state, on);
        });
    };
}

// Hover and keyboard focus both light the same things.
function bindFocus(el, focus, state) {
    el.addEventListener("pointerenter", () => focus(state));
    el.addEventListener("pointerleave", () => focus(null));
    el.addEventListener("focus", () => focus(state));
    el.addEventListener("blur", () => focus(null));
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

// --- headline ----------------------------------------------------------------

function countUp(el, target) {
    if (reducedMotion() || target === 0) {
        el.textContent = String(target);
        return;
    }
    const start = performance.now();
    const duration = 900;
    const step = now => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// Three count tiles - number over word - each a way into its section, then
// "Built in 6 months": beside them on wide screens, under them on phones.
function fillHeadline(headline, stats, open, reveal) {
    const counts = [];
    const tile = (count, one, section, sectionName) => {
        const link = button("dash-count", () => open(section));
        const number = make("span", "dash-count-number", String(count));
        link.append(number, make("span", "dash-count-label", plural(count, one)));
        link.setAttribute("aria-label", `${count} ${plural(count, one)}. Open ${sectionName}`);
        counts.push([number, count]);
        return link;
    };

    headline.replaceChildren(
        tile(stats.works, "work", "myWorks", "My Works"),
        tile(stats.projects, "project", "projects", "Projects"),
        tile(stats.skills, "skill", "skills", "Skills"),
    );

    if (stats.monthly) {
        const months = currentMonth() - stats.monthly.first + 1;
        const number = make("span", "dash-count-number", String(months));
        const span = make("span", "dash-months");
        span.append(number, ` ${plural(months, "month")}`);
        counts.push([number, months]);
        const built = make("span", "dash-built", "Built in ");
        built.appendChild(span);
        headline.append(built);
    }

    reveal(() => counts.forEach(([el, value]) => countUp(el, value)));
}

// --- latest works: carousel --------------------------------------------------

function buildWorkCard(item, index, focus, open) {
    const card = button("dash-work", () => open(...item.target));
    card.dataset.work = item.name;
    card.dataset.types = item.types.join(" ");
    card.style.setProperty("--i", index);

    const media = make("span", "dash-work-media");
    if (item.image) {
        const img = make("img", "dash-work-img");
        img.src = item.image;
        img.alt = "";
        img.decoding = "async";
        // A square picture is a logo or an app icon, not a screen: it sits
        // whole in the middle, over a blurred wash of its own colours.
        img.addEventListener("load", () => {
            if (Math.abs(img.naturalWidth / img.naturalHeight - 1) < 0.2) {
                card.classList.add("is-mark");
                media.style.setProperty("--work-wash", `url("${img.currentSrc}")`);
            }
        });
        img.addEventListener("error", () => img.remove());
        media.appendChild(img);
    }
    const go = make("span", "dash-work-go");
    go.insertAdjacentHTML("beforeend", ARROW_ICON);
    media.appendChild(go);

    const info = make("span", "dash-work-info");
    const title = make("span", "dash-work-title");
    if (item.logo) {
        const logo = make("img", "dash-work-logo");
        logo.src = item.logo;
        logo.alt = "";
        logo.addEventListener("error", () => logo.remove());
        title.appendChild(logo);
    }
    title.appendChild(make("span", "dash-work-name", item.name));

    const meta = make("span", "dash-work-meta");
    if (item.month !== null) meta.appendChild(make("span", "dash-work-date", monthLabel(item.month, true)));
    const tags = make("span", "dash-work-tags");
    [...item.types, ...(item.project ? ["project"] : [])].forEach(key => {
        const tag = make("span", "dash-work-tag", key === "project" ? "Project" : typeLabel(key));
        tag.style.setProperty("--tag", TYPE_COLORS[key] ?? "var(--dash-ink-2)");
        tags.appendChild(tag);
    });
    meta.appendChild(tags);
    info.append(title, meta);

    card.append(media, info);
    card.setAttribute("aria-label", `${item.name}${item.month !== null ? `, ${monthLabel(item.month, true)}` : ""}. Open ${item.project ? "the project" : "this work"}`);
    bindFocus(card, focus, { work: item.name });
    return card;
}

function fillCarousel(section, items, worksCount, focus, open, reveal) {
    const { head, body } = section;

    if (items.length === 0) {
        body.appendChild(make("p", "dash-empty", "No works yet"));
        return;
    }

    const latest = items.slice(0, CAROUSEL_SIZE);

    const track = make("div", "dash-track");
    track.setAttribute("tabindex", "-1");
    latest.forEach((item, index) => track.appendChild(buildWorkCard(item, index, focus, open)));

    // The last card is the way to everything else.
    const all = button("dash-work dash-work-all", () => open("myWorks"));
    all.style.setProperty("--i", latest.length);
    all.append(
        make("span", "dash-work-all-count", String(worksCount)),
        make("span", "dash-work-all-label", `${plural(worksCount, "work")} in My Works`),
    );
    const allGo = make("span", "dash-work-all-go", "Open all");
    allGo.insertAdjacentHTML("beforeend", ARROW_ICON);
    all.appendChild(allGo);
    track.appendChild(all);

    const controls = make("div", "dash-carousel-controls");
    const counter = make("span", "dash-carousel-counter");
    counter.setAttribute("aria-live", "polite");
    const prev = button("dash-carousel-arrow", () => page(-1));
    const next = button("dash-carousel-arrow is-next", () => page(1));
    prev.setAttribute("aria-label", "Previous works");
    next.setAttribute("aria-label", "Next works");
    prev.insertAdjacentHTML("beforeend", CHEVRON_ICON);
    next.insertAdjacentHTML("beforeend", CHEVRON_ICON);
    controls.append(counter, prev, next);
    head.appendChild(controls);

    const progress = make("div", "dash-carousel-progress");
    const bar = make("span");
    progress.appendChild(bar);

    // One card's width plus the gap: the distance between card starts.
    const stepSize = () => {
        const cards = track.children;
        return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
    };
    const page = direction => {
        const step = stepSize();
        const visible = Math.max(1, Math.floor((track.clientWidth + 1) / step));
        track.scrollBy({ left: direction * step * visible, behavior: reducedMotion() ? "auto" : "smooth" });
    };

    let frame = 0;
    const update = () => {
        frame = 0;
        const step = stepSize();
        const max = track.scrollWidth - track.clientWidth;
        const first = Math.min(Math.round(track.scrollLeft / step), latest.length - 1);
        const visible = Math.max(1, Math.floor((track.clientWidth + 1) / step));
        const lastShown = Math.min(first + visible, latest.length);
        counter.textContent = `${first + 1}–${lastShown} of ${latest.length} newest`;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max - 2;
        const shown = max > 0 ? track.clientWidth / track.scrollWidth : 1;
        bar.style.width = `${shown * 100}%`;
        bar.style.marginLeft = `${max > 0 ? (track.scrollLeft / track.scrollWidth) * 100 : 0}%`;
    };
    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };
    track.addEventListener("scroll", schedule, { passive: true });
    new ResizeObserver(schedule).observe(track);

    body.append(track, progress);
    reveal(() => track.classList.add("revealed"));
}

// --- works by type: donut ----------------------------------------------------

function fillDonut(body, byType, tip, focus, open, reveal) {
    const total = byType.reduce((sum, type) => sum + type.count, 0);
    if (total === 0) {
        body.appendChild(make("p", "dash-empty", "No works yet"));
        return;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    // A 2px-ish gap of panel colour between slices; none for a single slice.
    const gap = byType.length > 1 ? 1.4 : 0;

    const wrap = make("div", "dash-donut");
    const svg = makeSvg("svg", { viewBox: "0 0 100 100", "aria-hidden": "true" });
    svg.appendChild(makeSvg("circle", { class: "dash-donut-track", cx: 50, cy: 50, r: radius }));

    const slices = [];
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
        slice.dataset.type = type.key;
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
        slice.addEventListener("pointerenter", () => focus({ type: type.key }));
        slice.addEventListener("pointerleave", () => {
            tip.hide();
            focus(null);
        });
        slices.push({ slice, finalDash, type, readout, go });
        svg.appendChild(slice);
    });

    const center = make("div", "dash-donut-center");
    center.append(make("span", "dash-donut-total", String(total)), make("span", "dash-donut-unit", plural(total, "work")));
    wrap.append(svg, center);

    // The legend carries every value, so nothing depends on hovering; it is
    // also the keyboard way into each tab.
    const legend = make("ul", "dash-legend");
    slices.forEach(({ type, readout, go }) => {
        const item = make("li");
        const link = button("dash-legend-item", go);
        link.dataset.type = type.key;
        link.append(swatch(TYPE_COLORS[type.key]), make("span", "dash-legend-label", type.label), make("span", "dash-legend-value", String(type.count)));
        link.setAttribute("aria-label", `${readout().join(", ")}. Open in My Works`);
        bindFocus(link, focus, { type: type.key });
        item.appendChild(link);
        legend.appendChild(item);
    });

    body.append(wrap, legend);
    reveal(() => slices.forEach(({ slice, finalDash }) => slice.setAttribute("stroke-dasharray", finalDash)));
}

// --- skills ------------------------------------------------------------------

// One bar split by area (the share of all skills), then the first few skills
// of each area by name and a "+N more" into Skills for the rest.
function fillSkills(body, areas, tip, open, reveal) {
    const total = areas.reduce((sum, area) => sum + area.skills.length, 0);
    if (total === 0) {
        body.appendChild(make("p", "dash-empty", "No skills yet"));
        return;
    }

    const bar = make("div", "dash-split");
    const groups = make("div", "dash-skill-groups");

    areas.forEach(area => {
        const count = area.skills.length;
        if (count === 0) return;
        const color = TYPE_COLORS[area.key] ?? "var(--dash-ink-2)";
        const openArea = () => open("skills", { tab: area.key });

        const segment = button("dash-split-part", openArea);
        segment.style.setProperty("--share", count);
        segment.style.background = color;
        segment.setAttribute("aria-label", `${area.label}: ${count} ${plural(count, "skill")}. Open in Skills`);
        bindTip(tip, segment, () => [`${count} ${plural(count, "skill")}`, `${area.label} · ${Math.round((count / total) * 100)}%`]);
        bar.appendChild(segment);

        const group = make("div", "dash-skill-group");
        const head = button("dash-skill-area", openArea);
        head.append(swatch(color), make("span", "dash-skill-area-label", area.label), make("span", "dash-legend-value", String(count)));
        group.appendChild(head);

        const list = make("ul", "dash-skill-list");
        area.skills.slice(0, SKILLS_PER_AREA).forEach(skill => {
            const name = (skill.name ?? "").trim();
            const li = make("li");
            const link = button("dash-skill", () => open("skills", { tab: area.key, open: name }));
            link.textContent = name;
            li.appendChild(link);
            list.appendChild(li);
        });
        if (count > SKILLS_PER_AREA) {
            const li = make("li");
            const more = button("dash-skill is-more", openArea);
            more.textContent = `+${count - SKILLS_PER_AREA} more`;
            more.setAttribute("aria-label", `${count - SKILLS_PER_AREA} more ${area.label} skills. Open in Skills`);
            li.appendChild(more);
            list.appendChild(li);
        }
        group.appendChild(list);
        groups.appendChild(group);
    });

    body.append(bar, groups);
    reveal(() => bar.classList.add("grown"));
}

// --- totals table ------------------------------------------------------------

// The donut's numbers as a table, with projects and the latest month of
// each, then the two figures the line is about: busiest month and pace.
function fillTotals(body, stats, focus, open) {
    const latestOf = type => {
        const months = stats.events.filter(event => event.type === type && event.month !== null).map(event => event.month);
        return months.length ? monthLabel(Math.max(...months), true) : "–";
    };

    const table = make("table", "dash-totals");
    const head = make("thead");
    const headRow = make("tr");
    headRow.append(make("th", null, "Type"), make("th", "is-num", "Count"), make("th", "is-num", "Latest"));
    head.appendChild(headRow);

    const rows = make("tbody");
    const addRow = (key, label, count, onOpen) => {
        const row = make("tr");
        if (key !== "project") row.dataset.type = key;
        const name = make("th");
        name.scope = "row";
        const link = button("dash-totals-link", onOpen);
        link.append(swatch(TYPE_COLORS[key]), make("span", null, label));
        if (key !== "project") bindFocus(link, focus, { type: key });
        name.appendChild(link);
        row.append(name, make("td", "is-num", String(count)), make("td", "is-num is-muted", latestOf(key)));
        rows.appendChild(row);
    };
    stats.byType.forEach(type => addRow(type.key, type.label, type.count, () => open("myWorks", { tab: type.key })));
    if (stats.projects > 0) addRow("project", "Projects", stats.projects, () => open("projects"));

    const foot = make("tfoot");
    const footRow = make("tr");
    const totalLabel = make("th", null, "Total");
    totalLabel.scope = "row";
    footRow.append(totalLabel, make("td", "is-num", String(stats.works + stats.projects)), make("td"));
    foot.appendChild(footRow);

    table.append(head, rows, foot);

    const facts = make("dl", "dash-facts");
    if (stats.monthly) {
        const { busiest, perMonth, byQuarter } = stats.monthly;
        const fact = (term, value) => {
            const group = make("div");
            group.append(make("dt", null, term), make("dd", null, value));
            facts.appendChild(group);
        };
        fact(byQuarter ? "Busiest quarter" : "Busiest month", `${busiest.fullLabel} · ${busiest.count}`);
        fact("Average", `${perMonth.toFixed(1)} per month`);
    }

    body.append(table, facts);
}

// --- works per month: line ---------------------------------------------------

function fillMonthly(body, monthly, tip, open, reveal) {
    if (!monthly) {
        body.appendChild(make("p", "dash-empty", "Add a \"date\" to a work to see it here"));
        return;
    }

    const { buckets } = monthly;
    const max = Math.max(1, ...buckets.map(bucket => bucket.count));
    const span = Math.max(buckets.length - 1, 1);
    const x = i => (buckets.length === 1 ? 50 : (i / span) * 100);
    // Room above the highest point for its value.
    const y = count => 92 - (count / max) * 76;

    const chart = make("div", "dash-line-chart");
    const plot = make("div", "dash-plot");

    const points = buckets.map((bucket, i) => `${x(i)} ${y(bucket.count)}`);
    const line = buckets.length === 1 ? `M 0 ${y(buckets[0].count)} H 100` : `M ${points.join(" L ")}`;

    const svg = makeSvg("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
    [y(max), y(max / 2)].forEach(level => svg.appendChild(makeSvg("line", {
        class: "dash-grid", x1: 0, x2: 100, y1: level, y2: level, "vector-effect": "non-scaling-stroke",
    })));
    svg.appendChild(makeSvg("line", {
        class: "dash-baseline", x1: 0, x2: 100, y1: 92, y2: 92, "vector-effect": "non-scaling-stroke",
    }));
    svg.appendChild(makeSvg("path", { class: "dash-area-fill", d: `${line} V 92 H ${buckets.length === 1 ? 0 : x(0)} Z` }));
    svg.appendChild(makeSvg("path", { class: "dash-line", d: line, "vector-effect": "non-scaling-stroke" }));
    const crosshair = makeSvg("line", { class: "dash-crosshair", x1: 0, x2: 0, y1: 0, y2: 92, "vector-effect": "non-scaling-stroke" });
    svg.appendChild(crosshair);
    plot.appendChild(svg);

    // The two gridlines are labelled on the left: the top count and half.
    [max, max / 2].forEach(value => {
        if (!Number.isInteger(value)) return;
        const label = make("span", "dash-y-label", String(value));
        label.style.top = `${y(value)}%`;
        plot.appendChild(label);
    });

    const readout = bucket => {
        if (bucket.count === 0) return ["0 works", bucket.fullLabel];
        const names = bucket.names.slice(0, NAMES_IN_TIP).join(", ");
        const rest = bucket.names.length - NAMES_IN_TIP;
        return [`${bucket.count} ${plural(bucket.count, "work")}`, `${bucket.fullLabel} · ${names}${rest > 0 ? ` +${rest} more` : ""}`];
    };

    // Set by buildDashboard once the items are known, so a point with one
    // work opens that work exactly as its card does.
    let pointTarget = () => ["myWorks", {}];
    chart.setTargets = fn => (pointTarget = fn);

    // A point per month: a button where something was made (it opens that
    // work, or My Works when there were several), a quiet dot where not.
    buckets.forEach((bucket, i) => {
        const at = { left: `${x(i)}%`, top: `${y(bucket.count)}%` };
        if (bucket.count === 0) {
            const dot = make("span", "dash-point is-zero");
            Object.assign(dot.style, at);
            plot.appendChild(dot);
            return;
        }

        const single = bucket.names.length === 1 ? bucket.names[0] : null;
        const point = button("dash-point", () => (single ? open(...pointTarget(single)) : open("myWorks")));
        Object.assign(point.style, at);
        point.dataset.works = bucket.names.join("|");
        point.dataset.types = [...bucket.types].join(" ");
        point.setAttribute("aria-label", `${readout(bucket).join(", ")}. Open`);
        bindTip(tip, point, () => readout(bucket));
        plot.appendChild(point);

        // Only the peak carries its value; the rest are one hover away.
        if (bucket === monthly.busiest) {
            const value = make("span", "dash-point-value", String(bucket.count));
            Object.assign(value.style, at);
            plot.appendChild(value);
        }
    });

    // The crosshair finds the month nearest the pointer anywhere in the plot.
    plot.addEventListener("pointermove", e => {
        if (e.target.closest(".dash-point:not(.is-zero)")) return;
        const box = plot.getBoundingClientRect();
        const i = Math.min(Math.round(Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1) * span), buckets.length - 1);
        const at = x(i);
        crosshair.setAttribute("x1", at);
        crosshair.setAttribute("x2", at);
        crosshair.classList.add("shown");
        const [text, detail] = readout(buckets[i]);
        tip.show(text, detail, box.left + (at / 100) * box.width, box.top + (y(buckets[i].count) / 100) * box.height - 12);
    });
    plot.addEventListener("pointerleave", () => {
        crosshair.classList.remove("shown");
        tip.hide();
    });

    const axis = make("div", "dash-axis");
    // Thin the ticks to what the width can hold without crowding: a month
    // name needs about 44px, a quarter with its year about 58px.
    const room = Math.max(2, Math.floor((body.clientWidth || 600) / (monthly.byQuarter ? 58 : 44)));
    const every = Math.ceil(buckets.length / room);
    buckets.forEach((bucket, i) => {
        if (i % every !== 0) return;
        // The start year is in the panel's corner; a tick only adds the year
        // where a new one begins.
        const text = bucket.yearStart ? `${bucket.label} ${bucket.year}` : bucket.label;
        const tick = make("span", "dash-tick", text);
        tick.style.left = `${x(i)}%`;
        if (i === 0) tick.classList.add("at-start");
        if (i === buckets.length - 1 && buckets.length > 1) tick.classList.add("at-end");
        axis.appendChild(tick);
    });

    chart.append(plot, axis);
    body.appendChild(chart);
    reveal(() => chart.classList.add("drawn"));
    return chart;
}

// --- social media: held for later ---------------------------------------------

const CONTACTS_FILE = "Data/contacts.json";

// Not built yet: a blurred sketch of what will live here (one row per channel
// that has followers, from the Contacts data) under a note saying so. The
// sketch carries no real numbers and is hidden from assistive tech; the note
// is the content.
function fillSocial(body) {
    const preview = make("div", "dash-social-preview");
    preview.setAttribute("aria-hidden", "true");
    preview.inert = true;

    const note = make("div", "dash-social-note");
    const title = make("p", "dash-social-title", "Social stats are on the way");
    const text = make("p", "dash-social-text", "This section is for future social media stats.");
    note.append(title, text);
    body.append(preview, note);

    fetch(CONTACTS_FILE)
        .then(response => response.json())
        .then(data => {
            const channels = Object.values(data ?? {}).filter(contact => ["Social", "Videos"].includes(contact?.type));
            channels.forEach((contact, i) => {
                const row = make("div", "dash-social-row");
                const icon = make("img");
                icon.src = contact.icon;
                icon.alt = "";
                icon.addEventListener("error", () => icon.remove());
                const bar = make("span", "dash-social-bar");
                bar.style.setProperty("--fill", `${88 - i * 21}%`);
                bar.style.setProperty("--accent", contact.accent || "var(--dash-ink-2)");
                row.append(icon, make("span", "dash-social-name", contact.soft_name ?? ""), bar, make("span", "dash-social-value", "0.0k"));
                preview.appendChild(row);
            });
            const names = channels.map(contact => contact.soft_name).filter(Boolean);
            if (names.length) {
                const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
                text.textContent = `This section is for future social media stats: followers and views from ${list}.`;
            }
        })
        .catch(() => {});
}

// --- the dashboard -----------------------------------------------------------

function buildBlock(tag, className, title) {
    const block = make(tag, className);
    const head = make("header", "dash-block-head");
    head.appendChild(make("h3", "dash-block-title", title));
    const body = make("div", "dash-block-body");
    block.append(head, body);
    return { block, head, body };
}

// Builds the overview and returns its root right away; the content fills in
// once the data files arrive. open(section, options) is portfolio.js's way
// into a section: open("myWorks", { tab: "design", open: "Congix" }).
export function buildDashboard(open) {
    const root = make("section", "portfolio-dashboard");
    root.id = "portfolio-dashboard";
    root.setAttribute("aria-label", "Portfolio overview");
    const tip = createTooltip(root);

    // The overview builds itself in once, the first time it is on screen:
    // the cards unveil, the donut and the bar fill, the line draws. Anything
    // filled in later plays as soon as it is filled.
    let live = false;
    const waiting = [];
    const reveal = fn => (live ? requestAnimationFrame(() => requestAnimationFrame(fn)) : waiting.push(fn));
    if (!reducedMotion()) root.classList.add("will-reveal");
    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        live = true;
        requestAnimationFrame(() => requestAnimationFrame(() => waiting.splice(0).forEach(fn => fn())));
    }, { threshold: 0.15 });
    observer.observe(root);

    // One bar: the section's name and the counts that sum it up.
    const header = make("header", "dash-header");
    const headline = make("div", "dash-headline");
    header.append(make("h2", "dash-header-title", "Portfolio"), headline);

    const carousel = buildBlock("section", "dash-carousel", "Latest works");

    const panel = make("div", "dash-panel");
    const types = buildBlock("section", "dash-block dash-types", "Works by type");
    const skills = buildBlock("section", "dash-block dash-skills", "Skills");
    panel.append(types.block, skills.block);

    const pace = buildBlock("section", "dash-pace", "Works per month");
    const paceHint = make("span", "dash-block-hint");
    pace.head.appendChild(paceHint);
    const totals = make("div", "dash-totals-wrap");
    const monthlyBody = make("div", "dash-monthly");
    pace.body.append(totals, monthlyBody);

    const social = buildBlock("section", "dash-social", "Social media");
    fillSocial(social.body);

    const actions = make("nav", "dash-actions");
    actions.setAttribute("aria-label", "Portfolio sections");
    [["Check works", "myWorks"], ["Check projects", "projects"], ["Check skills", "skills"]].forEach(([text, name]) => {
        const action = button("dash-action", () => open(name));
        action.textContent = text;
        action.insertAdjacentHTML("beforeend", ARROW_ICON);
        actions.appendChild(action);
    });

    root.append(header, carousel.block, panel, pace.block, social.block, actions);

    Promise.all([loadWorks(), loadProjects(), loadSkills()]).then(([works, projects, skillData]) => {
        const stats = summarize(works, projects, skillData);
        const focus = createFocus(root, stats.items);

        fillHeadline(headline, stats, open, reveal);
        fillCarousel(carousel, stats.items, stats.works, focus, open, reveal);
        fillDonut(types.body, stats.byType, tip, focus, open, reveal);
        fillSkills(skills.body, stats.areas, tip, open, reveal);
        fillTotals(totals, stats, focus, open);
        const chart = fillMonthly(monthlyBody, stats.monthly, tip, open, reveal);
        chart?.setTargets(name => stats.items.find(item => item.name === name)?.target ?? ["myWorks", {}]);
        if (stats.monthly) {
            paceHint.textContent = stats.monthly.byQuarter
                ? `Per quarter since ${monthLabel(stats.monthly.first, true)}`
                : `Since ${monthLabel(stats.monthly.first, true)}`;
        }
    });

    return root;
}
