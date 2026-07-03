(() => {
  const slider = document.querySelector("[data-reviews-slider]");
  const track = document.querySelector("[data-reviews-track]");
  const prevButton = document.querySelector("[data-reviews-prev]");
  const nextButton = document.querySelector("[data-reviews-next]");
  const dotsRoot = document.querySelector("[data-reviews-dots]");

  if (!(slider instanceof HTMLElement) || !(track instanceof HTMLElement)) {
    return;
  }

  const slides = Array.from(track.children).filter((node) => node instanceof HTMLElement);

  if (slides.length === 0) {
    return;
  }

  let activeIndex = 0;
  let autoplayId = null;

  const renderDots = () => {
    if (!(dotsRoot instanceof HTMLElement)) {
      return;
    }

    dotsRoot.innerHTML = slides
      .map(
        (_, index) => `
          <button
            class="reviews-dot${index === activeIndex ? " is-active" : ""}"
            type="button"
            aria-label="Перейти к отзыву ${index + 1}"
            aria-pressed="${index === activeIndex ? "true" : "false"}"
            data-review-dot="${index}"
          ></button>
        `
      )
      .join("");

    dotsRoot.querySelectorAll("[data-review-dot]").forEach((dot) => {
      dot.addEventListener("click", () => {
        const nextIndex = Number(dot.getAttribute("data-review-dot"));

        if (!Number.isNaN(nextIndex)) {
          setActive(nextIndex);
          restartAutoplay();
        }
      });
    });
  };

  const setActive = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
      slide.setAttribute("aria-hidden", slideIndex === activeIndex ? "false" : "true");
    });

    renderDots();
  };

  const step = (direction) => {
    setActive(activeIndex + direction);
  };

  const stopAutoplay = () => {
    if (autoplayId !== null) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    autoplayId = window.setInterval(() => {
      step(1);
    }, 6500);
  };

  const restartAutoplay = () => {
    startAutoplay();
  };

  prevButton?.addEventListener("click", () => {
    step(-1);
    restartAutoplay();
  });

  nextButton?.addEventListener("click", () => {
    step(1);
    restartAutoplay();
  });

  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);
  slider.addEventListener("focusin", stopAutoplay);
  slider.addEventListener("focusout", startAutoplay);

  setActive(0);
  startAutoplay();
})();
