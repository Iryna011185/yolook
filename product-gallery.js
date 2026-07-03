const mainImage = document.getElementById("productMainImage");
const thumbButtons = Array.from(document.querySelectorAll(".product-thumb[data-main-view]")).filter((button) => !button.hidden);
const moreButton = document.querySelector(".product-thumb-more");
const stageCounter = document.querySelector(".product-stage-counter");
const qtyValue = document.querySelector(".product-qty-value");
const qtyButtons = Array.from(document.querySelectorAll(".product-qty-button"));
const orderTrigger = document.querySelector("[data-order-trigger]");
const productTitle = document.querySelector(".product-page-title");
const productPrice = document.querySelector(".product-page-price");
const cartCount = document.querySelector(".cart-count");
const CART_STORAGE_KEY = "yolook-cart-v2";
const cartPageUrl = "./cart.html";
const initialAddButtonLabel = orderTrigger?.querySelector("span")?.textContent.trim() || "";
const currentProductFileName = window.location.pathname.split("/").pop() || "";
const currentProductId =
  document.body?.dataset.productId?.trim() ||
  new URL(window.location.href).searchParams.get("product")?.trim() ||
  currentProductFileName.replace(/\.html$/, "");

const getImageSource = (imageElement) => {
  if (!imageElement) {
    return "";
  }

  return imageElement.currentSrc || imageElement.src || imageElement.getAttribute("src") || "";
};

const getCurrentProductImage = () => {
  const activeThumbImage = document.querySelector(".product-thumb.is-active .product-thumb-image");
  const fallbackThumbImage = document.querySelector(".product-thumb .product-thumb-image");
  const imageSource = getImageSource(mainImage) || getImageSource(activeThumbImage) || getImageSource(fallbackThumbImage);
  const imageAlt =
    mainImage?.getAttribute("alt") ||
    activeThumbImage?.getAttribute("alt") ||
    productTitle?.textContent.trim() ||
    "Товар";

  if (!mainImage) {
    return { alt: imageAlt, src: imageSource };
  }

  return {
    alt: imageAlt,
    src: imageSource,
  };
};

const formatCounterNumber = (value) => String(value).padStart(2, "0");
const getDefaultCartState = () => ({
  items: [],
  promoCode: "",
  promoRate: 0,
});

const loadCartState = () => {
  try {
    const rawState = localStorage.getItem(CART_STORAGE_KEY);

    if (!rawState) {
      return getDefaultCartState();
    }

    const parsedState = JSON.parse(rawState);

    return {
      items: Array.isArray(parsedState.items) ? parsedState.items : [],
      promoCode: typeof parsedState.promoCode === "string" ? parsedState.promoCode : "",
      promoRate: Number.isFinite(parsedState.promoRate) ? parsedState.promoRate : 0,
    };
  } catch (error) {
    return getDefaultCartState();
  }
};

const persistCartState = (state) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Keep product page usable even when storage is blocked.
  }
};

const getDistinctCartCount = (state) => state.items.filter((item) => Number(item.qty) > 0).length;

const syncCartCount = () => {
  if (!cartCount) {
    return;
  }

  const state = loadCartState();
  cartCount.textContent = String(getDistinctCartCount(state));
};

const updateAddButtonFeedback = (label) => {
  const buttonLabel = orderTrigger?.querySelector("span");

  if (!buttonLabel) {
    return;
  }

  buttonLabel.textContent = label;
};

const addCurrentProductToCart = () => {
  if (!currentProductId) {
    return;
  }

  const state = loadCartState();
  const nextQty = Number(qtyValue?.textContent.trim() || "1") || 1;
  const existingItem = state.items.find((item) => item.id === currentProductId);

  if (existingItem) {
    existingItem.qty = Math.max(0, Number(existingItem.qty) || 0) + nextQty;
  } else {
    state.items.push({
      id: currentProductId,
      qty: nextQty,
    });
  }

  persistCartState(state);
  syncCartCount();
  updateAddButtonFeedback("ДОБАВЛЕНО");

  window.setTimeout(() => {
    updateAddButtonFeedback(initialAddButtonLabel);
  }, 1400);
};

