const CART_STORAGE_KEY = "yolook-cart-v2";
const CART_PROMO_CODES = {
  YOLOOK10: 0.1,
  SUMMER10: 0.1,
  MAISON5: 0.05,
};
const DEFAULT_CART_PRODUCTS = {
  "taupe-baguette": {
    id: "taupe-baguette",
    name: "TAUPE BAGUETTE",
    unitPrice: 70,
    url: "./product.html?product=taupe-baguette",
    image: "./assets/catalog/custom/taupe-baguette-studio.png",
    imageClass: "",
  },
  "choco-shopper": {
    id: "choco-shopper",
    name: "CHOCO SHOPPER",
    unitPrice: 115,
    url: "./product.html?product=choco-shopper",
    image: "./assets/catalog/custom/choco-shopper-look.png",
    imageClass: "",
  },
  "mini-box": {
    id: "mini-box",
    name: "MINI BOX",
    unitPrice: 75,
    url: "./product.html?product=mini-box",
    image: "./assets/catalog/custom/mini-box-studio.png",
    imageClass: "",
  },
  "asym-baguette": {
    id: "asym-baguette",
    name: "ASYM BAGUETTE",
    unitPrice: 70,
    url: "./product.html?product=asym-baguette",
    image: "./assets/catalog/custom/asym-baguette-studio.png",
    imageClass: "",
  },
};
const CART_PRODUCTS = window.YOLOOK_CATALOG?.products
  ? Object.fromEntries(
      Object.values(window.YOLOOK_CATALOG.products).map((product) => [
        product.id,
        {
          id: product.id,
          name: product.name,
          unitPrice: product.unitPrice,
          url: product.url,
          image: product.image,
          imageClass: product.imageClass || "",
        },
      ])
    )
  : DEFAULT_CART_PRODUCTS;

const cartPageUrl = new URL(window.location.href);
const shouldResetCart = cartPageUrl.searchParams.get("resetCart") === "1";
const cartItemsRoot = document.querySelector("[data-cart-items-root]");
const checkoutPageUrl = new URL("./checkout.html", window.location.href).href;

if (cartItemsRoot) {
  const emptyState = document.querySelector("[data-cart-empty]");
  const summaryCount = document.querySelector("[data-cart-summary-count]");
  const summarySubtotal = document.querySelector("[data-cart-summary-subtotal]");
  const summaryTotal = document.querySelector("[data-cart-summary-total]");
  const summaryDiscount = document.querySelector("[data-cart-summary-discount]");
  const summaryDiscountRow = document.querySelector("[data-cart-discount-row]");
  const cartCount = document.querySelector(".cart-count");
  const promoInput = document.querySelector(".cart-promo-input");
  const promoButton = document.querySelector("[data-cart-apply-promo]");
  const promoStatus = document.querySelector("[data-cart-promo-status]");
  const checkoutButton = document.querySelector("[data-cart-checkout]");

  if (shouldResetCart) {
    resetCartState();
    cartPageUrl.searchParams.delete("resetCart");
    window.history.replaceState({}, "", cartPageUrl.pathname + cartPageUrl.search + cartPageUrl.hash);
  }

  const savedState = loadCartState();
  const state = {
    items: savedState.items,
    promoCode: savedState.promoCode,
    promoRate: savedState.promoRate,
  };

  if (promoInput && state.promoCode) {
    promoInput.value = state.promoCode;
  }

  cartItemsRoot.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-cart-action]");

    if (!(actionButton instanceof HTMLElement)) {
      return;
    }

    const itemNode = actionButton.closest("[data-cart-item]");

    if (!(itemNode instanceof HTMLElement)) {
      return;
    }

    const itemId = itemNode.dataset.productId;
    const itemState = state.items.find((item) => item.id === itemId);

    if (!itemId || !itemState) {
      return;
    }

    const action = actionButton.dataset.cartAction;

    if (action === "increase") {
      itemState.qty += 1;
    }

    if (action === "decrease") {
      itemState.qty = Math.max(0, itemState.qty - 1);
    }

    if (action === "remove") {
      itemState.qty = 0;
    }

    state.items = state.items.filter((item) => item.qty > 0);
    persistCartState(state);
    renderCart();
  });

  if (promoButton) {
    promoButton.addEventListener("click", applyPromoCode);
  }

  if (promoInput) {
    promoInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      applyPromoCode();
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", (event) => {
      if (checkoutButton.classList.contains("is-disabled")) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      window.location.assign(checkoutPageUrl);
    });
  }

  renderCart();

  function applyPromoCode() {
    if (!promoInput || !promoStatus) {
      return;
    }

    const normalizedCode = promoInput.value.trim().toUpperCase();

    promoStatus.classList.remove("is-error", "is-success");

    if (!normalizedCode) {
      state.promoCode = "";
      state.promoRate = 0;
      promoStatus.textContent = "Промокод очищен.";
      persistCartState(state);
      renderCart();
      return;
    }

    const promoRate = CART_PROMO_CODES[normalizedCode];

    if (!promoRate) {
      promoStatus.textContent = "Такой промокод не найден.";
      promoStatus.classList.add("is-error");
      return;
    }

    state.promoCode = normalizedCode;
    state.promoRate = promoRate;
    promoInput.value = normalizedCode;
    promoStatus.textContent = `Промокод ${normalizedCode} применен.`;
    promoStatus.classList.add("is-success");
    persistCartState(state);
    renderCart();
  }

  function renderCart() {
    const visibleItems = state.items
      .filter((item) => item.qty > 0)
      .map((item) => {
        const product = CART_PRODUCTS[item.id];
        return product ? { ...product, qty: item.qty } : null;
      })
      .filter(Boolean);

    cartItemsRoot.innerHTML = visibleItems.map((item) => createCartItemMarkup(item)).join("");

    const distinctCount = visibleItems.length;
    const subtotal = visibleItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const discountAmount = Math.round(subtotal * state.promoRate);
    const total = Math.max(0, subtotal - discountAmount);

    if (summaryCount) {
      summaryCount.textContent = `Товары (${distinctCount})`;
    }

    if (summarySubtotal) {
      summarySubtotal.textContent = formatPrice(subtotal);
    }

    if (summaryTotal) {
      summaryTotal.textContent = formatPrice(total);
    }

    if (summaryDiscount && summaryDiscountRow) {
      summaryDiscount.textContent = formatPrice(discountAmount);
      summaryDiscountRow.hidden = discountAmount === 0;
    }

    if (cartCount) {
      cartCount.textContent = String(distinctCount);
    }

    if (emptyState) {
      emptyState.hidden = distinctCount !== 0;
    }

    if (checkoutButton) {
      checkoutButton.classList.toggle("is-disabled", distinctCount === 0);
      checkoutButton.setAttribute("href", distinctCount > 0 ? checkoutPageUrl : window.location.href);
    }

    persistCartState(state);
  }
}

