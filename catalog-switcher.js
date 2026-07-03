(() => {
  const catalog = window.YOLOOK_CATALOG;
  const cardsRoot = document.querySelector("[data-catalog-cards-root]");
  const categoryTiles = Array.from(document.querySelectorAll("[data-category-key]"));
  const prevButton = document.querySelector('[data-catalog-nav="prev"]');
  const nextButton = document.querySelector('[data-catalog-nav="next"]');
  const currentLabel = document.querySelector("[data-catalog-current]");
  const currentNote = document.querySelector("[data-catalog-note]");

  if (!catalog || !(cardsRoot instanceof HTMLElement) || categoryTiles.length === 0) {
    return;
  }

  const categoryOrder = categoryTiles
    .map((tile) => tile.dataset.categoryKey?.trim())
    .filter(Boolean);

  if (categoryOrder.length === 0) {
    return;
  }

  const formatPrice = (value) => `${new Intl.NumberFormat("ru-RU").format(value)} BYN`;
  const formatModelsCount = (value) => {
    const abs = Math.abs(value) % 100;
    const last = abs % 10;

    if (abs > 10 && abs < 20) {
      return `${value} МОДЕЛЕЙ`;
    }

    if (last === 1) {
      return `${value} МОДЕЛЬ`;
    }

    if (last >= 2 && last <= 4) {
      return `${value} МОДЕЛИ`;
    }

    return `${value} МОДЕЛЕЙ`;
  };

  const createProductCardMarkup = (product) => `
    <article class="product-card">
      <div class="product-visual" aria-hidden="true">
        <a class="product-card-media-link" href="${product.url}" aria-label="Открыть ${product.name}">
          <img class="product-photo" src="${product.image}" alt="${product.name}" loading="lazy" />
        </a>
        <button class="favorite-button" type="button" data-favorite-toggle data-product-id="${product.id}" aria-label="Добавить ${product.name} в избранное" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.4 4.9 13.8a4.7 4.7 0 0 1 6.6-6.7L12 7.6l.5-.5a4.7 4.7 0 0 1 6.6 6.7Z"></path>
          </svg>
        </button>
      </div>
      <div class="product-meta">
        <h3 class="product-name"><a class="product-card-link" href="${product.url}">${product.name}</a></h3>
        <p class="product-price">${formatPrice(product.unitPrice)}</p>
      </div>
    </article>
  `;

  const hashCategoryMap = {
    "#pod-zakaz": "order",
  };

  let activeCategory = hashCategoryMap[window.location.hash] && categoryOrder.includes(hashCategoryMap[window.location.hash])
    ? hashCategoryMap[window.location.hash]
    : catalog.defaultCategory && categoryOrder.includes(catalog.defaultCategory)
      ? catalog.defaultCategory
      : categoryOrder[0];

  const getCatalogNote = (categoryKey) => {
    if (categoryKey === "favorites") {
      return "Сохраненные модели, которые вы отметили сердечком.";
    }

    if (categoryKey === "all") {
      return "Весь ассортимент: актуальные модели и позиции, которые можно заказать отдельно.";
    }

    if (categoryKey === "order") {
      return "Модели под заказ. Уточним оттенок, детали и сроки после заявки.";
    }

    return "Подборка актуальных моделей, которые сейчас доступны к заказу.";
  };

  const getProductIdsForCategory = (categoryKey) => {
    if (categoryKey === "favorites") {
      const favoriteIds = window.YOLOOK_FAVORITES?.getIds?.() || [];
      return favoriteIds.filter((productId) => Boolean(catalog.products[productId]));
    }

    return catalog.featuredByCategory[categoryKey];
  };

  const createEmptyStateMarkup = () => `
    <article class="product-card product-card-empty">
      <div class="product-empty-copy">
        <h3 class="product-empty-title">В избранном пока пусто</h3>
        <p class="product-empty-text">Нажмите на сердечко у понравившейся модели, и она появится здесь.</p>
      </div>
    </article>
  `;

  const syncActiveTile = () => {
    categoryTiles.forEach((tile) => {
      const isActive = tile.dataset.categoryKey === activeCategory;
      tile.classList.toggle("is-active", isActive);
      tile.setAttribute("aria-pressed", String(isActive));
    });

    if (currentLabel) {
      const category = catalog.categories[activeCategory];
      const productIds = getProductIdsForCategory(activeCategory);
      const productCount = Array.isArray(productIds)
        ? productIds.length
        : 0;
      currentLabel.innerHTML = `${category?.label || ""}<br />${formatModelsCount(productCount)}`;
    }

    if (currentNote) {
      currentNote.textContent = getCatalogNote(activeCategory);
    }
  };

  const renderCategory = (categoryKey) => {
    const productIds = getProductIdsForCategory(categoryKey);

    if (!Array.isArray(productIds)) {
      return;
    }

    activeCategory = categoryKey;
    const visibleProducts = productIds
      .map((productId) => catalog.products[productId])
      .filter(Boolean);

    cardsRoot.innerHTML = visibleProducts.length > 0
      ? visibleProducts.map(createProductCardMarkup).join("")
      : createEmptyStateMarkup();

    syncActiveTile();
    window.YOLOOK_FAVORITES?.syncUI?.(cardsRoot);
  };

  const showAdjacentCategory = (direction) => {
    const currentIndex = categoryOrder.indexOf(activeCategory);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + direction + categoryOrder.length) % categoryOrder.length;
    renderCategory(categoryOrder[nextIndex]);
  };

  categoryTiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      const categoryKey = tile.dataset.categoryKey;

      if (!categoryKey) {
        return;
      }

      renderCategory(categoryKey);
    });
  });

  prevButton?.addEventListener("click", () => {
    showAdjacentCategory(-1);
  });

  nextButton?.addEventListener("click", () => {
    showAdjacentCategory(1);
  });

  document.addEventListener("yolook:favoriteschange", () => {
    if (activeCategory === "favorites") {
      renderCategory("favorites");
      return;
    }

    syncActiveTile();
    window.YOLOOK_FAVORITES?.syncUI?.(cardsRoot);
  });

  window.addEventListener("hashchange", () => {
    const hashCategory = hashCategoryMap[window.location.hash];

    if (hashCategory && hashCategory !== activeCategory && categoryOrder.includes(hashCategory)) {
      renderCategory(hashCategory);
    }
  });

  renderCategory(activeCategory);
})();
