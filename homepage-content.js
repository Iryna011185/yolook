(() => {
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

  const loadHomepageContent = async () => {
    try {
      const response = await window.fetch("./data/homepage-content.json", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load homepage content: ${response.status}`);
      }

      const homepageContent = await response.json();
      window.YOLOOK_HOMEPAGE_CONTENT = homepageContent;
      applySlides(homepageContent.heroSlides);
      window.dispatchEvent(
        new CustomEvent("yolook:homepagecontentready", {
          detail: homepageContent,
        })
      );
    } catch (error) {
      console.error(error);
    }
  };

  loadHomepageContent();
})();
