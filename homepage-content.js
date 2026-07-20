(() => {
  const homepageContent = {
  "heroSlides": [
    {
      "title": "НОВИНКИ",
      "image": "assets/admin-uploads/slides/img-8359-1784538273449.jpeg"
    },
    {
      "title": "НОВИНКИ",
      "image": "assets/admin-uploads/slides/img-8360-1784538751297.jpeg"
    },
    {
      "title": "НОВИНКИ",
      "image": "assets/admin-uploads/slides/img-8361-1784538762744.jpeg"
    },
    {
      "title": "НОВИНКИ",
      "image": "assets/admin-uploads/slides/img-8362-1784538771037.jpeg"
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
