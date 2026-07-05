import { initMyWorks } from "./my_works/my_works.js";

const portfolioContent = document.getElementById("portfolio-content");
const portfolioLogo = document.getElementById('portfolio-websection-logo');

// Each section's markup for #portfolio-active-content. Only My Works has a
// real build so far; Projects/Skills stay empty placeholders.
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
    projects: "",
    skills: "",
};

let activeSection = null;

function renderPortfolio(active) {
    if (!portfolioContent) return;
    if (active === activeSection) return;
    activeSection = active;

    if (portfolioLogo) portfolioLogo.remove();
    portfolioContent.innerHTML = `
        <div id="portfolio-content-activated">
            <div id="portfolio-navigation-activated">

                <div id="portfolio-websection-logo-activated">
                  <h3>Portfolio</h3>
                </div>

                <div class="portfolio-section-activated ${active === "myWorks" ? "portfolio-section-clicked" : ""}" id="myWorks">
                    <img src="icons/Cube.png" alt="My Works" class="portfolio-section-icon-activated">
                    <h3>My Works</h3>
                </div>

                <div class="portfolio-section-activated ${active === "projects" ? "portfolio-section-clicked" : ""}" id="projects">
                    <img src="icons/cube_focus.png" alt="Projects" class="portfolio-section-icon-activated">
                    <h3>Projects</h3>
                </div>

                <div class="portfolio-section-activated ${active === "skills" ? "portfolio-section-clicked" : ""}" id="skills">
                    <img src="icons/address_book.png" alt="Skills" class="portfolio-section-icon-activated">
                    <h3>Skills</h3>
                </div>

            </div>

            <div id="portfolio-active-content">
                ${ACTIVE_CONTENT[active] ?? ""}
            </div>
        </div>
    `;

    // Reattach listeners to the NEW buttons
    addPortfolioListeners();

    if (active === "myWorks") initMyWorks();
}

function addPortfolioListeners() {
    document.getElementById("myWorks")
        ?.addEventListener("click", () => renderPortfolio("myWorks"));

    document.getElementById("projects")
        ?.addEventListener("click", () => renderPortfolio("projects"));

    document.getElementById("skills")
        ?.addEventListener("click", () => renderPortfolio("skills"));
}

// Attach listeners to the INITIAL buttons already in the HTML
addPortfolioListeners();