const updateStageCounter = (button) => {
  if (!stageCounter || thumbButtons.length === 0) {
    return;
  }

  const activeIndex = button
    ? thumbButtons.indexOf(button)
    : thumbButtons.findIndex((thumb) => thumb.classList.contains("is-active"));
  const currentValue = activeIndex >= 0 ? activeIndex + 1 : 1;
  const totalValue = thumbButtons.length;

  stageCounter.innerHTML = `${formatCounterNumber(currentValue)} <span>/</span> ${formatCounterNumber(totalValue)}`;
};

const activateThumb = (button) => {
  const nextView = button.dataset.mainView || "view-front";
  if (!mainImage) {
    return;
  }

  const nextImage =
    button.dataset.imageSrc ||
    button.querySelector(".product-thumb-image")?.getAttribute("src") ||
    "";
  const nextAlt =
    button.dataset.imageAlt ||
    button.querySelector(".product-thumb-image")?.getAttribute("alt") ||
    productTitle?.textContent.trim() ||
    "Товар";

  thumbButtons.forEach((thumb) => thumb.classList.remove("is-active"));
  button.classList.add("is-active");
  if (nextImage) {
    mainImage.src = nextImage;
  }
  mainImage.alt = nextAlt;
  mainImage.className = `product-main-image ${nextView}`;
  button.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
  updateStageCounter(button);
};

thumbButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateThumb(button);
  });
});

if (moreButton && thumbButtons.length > 1 && !moreButton.hidden) {
  moreButton.addEventListener("click", () => {
    const currentIndex = thumbButtons.findIndex((thumb) => thumb.classList.contains("is-active"));
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % thumbButtons.length : 0;
    activateThumb(thumbButtons[nextIndex]);
  });
}

updateStageCounter();

if (qtyValue && qtyButtons.length === 2) {
  qtyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentValue = Number(qtyValue.textContent) || 1;
      const nextValue = button.textContent.trim() === "+" ? currentValue + 1 : Math.max(1, currentValue - 1);
      qtyValue.textContent = String(nextValue);
    });
  });
}

const formatPhoneValue = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  let normalizedDigits = digits;

  if (normalizedDigits.startsWith("80")) {
    normalizedDigits = `375${normalizedDigits.slice(2)}`;
  } else if (normalizedDigits.startsWith("0")) {
    normalizedDigits = `375${normalizedDigits.slice(1)}`;
  } else if (!normalizedDigits.startsWith("375")) {
    normalizedDigits = `375${normalizedDigits.slice(0, 9)}`;
  }

  normalizedDigits = normalizedDigits.slice(0, 12);

  const countryCode = normalizedDigits.slice(0, 3);
  const operatorCode = normalizedDigits.slice(3, 5);
  const firstPart = normalizedDigits.slice(5, 8);
  const secondPart = normalizedDigits.slice(8, 10);
  const thirdPart = normalizedDigits.slice(10, 12);

  let formattedValue = `+${countryCode}`;

  if (operatorCode) {
    formattedValue += ` (${operatorCode}`;
  }

  if (normalizedDigits.length >= 5) {
    formattedValue += ")";
  }

  if (firstPart) {
    formattedValue += ` ${firstPart}`;
  }

  if (secondPart) {
    formattedValue += `-${secondPart}`;
  }

  if (thirdPart) {
    formattedValue += `-${thirdPart}`;
  }

  return normalizedDigits.length > 0 ? formattedValue : "";
};

