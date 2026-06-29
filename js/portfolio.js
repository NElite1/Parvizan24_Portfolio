const portfolioContent = document.getElementById("portfolio-content");
const portfolioLogo = document.getElementById('portfolio-section-logo');

function renderPortfolio(active) {
    portfolioLogo.remove();
    portfolioContent.innerHTML = `
        <div id="portfolio-content-activated">
            <div id="portfolio-navigation-activated">
                <div id="portfolio-section-logo-activated">
                  <h3>Portfolio</h3>
                </div>
                <div class="portfolio-element-activated ${active === "myWorks" ? "portfolio-element-clicked" : ""}" id="myWorks">
                    <img src="icons/Cube.png" alt="My Works" class="portfolio-element-icon-activated">
                    <h3>My Works</h3>
                </div>

                <div class="portfolio-element-activated ${active === "projects" ? "portfolio-element-clicked" : ""}" id="projects">
                    <img src="icons/cube_focus.png" alt="Projects" class="portfolio-element-icon-activated">
                    <h3>Projects</h3>
                </div>

                <div class="portfolio-element-activated ${active === "skills" ? "portfolio-element-clicked" : ""}" id="skills">
                    <img src="icons/address_book.png" alt="Skills" class="portfolio-element-icon-activated">
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