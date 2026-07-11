let slider = null;
let navbar = null;
let skillsContainer = null;

// skills.json is keyed by category ("programming" / "design"), matching the
// navbar tabs. Each category is an object keyed by skill_1, skill_2, ... where
// every value is one skill { name, short_description, long_description, photo }.
let skillsData = {};

function categoryFromLabel(label) {
    return label.trim().toLowerCase();
}

function entriesForCategory(category) {
    const value = skillsData[category];
    if (!value) return [];

    // One skill_(index) entry per row.
    return Object.values(value);
}

// Detail "iframe": an in-page overlay that covers the list and shows the full
// skill (name / short / long / photo). Kept as an overlay rather than a real
// <iframe> so it inherits the page's styles and resolves the photo path.
function openDetail(entry) {
    closeDetail();

    const overlay = document.createElement("div");
    overlay.className = "skill-detail-overlay";

    const close = document.createElement("button");
    close.className = "skill-detail-close";
    close.textContent = "✕";
    close.addEventListener("click", closeDetail);

    const name = document.createElement("h2");
    name.className = "skill-detail-name";
    name.textContent = entry.name ?? "";

    const short = document.createElement("div");
    short.className = "skill-detail-short";
    short.textContent = entry.short_description ?? "";

    const long = document.createElement("div");
    long.className = "skill-detail-long";
    long.textContent = entry.long_description ?? "";

    overlay.appendChild(close);
    overlay.appendChild(name);
    overlay.appendChild(short);
    overlay.appendChild(long);

    if (entry.photo) {
        const photo = document.createElement("img");
        photo.className = "skill-detail-photo";
        photo.src = entry.photo;
        photo.alt = entry.name ?? "";
        overlay.appendChild(photo);
    }

    skillsContainer.appendChild(overlay);
}

function closeDetail() {
    skillsContainer?.querySelector(".skill-detail-overlay")?.remove();
}

function buildPanel(category) {
    const panel = document.createElement("div");
    panel.className = "skill-panel";

    entriesForCategory(category).forEach((entry, index) => {
        const line = document.createElement("div");
        line.className = "skill-line entering";
        line.style.animationDelay = `${index * 60}ms`;

        const skillBox = document.createElement("div");
        skillBox.className = "skill-box skill-name";
        skillBox.textContent = entry.name ?? "";

        const descBox = document.createElement("div");
        descBox.className = "skill-box skill-short-description";
        descBox.textContent = entry.short_description ?? "";

        line.appendChild(skillBox);
        line.appendChild(descBox);
        line.addEventListener("click", () => openDetail(entry));

        panel.appendChild(line);
    });

    return panel;
}

function showTab(label) {
    if (!skillsContainer) return;

    closeDetail();
    skillsContainer.innerHTML = "";
    skillsContainer.appendChild(buildPanel(categoryFromLabel(label)));
}

function sectionIndex(item) {
    return [...document.querySelectorAll(".works_section")].indexOf(item);
}

function setActive(target) {
    const current = document.querySelector(".works_section.active");
    if (current) current.classList.remove("active");
    target.classList.add("active");

    showTab(target.textContent);
}

function moveSliderTo(target) {
    if (!slider || !target) return;

    const currentLeft = slider.offsetLeft;
    const newLeft = target.offsetLeft + (target.offsetWidth - slider.offsetWidth) / 2;

    slider.classList.add("moving");
    slider.style.left = `${newLeft}px`;

    if (Math.round(currentLeft) === Math.round(newLeft)) slider.classList.remove("moving");
}

async function loadSkillsData() {
    if (Object.keys(skillsData).length > 0) return;

    const response = await fetch("../Data/skills.json");
    skillsData = await response.json();
}

export async function initSkills() {
    skillsContainer = document.querySelector(".my-work");
    if (!skillsContainer) return;

    slider = document.getElementById("slider");
    navbar = document.getElementById("portfolio-active-content-navbar");

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

    await loadSkillsData();
    if (initialActive) showTab(initialActive.textContent);
}

// The preview page ships the markup at load time, so self-init.
if (document.querySelector(".my-work")) initSkills();
