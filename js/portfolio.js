const portfolioContent = document.getElementById("portfolio-content");
const portfolioLogo = document.getElementById('portfolio-websection-logo');

function renderPortfolio(active) {
    portfolioLogo.remove();
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
                ${active === 'myWorks' ? 
                    `<div id="portfolio-active-content">
                        <div id="portfolio-active-content-navbar">
                            <h3 class="works_section">Design</h3>
                            <h3 class="works_section">Programming</h3>
                            <h3 class="works_section">Engineering</h3>
                            <h3 class="works_section">Good Person :)</h3>
                        </div>
                    </div>`
                    : ''
                }
            </div>
        </div>
    `;

    // Reattach listeners to the NEW buttons
    addPortfolioListeners();
}

function addPortfolioListeners() {
    document.getElementById("myWorks")
        .addEventListener("click", () => renderPortfolio("myWorks"));

    document.getElementById("projects")
        .addEventListener("click", () => renderPortfolio("projects"));

    document.getElementById("skills")
        .addEventListener("click", () => renderPortfolio("skills"));
}

// Attach listeners to the INITIAL buttons already in the HTML
addPortfolioListeners();