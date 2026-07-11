// The "My Story" book. story.json is a keyed object: a "cover" entry plus
// section_1, section_2, ... in order. Each section is:
//   { topic, period, layout, content[], photos{}, quotes{} }
// content is a list of paragraphs and markers ("[photo_1]", "[quote_1]") that
// resolve against the section's photos/quotes maps. Odd photo count renders as
// a plain column; even count renders chess rows (photo/text, alternating side).
// layout can force "column" or "chess"; "auto" (default) decides by parity.

const BOOKMARK_KEY = "story-progress";
const BOOKMARK_MIN = 200; // ignore trivial scroll positions when offering resume

let bookEl = null;
let scrollerEl = null;
let chipsEl = null;
let progressEl = null;
let yearEl = null;
let coverEl = null;
let lightboxEl = null;

let sections = [];      // { el, chip, startYear }
let activeIndex = -1;
let displayedYear = null;
let yearRAF = 0;
let lastSave = 0;

/* ------------------------------------------------------------------ parsing */

function parseStartYear(period) {
    const match = /\d{4}/.exec(period ?? "");
    return match ? Number(match[0]) : null;
}

// Turn a section's content list into resolved blocks, dropping markers whose
// photo/quote key doesn't exist.
function resolveBlocks(section) {
    const blocks = [];
    (section.content ?? []).forEach(item => {
        const marker = /^\[(.+)\]$/.exec(String(item).trim());
        if (!marker) {
            blocks.push({ type: "text", text: item });
            return;
        }
        const key = marker[1];
        if (section.photos?.[key]) {
            blocks.push({ type: "photo", key, ...section.photos[key] });
        } else if (section.quotes?.[key]) {
            blocks.push({ type: "quote", key, text: section.quotes[key] });
        }
        // unknown key -> silently skipped
    });
    return blocks;
}

function resolveLayout(section, photoCount) {
    const layout = section.layout ?? "auto";
    if (layout === "chess" || layout === "column") return layout;
    return photoCount > 0 && photoCount % 2 === 0 ? "chess" : "column";
}

/* ---------------------------------------------------------------- rendering */

function renderText(block) {
    const p = document.createElement("p");
    p.className = "story-paragraph story-reveal";
    p.textContent = block.text;
    return p;
}

function renderQuote(block) {
    const q = document.createElement("blockquote");
    q.className = "story-quote story-reveal";
    q.textContent = block.text;
    return q;
}

function renderPhoto(block) {
    const figure = document.createElement("figure");
    figure.className = "story-figure story-reveal";

    const img = document.createElement("img");
    img.src = block.src;
    img.alt = block.caption ?? "";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(block.src, block.caption));
    figure.appendChild(img);

    if (block.caption) {
        const cap = document.createElement("figcaption");
        cap.textContent = block.caption;
        figure.appendChild(cap);
    }
    return figure;
}

function renderBlock(block) {
    if (block.type === "photo") return renderPhoto(block);
    if (block.type === "quote") return renderQuote(block);
    return renderText(block);
}

function renderColumn(container, blocks) {
    blocks.forEach(block => container.appendChild(renderBlock(block)));
}

// Chess: each photo pairs with the paragraph right after it into a row, and
// rows alternate which side the photo sits on. Anything unpaired (a lone
// paragraph, a quote, back-to-back photos) falls back to full width.
function renderChess(container, blocks) {
    let i = 0;
    let rowIndex = 0;
    while (i < blocks.length) {
        const block = blocks[i];
        const next = blocks[i + 1];

        if (block.type === "photo" && next && next.type === "text") {
            const row = document.createElement("div");
            row.className = "story-row story-reveal";
            if (rowIndex % 2 === 1) row.classList.add("reversed");

            const textWrap = document.createElement("div");
            textWrap.className = "story-row-text";
            textWrap.appendChild(renderText(next));

            row.appendChild(renderPhoto(block));
            row.appendChild(textWrap);
            container.appendChild(row);

            i += 2;
            rowIndex += 1;
        } else {
            container.appendChild(renderBlock(block));
            i += 1;
        }
    }
}

