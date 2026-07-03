const slides = Array.from(document.querySelectorAll("[data-slide]"));
const buttons = Array.from(document.querySelectorAll("[data-slide-button]"));
const progress = document.querySelector(".hero-progress");
const mobilePaginationQuery = window.matchMedia("(max-width: 640px)");

let currentSlide = 0;
let autoplayId = null;

function updateProgressPosition(index) {
  if (!progress) {
    return;
  }

  const targetButton = buttons[index];

  if (!targetButton) {
    return;
  }

  const isMobile = mobilePaginationQuery.matches;

  if (isMobile) {
    progress.style.top = "auto";
    progress.style.left = `${targetButton.offsetLeft + (targetButton.offsetWidth - progress.offsetWidth) / 2}px`;
    return;
  }

  progress.style.left = "";
  progress.style.top = `${targetButton.offsetTop + (targetButton.offsetHeight - progress.offsetHeight) / 2}px`;
}

function setSlide(index) {
  currentSlide = index;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === index);
  });

  buttons.forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "true" : "false");
  });
  updateProgressPosition(index);
}

function startAutoplay() {
  if (autoplayId) {
    window.clearInterval(autoplayId);
  }

  autoplayId = window.setInterval(() => {
    const nextIndex = (currentSlide + 1) % slides.length;
    setSlide(nextIndex);
  }, 5000);
}

buttons.forEach((button, index) => {
  button.addEventListener("click", () => {
    setSlide(index);
    startAutoplay();
  });
});

window.addEventListener("resize", () => {
  updateProgressPosition(currentSlide);
});

if (typeof mobilePaginationQuery.addEventListener === "function") {
  mobilePaginationQuery.addEventListener("change", () => {
    updateProgressPosition(currentSlide);
  });
}

setSlide(0);
startAutoplay();
