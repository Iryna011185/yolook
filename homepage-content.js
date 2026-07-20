(() => {
  const homepageContent = {
  "heroSlides": [
    {
      "title": "В наличии",
      "image": "assets/admin-uploads/slides/img-8359-1784538273449.jpeg"
    },
    {
      "title": "НОВИНКИ",
      "image": "./assets/slider/brand-slide-2.avif"
    },
    {
      "title": "НОВИНКИ",
      "image": "./assets/slider/brand-slide-3.png"
    },
    {
      "title": "НОВИНКИ",
      "image": "./assets/slider/brand-slide-4.jpg"
    }
  ]
};

  const applySlides = (slides) => {
    if (!Array.isArray(slides) || slides.length === 0) {
      return;
    }

    const slideNodes = Array.from(document.querySelectorAll("[data-slide]"));

    slideNodes.forEach((slideNode, index) => {
      const slideData = slides[index];

      if (!slideData) {
        return;
      }

      const mediaNode = slideNode.querySelector(".hero-media");
      const titleNode = slideNode.querySelector(".hero-title");

      if (mediaNode instanceof HTMLElement && typeof slideData.image === "string" && slideData.image.trim()) {
        mediaNode.style.backgroundImage = `url('${slideData.image.trim()}')`;
      }

      if (titleNode instanceof HTMLElement && typeof slideData.title === "string" && slideData.title.trim()) {
        titleNode.textContent = slideData.title.trim();
      }
    });
  };

  window.YOLOOK_HOMEPAGE_CONTENT = homepageContent;
  applySlides(homepageContent.heroSlides);
  window.dispatchEvent(
    new CustomEvent("yolook:homepagecontentready", {
      detail: homepageContent,
    })
  );
})();