function renderSection(section, index, total) {
    const el = document.createElement("section");
    el.className = "story-section";

    const header = document.createElement("div");
    header.className = "story-section-header story-reveal";

    const chapter = document.createElement("span");
    chapter.className = "story-chapter";
    chapter.textContent = `Chapter ${index + 1} of ${total}`;

    const topic = document.createElement("h2");
    topic.className = "story-topic";
    topic.textContent = section.topic ?? "";

    const period = document.createElement("span");
    period.className = "story-period";
    period.textContent = section.period ?? "";

    header.append(chapter, topic, period);
    el.appendChild(header);

    const body = document.createElement("div");
    body.className = "story-body";

    const blocks = resolveBlocks(section);
    const photoCount = blocks.filter(b => b.type === "photo").length;
    if (resolveLayout(section, photoCount) === "chess") renderChess(body, blocks);
    else renderColumn(body, blocks);

    el.appendChild(body);
    return el;
}

/* -------------------------------------------------------------------- cover */

function buildCover(cover, savedTop) {
    coverEl = document.createElement("div");
    coverEl.className = "story-cover";

    const title = document.createElement("h2");
    title.className = "story-cover-title";
    title.textContent = cover?.title ?? "My Story";

    const subtitle = document.createElement("p");
    subtitle.className = "story-cover-subtitle";
    subtitle.textContent = cover?.subtitle ?? "";

    const open = document.createElement("button");
    open.className = "story-cover-open";
    open.textContent = cover?.hint ?? "open the book";

    coverEl.append(title, subtitle, open);

    // Returning reader with a saved position gets a resume option.
    if (savedTop > BOOKMARK_MIN) {
        const cont = document.createElement("button");
        cont.className = "story-cover-continue";
        cont.textContent = "continue where you left off";
        cont.addEventListener("click", e => {
            e.stopPropagation();
            openBook(savedTop);
        });
        coverEl.appendChild(cont);
    }

    coverEl.addEventListener("click", () => openBook(0));
    coverEl.addEventListener("wheel", () => openBook(0), { once: true, passive: true });

    return coverEl;
}

function openBook(scrollTo) {
    if (bookEl.classList.contains("opened")) return;
    bookEl.classList.add("opened");
    coverEl.classList.add("open");
    scrollerEl.classList.remove("locked");

    if (scrollTo > 0) {
        // Wait for the unlock to take effect before positioning.
        requestAnimationFrame(() => {
            scrollerEl.scrollTop = scrollTo;
            onScroll();
        });
    }
}

/* ----------------------------------------------------------------- lightbox */

function buildLightbox() {
    lightboxEl = document.createElement("div");
    lightboxEl.className = "story-lightbox";

    const img = document.createElement("img");
    img.className = "story-lightbox-img";

    const caption = document.createElement("div");
    caption.className = "story-lightbox-caption";

    const close = document.createElement("button");
    close.className = "story-lightbox-close";
    close.textContent = "✕";

    lightboxEl.append(close, img, caption);

    const hide = () => lightboxEl.classList.remove("open");
    close.addEventListener("click", e => { e.stopPropagation(); hide(); });
    lightboxEl.addEventListener("click", hide);
    img.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") hide();
    });

    document.getElementById("story").appendChild(lightboxEl);
}

function openLightbox(src, caption) {
    const img = lightboxEl.querySelector(".story-lightbox-img");
    const cap = lightboxEl.querySelector(".story-lightbox-caption");
    img.src = src;
    img.alt = caption ?? "";
    cap.textContent = caption ?? "";
    cap.style.display = caption ? "" : "none";
    lightboxEl.classList.add("open");
}

/* ------------------------------------------------- scroll: spy / year / save */

function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;

    sections.forEach((s, i) => s.chip.classList.toggle("active", i === index));

    const target = sections[index]?.startYear;
    if (target != null) animateYear(target);
}

