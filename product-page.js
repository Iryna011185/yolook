(() => {
  const catalog = window.YOLOOK_CATALOG;
  const galleryViewClass = "view-front";

  if (!catalog || !(document.body instanceof HTMLElement)) {
    return;
  }

  const pageUrl = new URL(window.location.href);
  const requestedProductId = pageUrl.searchParams.get("product")?.trim();
  const fallbackProductId = catalog.featuredByCategory[catalog.defaultCategory]?.[0];
  const product = catalog.products[requestedProductId] || catalog.products[fallbackProductId];

  if (!product) {
    return;
  }

  document.body.dataset.productId = product.id;
  document.title = `${product.name} — YOLOOK`;

  const badgeNode = document.querySelector("[data-product-badge]");
  const categoryNode = document.querySelector("[data-product-category]");
  const titleNode = document.querySelector("[data-product-title]");
  const subtitleNode = document.querySelector("[data-product-subtitle]");
  const priceNode = document.querySelector("[data-product-price]");
  const descriptionNode = document.querySelector("[data-product-description]");
  const breadcrumbCategoryLink = document.querySelector("[data-product-breadcrumb-category-link]");
  const breadcrumbCategoryName = document.querySelector("[data-product-breadcrumb-category-name]");
  const breadcrumbName = document.querySelector("[data-product-breadcrumb-name]");
  const thumbsRoot = document.querySelector(".product-thumbs");
  const mainImage = document.getElementById("productMainImage");
  const moreButton = document.querySelector(".product-thumb-more");
  const stageCounter = document.querySelector(".product-stage-counter");
  const favoriteButton = document.querySelector("[data-favorite-toggle]");
  const productImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];

  if (badgeNode) {
    badgeNode.textContent = product.badge || "НОВИНКА";
  }

  if (categoryNode) {
    categoryNode.textContent = product.categoryLabel;
  }

  if (titleNode) {
    titleNode.textContent = product.name;
  }

  if (subtitleNode) {
    subtitleNode.textContent = product.subtitle;
  }

  if (priceNode) {
    priceNode.textContent = `${new Intl.NumberFormat("ru-RU").format(product.unitPrice)} BYN`;
  }

  if (descriptionNode) {
    if (product.descriptionHtml) {
      descriptionNode.innerHTML = product.descriptionHtml;
    } else {
      descriptionNode.textContent = product.description;
    }
  }

  if (breadcrumbCategoryLink instanceof HTMLAnchorElement) {
    breadcrumbCategoryLink.textContent = product.categoryTitle;
    breadcrumbCategoryLink.href = product.category === "order"
      ? "./index.html#pod-zakaz"
      : "./index.html#catalog-title";
  }

  if (breadcrumbCategoryName) {
    breadcrumbCategoryName.textContent = product.categoryTitle;
  }

  if (breadcrumbName) {
    breadcrumbName.textContent = product.name;
  }

  if (mainImage instanceof HTMLImageElement) {
    mainImage.src = productImages[0] || product.image;
    mainImage.alt = product.name;
  }

  if (favoriteButton instanceof HTMLElement) {
    favoriteButton.dataset.productId = product.id;
  }

  if (thumbsRoot instanceof HTMLElement) {
    thumbsRoot
      .querySelectorAll(".product-thumb[data-main-view]")
      .forEach((button) => button.remove());

    const thumbsFragment = document.createDocumentFragment();

    productImages.forEach((imageSource, index) => {
      const thumbButton = document.createElement("button");
      thumbButton.className = `product-thumb${index === 0 ? " is-active" : ""}`;
      thumbButton.type = "button";
      thumbButton.dataset.mainView = galleryViewClass;
      thumbButton.dataset.imageIndex = String(index);
      thumbButton.dataset.imageSrc = imageSource;
      thumbButton.dataset.imageAlt = `${product.name} ${index + 1}`;
      thumbButton.setAttribute("aria-label", `Фото ${index + 1}`);

      const thumbImage = document.createElement("img");
      thumbImage.className = "product-thumb-image";
      thumbImage.src = imageSource;
      thumbImage.alt = `${product.name} ${index + 1}`;

      thumbButton.append(thumbImage);
      thumbsFragment.append(thumbButton);
    });

    if (moreButton instanceof HTMLElement) {
      thumbsRoot.insertBefore(thumbsFragment, moreButton);
    } else {
      thumbsRoot.append(thumbsFragment);
    }
  }

  if (moreButton instanceof HTMLElement) {
    moreButton.hidden = productImages.length <= 1;
  }

  if (stageCounter instanceof HTMLElement) {
    const total = String(productImages.length).padStart(2, "0");
    stageCounter.innerHTML = `01 <span>/</span> ${total}`;
  }
})();
