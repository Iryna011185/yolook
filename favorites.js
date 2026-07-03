const FAVORITES_STORAGE_KEY = "yolook-favorites-v1";

(() => {
  const listeners = new Set();
  let favoriteIds = loadFavoriteIds();

  const getFavoriteIds = () => [...favoriteIds];
  const hasFavorite = (productId) => favoriteIds.includes(productId);

  const persistFavoriteIds = () => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch (error) {
      // Ignore storage errors to keep the interface interactive.
    }
  };

  const updateFavoriteButtonState = (button) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const productId = resolveProductId(button);

    if (!productId) {
      return;
    }

    const isActive = hasFavorite(productId);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.setAttribute("aria-label", isActive ? "Убрать из избранного" : "Добавить в избранное");
  };

  const updateFavoriteLabelState = (scope) => {
    if (!(scope instanceof HTMLElement)) {
      return;
    }

    const button = scope.querySelector("[data-favorite-toggle]");
    const label = scope.querySelector("[data-favorite-label]");

    if (!(button instanceof HTMLElement) || !(label instanceof HTMLElement)) {
      return;
    }

    const productId = resolveProductId(button);

    if (!productId) {
      return;
    }

    label.textContent = hasFavorite(productId) ? "В ИЗБРАННОМ" : "В ИЗБРАННОЕ";
  };

  const syncUI = (root = document) => {
    if (!(root instanceof Document) && !(root instanceof HTMLElement)) {
      return;
    }

    root.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
      updateFavoriteButtonState(button);
    });

    root.querySelectorAll(".product-actions").forEach((scope) => {
      updateFavoriteLabelState(scope);
    });
  };

  const notify = () => {
    syncUI(document);
    listeners.forEach((listener) => {
      try {
        listener(getFavoriteIds());
      } catch (error) {
        // Ignore listener errors so one subscriber does not break the rest.
      }
    });

    document.dispatchEvent(
      new CustomEvent("yolook:favoriteschange", {
        detail: {
          ids: getFavoriteIds(),
        },
      })
    );
  };

  const toggleFavorite = (productId) => {
    if (!productId) {
      return false;
    }

    if (hasFavorite(productId)) {
      favoriteIds = favoriteIds.filter((id) => id !== productId);
    } else {
      favoriteIds = [...favoriteIds, productId];
    }

    persistFavoriteIds();
    notify();
    return hasFavorite(productId);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest("[data-favorite-toggle]");

    if (!(button instanceof HTMLElement)) {
      return;
    }

    const productId = resolveProductId(button);

    if (!productId) {
      return;
    }

    event.preventDefault();
    toggleFavorite(productId);
  });

  window.YOLOOK_FAVORITES = {
    getIds: getFavoriteIds,
    has: hasFavorite,
    toggle: toggleFavorite,
    subscribe(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }

      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    syncUI,
  };

  syncUI(document);
})();

function loadFavoriteIds() {
  try {
    const rawValue = localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function resolveProductId(button) {
  if (!(button instanceof HTMLElement)) {
    return "";
  }

  return (
    button.dataset.productId?.trim() ||
    button.closest("[data-product-id]")?.getAttribute("data-product-id")?.trim() ||
    document.body.dataset.productId?.trim() ||
    ""
  );
}
