const myWorks=document.getElementById('myWorks');
const projects=document.getElementById('projects');
const skills=document.getElementById('skills');
let portfolioContent=document.getElementById('portfolio-content');

myWorks.addEventListener('click',() => {
  portfolioContent.innerHTML = `
    <div id="portfolio">
    <div id="portfolio-content-activated">
      <div id="portfolio-navigation">
        <div class="portfolio-element-activated" id="myWorks">
          <img src="icons/Cube.png" alt="My Works" class="portfolio-element-icon-activated">
          <h3>My Works </h3>
        </div>
        <div class="portfolio-element-activated" id="projects">
          <img src="icons/cube_focus.png" alt="Projects" class="portfolio-element-icon-activated">
          <h3>Projects</h3>
        </div>
        <div class="portfolio-element-activated portfolio-element-clicked" id="skills">
          <img src="icons/address_book.png" alt="Skills" class="portfolio-element-icon-activated">
          <h3>Skills</h3>
      </div>
      
      
      </div>
      <div id="portfolio-active-content">
        
      </div>
    </div>
    </div>
  </div>
  `
})
projects.addEventListener('click',() => {
  portfolioContent.innerHTML =  `
    <div id="portfolio">
    <div id="portfolio-content-activated">
      <div id="portfolio-navigation">
        <div class="portfolio-element-activated" id="myWorks">
          <img src="icons/Cube.png" alt="My Works" class="portfolio-element-icon-activated">
          <h3>My Works </h3>
        </div>
        <div class="portfolio-element-activated" id="projects">
          <img src="icons/cube_focus.png" alt="Projects" class="portfolio-element-icon-activated">
          <h3>Projects</h3>
        </div>
        <div class="portfolio-element-activated portfolio-element-clicked" id="skills">
          <img src="icons/address_book.png" alt="Skills" class="portfolio-element-icon-activated">
          <h3>Skills</h3>
      </div>
      
      
      </div>
      <div id="portfolio-active-content">
        
      </div>
    </div>
    </div>
  </div>
  `;
})
skills.addEventListener('click',() => {
  portfolioContent.innerHTML =  `
    <div id="portfolio">
    <div id="portfolio-content-activated">
      <div id="portfolio-navigation">
        <div class="portfolio-element-activated" id="myWorks">
          <img src="icons/Cube.png" alt="My Works" class="portfolio-element-icon-activated">
          <h3>My Works </h3>
        </div>
        <div class="portfolio-element-activated" id="projects">
          <img src="icons/cube_focus.png" alt="Projects" class="portfolio-element-icon-activated">
          <h3>Projects</h3>
        </div>
        <div class="portfolio-element-activated portfolio-element-clicked" id="skills">
          <img src="icons/address_book.png" alt="Skills" class="portfolio-element-icon-activated">
          <h3>Skills</h3>
      </div>
      
      
      </div>
      <div id="portfolio-active-content">
        
      </div>
    </div>
    </div>
  </div>
  `;
})