function createCartItemMarkup(item) {
  return `
    <article
      class="cart-item"
      data-cart-item
      data-product-id="${item.id}"
    >
      <div class="cart-item-media">
        <a class="cart-item-media-link" href="${item.url}" aria-label="Открыть ${item.name}">
          <img class="cart-item-image ${item.imageClass}" src="${item.image}" alt="${item.name}" />
        </a>
      </div>

      <div class="cart-item-content">
        <div class="cart-item-copy">
          <h2 class="cart-item-title"><a class="cart-item-title-link" href="${item.url}">${item.name}</a></h2>
          <p class="cart-item-detail">Цвет: <span>Чёрный</span></p>
          <p class="cart-item-detail">Размер: <span>One Size</span></p>
        </div>

        <div class="cart-item-qty" aria-label="Количество ${item.name}">
          <button class="cart-item-qty-button" type="button" aria-label="${item.qty > 1 ? "Уменьшить" : `Убрать ${item.name} из корзины`}" data-cart-action="decrease">−</button>
          <span class="cart-item-qty-value" data-cart-qty>${item.qty}</span>
          <button class="cart-item-qty-button" type="button" aria-label="Увеличить" data-cart-action="increase">+</button>
        </div>

        <p class="cart-item-price" data-cart-line-price>${formatPrice(item.qty * item.unitPrice)}</p>

        <button class="cart-item-remove" type="button" aria-label="Удалить ${item.name}" data-cart-action="remove">×</button>
      </div>
    </article>
  `;
}

function loadCartState() {
  const fallbackState = {
    items: [],
    promoCode: "",
    promoRate: 0,
  };

  try {
    const rawState = localStorage.getItem(CART_STORAGE_KEY);

    if (!rawState) {
      return fallbackState;
    }

    const parsedState = JSON.parse(rawState);
    const items = Array.isArray(parsedState.items)
      ? parsedState.items
          .map((item) => ({
            id: item.id,
            qty: Number.isFinite(item.qty) ? Math.max(0, Math.round(item.qty)) : 0,
          }))
          .filter((item) => CART_PRODUCTS[item.id] && item.qty > 0)
      : [];

    return {
      items,
      promoCode: typeof parsedState.promoCode === "string" ? parsedState.promoCode : "",
      promoRate: Number.isFinite(parsedState.promoRate) ? parsedState.promoRate : 0,
    };
  } catch (error) {
    return fallbackState;
  }
}

function persistCartState(state) {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: state.items.filter((item) => item.qty > 0),
        promoCode: state.promoCode,
        promoRate: state.promoRate,
      })
    );
  } catch (error) {
    // Ignore storage errors and keep the cart interactive in memory.
  }
}

function resetCartState() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    // Ignore storage errors and continue with default cart values.
  }
}

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} BYN`;
}
