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

// Cursor glow-snake: a chain of soft purple blobs. While the cursor moves,
// each blob eases toward the one ahead of it, so the chain stretches into a
// snake slithering after the mouse. When the cursor rests, the blobs' targets
// switch to rotating orbit slots around it, and the snake coils up into a
// slowly swirling cyclone. Transform-only updates on the compositor, and the
// rAF loop stops when the cursor leaves.
function initSpotlight() {
    const section = document.getElementById("contacts");
    if (!section || window.matchMedia("(pointer: coarse)").matches) return;

    const SEGMENTS = 8;
    const IDLE_AFTER_MS = 350; // rest this long -> snake coils into the cyclone

    const segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
        const el = document.createElement("div");
        el.className = "contacts-glow-seg";

        // Head is the biggest and brightest; the tail thins out.
        const size = 300 - i * 24;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        section.appendChild(el);
        segs.push({ el, x: 0, y: 0, fade: 1 - (i / SEGMENTS) * 0.65 });
    }

    let targetX = 0;
    let targetY = 0;
    let inside = false;
    let raf = 0;
    let lastMove = 0;
    let lastTs = 0;
    let rot = 0;
    let idleStart = 0;

    const SWIRL_RAMP_MS = 1600; // how long the cyclone takes to fully bloom

    const step = () => {
        // One clock for everything (mixing the rAF timestamp with
        // performance.now() risks subtle divergence).
        const now = performance.now();
        const dt = Math.min((now - lastTs) / 1000 || 0, 0.05);
        lastTs = now;

        const idle = inside && now - lastMove > IDLE_AFTER_MS;
        if (idle && !idleStart) idleStart = now;
        if (!idle) idleStart = 0;

        // The cyclone blooms out of the standing glow: orbit radius and spin
        // both start at zero and ease up (smoothstep) over the ramp, so the
        // swirl emerges gently instead of snapping into a circle.
        let swirl = 0;
        if (idle) {
            const p = Math.min((now - idleStart) / SWIRL_RAMP_MS, 1);
            swirl = p * p * (3 - 2 * p);
            rot += dt * 1.4 * swirl; // spin ramps with the bloom (inner bands run ~1.35x this)
        }

        segs.forEach((seg, i) => {
            let gx;
            let gy;

            if (idle) {
                // Cyclone, hurricane-style: blobs sit along a spiral arm (each
                // one further out AND further around), the inner bands rotate
                // faster than the outer ones (the shear that winds the arm),
                // and the innermost blob keeps a small clear "eye" open at the
                // very center. Radius still breathes so the vortex feels alive.
                const angle = rot * (1.35 - i * 0.09) + i * 1.15;
                const radius = swirl * (26 + i * 12) * (1 + 0.12 * Math.sin(now / 700 + i));
                gx = targetX + Math.cos(angle) * radius;
                gy = targetY + Math.sin(angle) * radius;
            } else {
                // Snake: the head chases the cursor, every other blob chases
                // the blob ahead of it.
                gx = i === 0 ? targetX : segs[i - 1].x;
                gy = i === 0 ? targetY : segs[i - 1].y;
            }

            // Slightly lazy follow, so the snake stays visible and enjoyable
            // even at normal cursor speeds.
            const ease = i === 0 ? 0.16 : 0.22;
            seg.x += (gx - seg.x) * ease;
            seg.y += (gy - seg.y) * ease;
            seg.el.style.transform = `translate(${seg.x}px, ${seg.y}px) translate(-50%, -50%)`;
        });

        if (inside) raf = requestAnimationFrame(step);
        else raf = 0;
    };

    section.addEventListener("mousemove", e => {
        const rect = section.getBoundingClientRect();
        targetX = e.clientX - rect.left;
        targetY = e.clientY - rect.top;
        lastMove = performance.now();

        if (!inside) {
            inside = true;
            // First entry: materialize at the cursor instead of flying in.
            segs.forEach(seg => {
                seg.x = targetX;
                seg.y = targetY;
                seg.el.style.opacity = seg.fade;
            });
        }
        if (!raf) {
            lastTs = 0;
            raf = requestAnimationFrame(step);
        }
    });

    section.addEventListener("mouseleave", () => {
        inside = false;
        segs.forEach(seg => { seg.el.style.opacity = 0; });
    });
}

async function initContacts() {
    const container = document.getElementById("contacts-cards");
    if (!container) return;

    const response = await fetch("Data/contacts.json");
    contactsData = await response.json();

    container.replaceChildren(...Object.values(contactsData).map(buildCard));
}

initContacts();
initSpotlight();
