document.querySelectorAll(".works_section").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelector(".works_section.active")
            item.classList.remove("active");

        item.classList.add("active");
    });
});