// Count the floating badge up/down to the new year so time feels like passing.
function animateYear(target) {
    if (displayedYear === null) {
        displayedYear = target;
        yearEl.textContent = String(target);
        return;
    }
    if (displayedYear === target) return;

    cancelAnimationFrame(yearRAF);
    const start = displayedYear;
    const delta = target - start;
    const duration = 600;
    // Base elapsed time on the rAF timestamp itself so start and progress share
    // one clock (mixing performance.now() with the rAF clock can yield p<0).
    let t0 = null;

    const step = now => {
        if (t0 === null) t0 = now;
        const p = Math.min(Math.max((now - t0) / duration, 0), 1);
        const value = Math.round(start + delta * p);
        yearEl.textContent = String(value);
        displayedYear = value;
        if (p < 1) yearRAF = requestAnimationFrame(step);
        else displayedYear = target;
    };
    yearRAF = requestAnimationFrame(step);
}

function saveProgress(top) {
    const now = Date.now();
    if (now - lastSave < 400) return;
    lastSave = now;
    try {
        localStorage.setItem(BOOKMARK_KEY, String(Math.round(top)));
    } catch { /* storage unavailable - ignore */ }
}

function onScroll() {
    const max = scrollerEl.scrollHeight - scrollerEl.clientHeight;
    progressEl.style.width = `${max > 0 ? (scrollerEl.scrollTop / max) * 100 : 0}%`;

    // Active section: the last one whose top has passed under the sticky chips.
    const pos = scrollerEl.scrollTop + chipsEl.offsetHeight + 40;
    let active = 0;
    sections.forEach((s, i) => {
        if (s.el.offsetTop <= pos) active = i;
    });
    setActive(active);

    saveProgress(scrollerEl.scrollTop);
}

/* -------------------------------------------------------------------- build */

function build(data) {
    const { cover, ...rest } = data;
    const entries = Object.values(rest);

    let savedTop = 0;
    try {
        savedTop = Number(localStorage.getItem(BOOKMARK_KEY)) || 0;
    } catch { /* ignore */ }

    // Progress bar + year badge float over the book, above the cover.
    progressEl = document.createElement("div");
    progressEl.className = "story-progress";

    yearEl = document.createElement("div");
    yearEl.className = "story-year";

    // Scroller holds the sticky chips bar and all sections.
    scrollerEl = document.createElement("div");
    scrollerEl.className = "story-scroll locked";

    chipsEl = document.createElement("div");
    chipsEl.className = "story-chips";
    scrollerEl.appendChild(chipsEl);

    entries.forEach((section, index) => {
        const el = renderSection(section, index, entries.length);
        scrollerEl.appendChild(el);

        const chip = document.createElement("button");
        chip.className = "story-chip";
        chip.textContent = section.period ?? `#${index + 1}`;
        chip.title = section.topic ?? "";
        chip.addEventListener("click", () => {
            const top = Math.max(el.offsetTop - chipsEl.offsetHeight, 0);
            scrollerEl.scrollTo({ top, behavior: "smooth" });
        });
        chipsEl.appendChild(chip);

        sections.push({ el, chip, startYear: parseStartYear(section.period) });
    });

    bookEl.append(progressEl, scrollerEl, yearEl, buildCover(cover, savedTop));

    // Seed the year badge with the first chapter's year.
    if (sections[0]?.startYear != null) {
        displayedYear = sections[0].startYear;
        yearEl.textContent = String(sections[0].startYear);
    }
    setActive(0);

    // Time-travel reveals: fade/slide each block in as it enters the scroller.
    const io = new IntersectionObserver(entriesObs => {
        entriesObs.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                io.unobserve(entry.target);
            }
        });
    }, { root: scrollerEl, threshold: 0.12 });
    scrollerEl.querySelectorAll(".story-reveal").forEach(el => io.observe(el));

    scrollerEl.addEventListener("scroll", onScroll, { passive: true });
    buildLightbox();
}

async function initStory() {
    bookEl = document.getElementById("story-book");
    if (!bookEl) return;

    const response = await fetch("Data/story.json");
    const data = await response.json();
    build(data);
}

initStory();