const createOrderModal = () => {
  if (!document.body || !productTitle || !productPrice) {
    return null;
  }

  const initialProductImage = getCurrentProductImage();
  const modalRoot = document.createElement("div");
  modalRoot.className = "order-modal";
  modalRoot.hidden = true;
  modalRoot.innerHTML = `
    <section class="order-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="orderModalTitle">
      <button class="order-modal-close" type="button" aria-label="Закрыть окно" data-order-close>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5l14 14"></path>
          <path d="M19 5 5 19"></path>
        </svg>
      </button>

      <div class="order-modal-shell">
        <a class="order-modal-brand" href="./index.html">YOLOOK</a>
        <div class="hero-accent order-modal-accent" aria-hidden="true">
          <span class="accent-line accent-line-blue"></span>
          <span class="accent-line accent-line-pink"></span>
        </div>

        <p class="order-modal-product-line">
          <span class="order-modal-product-name">${productTitle.textContent.trim()}</span>
          <span class="order-modal-product-price">${productPrice.textContent.trim()}</span>
        </p>

        <h2 class="order-modal-title" id="orderModalTitle">ОСТАВИТЬ ЗАЯВКУ</h2>
        <p class="order-modal-description">
          Оставьте контакты, и мы свяжемся с вами, чтобы подтвердить заказ и уточнить детали.
        </p>

        <div class="order-modal-selection">
          <span>Количество</span>
          <strong data-order-qty>1</strong>
        </div>

        <div class="order-product-card">
          <div class="order-product-card-media">
            <img
              class="order-product-card-image"
              src="${initialProductImage.src}"
              alt="${initialProductImage.alt}"
              data-order-product-image
            />
          </div>
          <div class="order-product-card-meta">
            <span class="order-product-card-label">Ваш заказ</span>
            <strong class="order-product-card-name">${productTitle.textContent.trim()}</strong>
            <span class="order-product-card-price">${productPrice.textContent.trim()}</span>
          </div>
        </div>

        <form class="order-form" novalidate>
          <div class="order-form-grid">
            <label class="order-field">
              <span class="order-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="7.4" r="3.1"></circle>
                  <path d="M5 19c1.6-3.2 4.1-4.8 7-4.8S17.4 15.8 19 19"></path>
                </svg>
              </span>
              <input class="order-input" type="text" name="name" placeholder="Имя" autocomplete="name" />
            </label>

            <label class="order-field">
              <span class="order-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7.2 4.8h2.7l1.2 4-1.8 1.8a15.7 15.7 0 0 0 4.1 4.1l1.8-1.8 4 1.2v2.7c0 .8-.6 1.5-1.4 1.5-7 0-12.7-5.7-12.7-12.7 0-.8.6-1.5 1.4-1.5Z"></path>
                </svg>
              </span>
              <input
                class="order-input"
                type="tel"
                name="phone"
                inputmode="tel"
                placeholder="+375 (29) 123-45-67"
                autocomplete="tel"
              />
            </label>

            <label class="order-field">
              <span class="order-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="3.6" y="5.6" width="16.8" height="12.8" rx="1.8"></rect>
                  <path d="m5.6 8.2 6.4 5.2 6.4-5.2"></path>
                </svg>
              </span>
              <input class="order-input" type="email" name="email" placeholder="Email" autocomplete="email" />
            </label>

            <label class="order-field order-field-textarea">
              <span class="order-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6 6.4h12a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H10l-4 3v-5.2H6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2Z"></path>
                  <path d="M9 10.2h6"></path>
                  <path d="M9 13.4h4.2"></path>
                </svg>
              </span>
              <textarea
                class="order-input order-textarea"
                name="comment"
                rows="4"
                maxlength="500"
                placeholder="Комментарий"
              ></textarea>
              <span class="order-textarea-counter"><span data-order-counter>0</span>/500</span>
            </label>
          </div>

          <label class="order-consent">
            <input class="order-consent-input" type="checkbox" name="consent" />
            <span class="order-consent-box" aria-hidden="true"></span>
            <span class="order-consent-text">Я согласен(а) на обработку персональных данных</span>
          </label>

          <p class="order-form-status" data-order-status aria-live="polite"></p>

          <div class="order-form-actions">
            <button class="order-submit-button" type="submit">
              <span>ОТПРАВИТЬ ЗАЯВКУ</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16"></path>
                <path d="m13 5 7 7-7 7"></path>
              </svg>
            </button>
            <button class="order-cancel-button" type="button" data-order-close>Назад к товару</button>
          </div>
        </form>

        <div class="order-success" hidden>
          <div class="order-success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="m8.6 12.4 2.3 2.4 4.8-5.2"></path>
            </svg>
          </div>
          <h3 class="order-success-title">Заявка отправлена</h3>
          <p class="order-success-text">
            Мы получили ваш запрос по модели ${productTitle.textContent.trim()} и скоро свяжемся с вами.
          </p>
          <button class="order-success-button" type="button" data-order-close>Вернуться к товару</button>
        </div>
      </div>
    </section>
  `;

  document.body.append(modalRoot);

  const form = modalRoot.querySelector(".order-form");
  const status = modalRoot.querySelector("[data-order-status]");
  const successBlock = modalRoot.querySelector(".order-success");
  const qtyLabel = modalRoot.querySelector("[data-order-qty]");
  const orderProductImage = modalRoot.querySelector("[data-order-product-image]");
  const commentInput = modalRoot.querySelector('textarea[name="comment"]');
  const counter = modalRoot.querySelector("[data-order-counter]");
  const phoneInput = modalRoot.querySelector('input[name="phone"]');
  const nameInput = modalRoot.querySelector('input[name="name"]');
  const emailInput = modalRoot.querySelector('input[name="email"]');
  const consentInput = modalRoot.querySelector('input[name="consent"]');
  const formFields = [nameInput, phoneInput, emailInput, commentInput];

  let lastFocusedElement = null;

  const clearStatus = () => {
    status.textContent = "";
    status.classList.remove("is-error");
  };

  const markFieldState = (field, isInvalid) => {
    const fieldWrapper = field.closest(".order-field");
    if (!fieldWrapper) {
      return;
    }

    fieldWrapper.classList.toggle("is-invalid", isInvalid);
  };

  const resetValidationState = () => {
    formFields.forEach((field) => markFieldState(field, false));
    clearStatus();
  };

  const updateCounter = () => {
    if (!counter || !commentInput) {
      return;
    }

    counter.textContent = String(commentInput.value.length);
  };

  const updateQty = () => {
    if (!qtyLabel || !qtyValue) {
      return;
    }

    qtyLabel.textContent = qtyValue.textContent.trim() || "1";
  };

  const updateProductImage = () => {
    if (!orderProductImage) {
      return;
    }

    const { alt, src } = getCurrentProductImage();
    orderProductImage.src = src;
    orderProductImage.alt = alt;
  };

  const resetModal = () => {
    form.reset();
    successBlock.hidden = true;
    form.hidden = false;
    updateCounter();
    resetValidationState();
    updateQty();
    updateProductImage();
  };

  const openModal = () => {
    lastFocusedElement = document.activeElement;
    resetModal();
    modalRoot.hidden = false;
    document.body.classList.add("body-modal-open");
    nameInput.focus();
  };

  const closeModal = () => {
    modalRoot.hidden = true;
    document.body.classList.remove("body-modal-open");

    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  };

  commentInput.addEventListener("input", updateCounter);

  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhoneValue(phoneInput.value);
  });

  formFields.forEach((field) => {
    field.addEventListener("input", () => {
      markFieldState(field, false);
      clearStatus();
    });
  });

  consentInput.addEventListener("change", clearStatus);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    resetValidationState();

    const trimmedName = nameInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, "");
    const hasPhone = phoneDigits.length === 12 && phoneDigits.startsWith("375");

    if (!trimmedName || !hasPhone || !consentInput.checked) {
      markFieldState(nameInput, !trimmedName);
      markFieldState(phoneInput, !hasPhone);
      status.textContent = "Заполните имя, телефон и подтвердите согласие на обработку данных.";
      status.classList.add("is-error");
      return;
    }

    form.hidden = true;
    successBlock.hidden = false;
  });

  modalRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("[data-order-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalRoot.hidden) {
      closeModal();
    }
  });

  return {
    openModal,
    updateQty,
  };
};

const orderModal = createOrderModal();

if (orderTrigger && orderModal) {
  orderTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    addCurrentProductToCart();
  });
}

syncCartCount();
updateStageCounter();
