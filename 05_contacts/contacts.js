// contacts.json is keyed by soft_1, soft_2, ... - one messaging platform per
// entry: { soft_name, icon, type, handle, link, button, accent, description,
// points[], note }. Each becomes one contact card.
let contactsData = {};

// Readable text color to sit on top of an accent fill (e.g. the Write button).
// Light accents like X's white get dark text; everything else stays white.
function readableOn(hex) {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map(x => x + x).join("") : c;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#111" : "#fff";
}

function buildCard(entry) {
    const card = document.createElement("div");
    card.className = "contact-card";
    if (entry.accent) {
        card.style.setProperty("--accent", entry.accent);
        card.style.setProperty("--accent-text", readableOn(entry.accent));
    }

    // Left: the platform logo. The brand slug lets CSS size per-logo (circular
    // badges like Telegram fill the circle; square logos sit smaller inside it).
    const logo = document.createElement("div");
    logo.className = "contact-card-logo";
    const slug = (entry.soft_name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (slug) logo.classList.add(`logo-${slug}`);
    if (entry.icon) {
        const img = document.createElement("img");
        img.src = entry.icon;
        img.alt = entry.soft_name ?? "";
        // If the URL is dead just drop the image; the accent circle stays.
        img.addEventListener("error", () => img.remove());
        logo.appendChild(img);
    }

    // Middle: meta + the write button.
    const meta = document.createElement("div");
    meta.className = "contact-card-meta";

    meta.appendChild(metaRow("Soft:", entry.soft_name));
    meta.appendChild(metaRow("Type:", entry.type));

    if (entry.handle) {
        const handle = document.createElement("a");
        handle.className = "contact-handle";
        handle.textContent = entry.handle;
        if (entry.link) {
            handle.href = entry.link;
            handle.target = "_blank";
            handle.rel = "noopener";
        }
        meta.appendChild(handle);
    }

    const write = document.createElement("a");
    write.className = "contact-write";
    write.textContent = entry.button ?? "Write";
    if (entry.link) {
        write.href = entry.link;
        write.target = "_blank";
        write.rel = "noopener";
    }
    meta.appendChild(write);

    // Right: description panel.
    const body = document.createElement("div");
    body.className = "contact-card-body";

    if (entry.description) {
        const desc = document.createElement("p");
        desc.className = "contact-desc";
        desc.textContent = entry.description;
        body.appendChild(desc);
    }

    if (Array.isArray(entry.points) && entry.points.length) {
        const list = document.createElement("ol");
        list.className = "contact-points";
        entry.points.forEach(point => {
            const li = document.createElement("li");
            li.textContent = point;
            list.appendChild(li);
        });
        body.appendChild(list);
    }

    if (entry.note) {
        const note = document.createElement("p");
        note.className = "contact-note";
        note.textContent = entry.note;
        body.appendChild(note);
    }

    card.appendChild(logo);
    card.appendChild(meta);
    card.appendChild(body);
    return card;
}

function metaRow(label, value) {
    const row = document.createElement("p");
    row.className = "contact-meta-row";

    const key = document.createElement("span");
    key.className = "contact-meta-label";
    key.textContent = label;

    row.appendChild(key);
    row.append(` ${value ?? ""}`);
    return row;
}

async function initContacts() {
    const container = document.getElementById("contacts-cards");
    if (!container) return;

    const response = await fetch("Data/contacts.json");
    contactsData = await response.json();

    container.replaceChildren(...Object.values(contactsData).map(buildCard));
}

initContacts();
