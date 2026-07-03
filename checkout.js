const CART_STORAGE_KEY = "yolook-cart-v2";
const TELEGRAM_ENDPOINT_FALLBACK = "./telegram-order.php";
const EXPRESS_PAY_CREATE_ENDPOINT = "./api/payments/express-pay/create/";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const itemsRoot = document.querySelector("[data-checkout-items]");
const emptyState = document.querySelector("[data-checkout-empty]");
const form = document.querySelector("[data-checkout-form]");
const successBlock = document.querySelector("[data-checkout-success]");
const totalQtyLabel = document.querySelector("[data-checkout-total-qty]");
const totalPriceLabel = document.querySelector("[data-checkout-total-price]");
const counter = document.querySelector("[data-order-counter]");
const commentInput = document.querySelector('textarea[name="comment"]');
const phoneInput = document.querySelector('input[name="phone"]');
const nameInput = document.querySelector('input[name="name"]');
const emailInput = document.querySelector('input[name="email"]');
const pickupPointInput = document.querySelector('input[name="pickup_point"]');
const regionInput = document.querySelector('input[name="region"]');
const cityInput = document.querySelector('input[name="city"]');
const streetInput = document.querySelector('input[name="street"]');
const houseInput = document.querySelector('input[name="house"]');
const apartmentInput = document.querySelector('input[name="apartment"]');
const postalCodeInput = document.querySelector('input[name="postal_code"]');
const consentInput = document.querySelector('input[name="consent"]');
const deliveryInputs = Array.from(document.querySelectorAll('input[name="delivery_method"]'));
const deliveryMethodGroup = document.querySelector("[data-delivery-method-group]");
const belpostFields = document.querySelector("[data-belpost-fields]");
const europostFields = document.querySelector("[data-europost-fields]");
const deliveryDetailsText = document.querySelector("[data-delivery-details-text]");
const paymentInputs = Array.from(document.querySelectorAll('input[name="payment_method"]'));
const paymentMethodGroup = document.querySelector("[data-payment-method-group]");
const deliveryPolicyValue = document.querySelector("[data-delivery-policy-value]");
const status = document.querySelector("[data-order-status]");
const submitButton = form?.querySelector(".order-submit-button");
const submitButtonLabel = submitButton?.querySelector("span");
const defaultSubmitLabel = submitButtonLabel?.textContent?.trim() || "ПЕРЕЙТИ К ОПЛАТЕ";
const formFields = [
  nameInput,
  phoneInput,
  emailInput,
  pickupPointInput,
  regionInput,
  cityInput,
  streetInput,
  houseInput,
  apartmentInput,
  postalCodeInput,
  commentInput,
];
const POSTAL_CODE_PATTERN = /^\d{6}$/;
const COD_PREPAYMENT_AMOUNT = 10;
const DELIVERY_METHODS = {
  belpost: {
    label: "Белпочта",
    detailsText: "Для Белпочты укажите полный почтовый адрес получателя.",
    deliveryLabel: "Белпочта, 1-3 дня, по тарифам почты",
  },
  europost: {
    label: "Европочта",
    detailsText: "Для Европочты укажите номер отделения, где получатель будет забирать посылку.",
    deliveryLabel: "Европочта, 1-3 дня, по тарифам почты",
  },
};
const PAYMENT_METHODS = {
  online: {
    label: "Онлайн-оплата Express Pay",
    note: "К оплате вся сумма заказа",
    shippingIsFree: false,
    shippingFee: 0,
  },
  cod: {
    label: "Наложенный платеж",
    note: "Сейчас оплачивается только предоплата 10 BYN",
    shippingIsFree: false,
    shippingFee: 0,
  },
};

const cartState = loadCartState();
const visibleItems = cartState.items
  .filter((item) => item.qty > 0)
  .map((item) => {
    const product = CART_PRODUCTS[item.id];
    return product ? { ...product, qty: item.qty } : null;
  })
  .filter(Boolean);
const pricing = getPricingSummary(visibleItems, cartState.promoRate);

renderCheckoutItems();
updateCounter();
updateDeliveryPolicy();
updateDeliveryFields();

commentInput?.addEventListener("input", updateCounter);

phoneInput?.addEventListener("input", () => {
  phoneInput.value = sanitizePhoneInputValue(phoneInput.value);
});

postalCodeInput?.addEventListener("input", () => {
  postalCodeInput.value = postalCodeInput.value.replace(/\D/g, "").slice(0, 6);
});

formFields.forEach((field) => {
  field?.addEventListener("input", () => {
    markFieldState(field, false);
    clearStatus();
  });
});

consentInput?.addEventListener("change", clearStatus);

deliveryInputs.forEach((input) => {
  input.addEventListener("change", () => {
    markDeliveryMethodState(false);
    updateDeliveryFields();
    updateDeliveryPolicy();
    clearStatus();
  });
});

paymentInputs.forEach((input) => {
  input.addEventListener("change", () => {
    markPaymentMethodState(false);
    clearStatus();
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetValidationState();

  const trimmedName = nameInput?.value.trim() || "";
  const trimmedPhone = phoneInput?.value.trim() || "";
  const normalizedPhone = normalizePhoneValue(trimmedPhone);
  const trimmedEmail = emailInput?.value.trim() || "";
  const trimmedPickupPoint = pickupPointInput?.value.trim() || "";
  const trimmedRegion = regionInput?.value.trim() || "";
  const trimmedCity = cityInput?.value.trim() || "";
  const trimmedStreet = streetInput?.value.trim() || "";
  const trimmedHouse = houseInput?.value.trim() || "";
  const trimmedPostalCode = postalCodeInput?.value.trim() || "";
  const selectedDeliveryMethod = getSelectedDeliveryMethod();
  const requiresBelpostAddress = selectedDeliveryMethod === "belpost";
  const requiresEuropostPickupPoint = selectedDeliveryMethod === "europost";
  const hasPhone = normalizedPhone.length === 12 && normalizedPhone.startsWith("375");
  const hasValidEmail = !trimmedEmail || EMAIL_PATTERN.test(trimmedEmail);
  const hasValidPostalCode = POSTAL_CODE_PATTERN.test(trimmedPostalCode);
  const selectedPaymentMethod = getSelectedPaymentMethod();

  if (visibleItems.length === 0) {
    showError("Корзина пуста. Добавьте товары перед оформлением заказа.");
    return;
  }

  if (
    !trimmedName ||
    !hasPhone ||
    !selectedDeliveryMethod ||
    (requiresBelpostAddress &&
      (!trimmedRegion || !trimmedCity || !trimmedStreet || !trimmedHouse || !hasValidPostalCode)) ||
    (requiresEuropostPickupPoint && !trimmedPickupPoint) ||
    !consentInput?.checked ||
    !hasValidEmail ||
    !selectedPaymentMethod
  ) {
    markFieldState(nameInput, !trimmedName);
    markFieldState(phoneInput, !hasPhone);
    markFieldState(emailInput, Boolean(trimmedEmail) && !hasValidEmail);
    markDeliveryMethodState(!selectedDeliveryMethod);
    markFieldState(regionInput, requiresBelpostAddress && !trimmedRegion);
    markFieldState(cityInput, requiresBelpostAddress && !trimmedCity);
    markFieldState(streetInput, requiresBelpostAddress && !trimmedStreet);
    markFieldState(houseInput, requiresBelpostAddress && !trimmedHouse);
    markFieldState(postalCodeInput, requiresBelpostAddress && !hasValidPostalCode);
    markFieldState(pickupPointInput, requiresEuropostPickupPoint && !trimmedPickupPoint);
    markPaymentMethodState(!selectedPaymentMethod);
    showError("Заполните фамилию, имя и отчество, телефон, выберите доставку, укажите нужные данные для отправки, проверьте email и подтвердите согласие на обработку данных.");
    return;
  }

  const orderPayload = buildOrderPayload();
  await handleExpressPayCheckout(orderPayload);
});

function renderCheckoutItems() {
  if (!itemsRoot || !emptyState || !form || !successBlock || !totalQtyLabel || !totalPriceLabel) {
    return;
  }

  const orderSummary = getOrderSummary();

  itemsRoot.innerHTML = visibleItems.map((item) => createCheckoutItemMarkup(item)).join("");
  totalQtyLabel.textContent = String(pricing.totalQty);
  totalPriceLabel.textContent = formatPrice(orderSummary.total);

  const hasItems = visibleItems.length > 0;
  emptyState.hidden = hasItems;
  form.hidden = !hasItems;
  successBlock.hidden = true;
}

function createCheckoutItemMarkup(item) {
  return `
    <article class="order-product-card checkout-product-card">
      <div class="order-product-card-media">
        <img
          class="order-product-card-image ${item.imageClass}"
          src="${item.image}"
          alt="${item.name}"
        />
      </div>
      <div class="order-product-card-meta">
        <span class="order-product-card-label">Позиция в заказе</span>
        <strong class="order-product-card-name">${item.name}</strong>
        <span class="order-product-card-price">Количество: ${item.qty}</span>
        <span class="order-product-card-price">${formatPrice(item.qty * item.unitPrice)}</span>
      </div>
    </article>
  `;
}

function buildOrderPayload() {
  const selectedPaymentMethod = getSelectedPaymentMethod();
  const selectedDeliveryMethod = getSelectedDeliveryMethod();
  const paymentConfig = selectedPaymentMethod ? PAYMENT_METHODS[selectedPaymentMethod] : null;
  const deliveryConfig = selectedDeliveryMethod ? DELIVERY_METHODS[selectedDeliveryMethod] : null;
  const orderSummary = getOrderSummary();
  const normalizedPhone = normalizePhoneValue(phoneInput?.value || "");
  const normalizedPostalCode = (postalCodeInput?.value || "").replace(/\D/g, "").slice(0, 6);
  const paymentAmounts = getPaymentAmounts(selectedPaymentMethod);

  return {
    customer: {
      name: nameInput?.value.trim() || "",
      phone: normalizedPhone,
      email: emailInput?.value.trim() || "",
      address: {
        deliveryMethod: selectedDeliveryMethod || "",
        pickupPoint: pickupPointInput?.value.trim() || "",
        region: regionInput?.value.trim() || "",
        city: cityInput?.value.trim() || "",
        street: streetInput?.value.trim() || "",
        house: houseInput?.value.trim() || "",
        apartment: apartmentInput?.value.trim() || "",
        postalCode: normalizedPostalCode,
      },
      comment: commentInput?.value.trim() || "",
      consent: Boolean(consentInput?.checked),
    },
    order: {
      items: visibleItems.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        linePrice: item.qty * item.unitPrice,
        url: item.url,
      })),
      promoCode: cartState.promoCode || "",
      promoRate: cartState.promoRate || 0,
      totalQty: pricing.totalQty,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      itemsTotal: pricing.total,
      shippingFee: orderSummary.shippingFee,
      total: orderSummary.total,
      paymentAmount: paymentAmounts.paymentAmount,
      outstandingAmount: paymentAmounts.outstandingAmount,
      currency: "BYN",
      paymentMethod: selectedPaymentMethod || "",
      paymentLabel: paymentConfig?.label || "",
      paymentNote: paymentConfig?.note || "",
      deliveryMethod: selectedDeliveryMethod || "",
      deliveryLabel: deliveryConfig?.deliveryLabel || "",
      shippingIsFree: Boolean(paymentConfig?.shippingIsFree),
    },
    meta: {
      source: "checkout-page",
      submittedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    },
  };
}

function getPricingSummary(items, promoRate) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const discountAmount = Math.round(subtotal * (promoRate || 0));
  const total = Math.max(0, subtotal - discountAmount);
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    subtotal,
    discountAmount,
    total,
    totalQty,
  };
}

function getOrderSummary() {
  return {
    shippingFee: 0,
    total: pricing.total,
  };
}

function getPaymentAmounts(selectedPaymentMethod) {
  const total = getOrderSummary().total;

  if (selectedPaymentMethod === "cod") {
    const paymentAmount = Math.min(total, COD_PREPAYMENT_AMOUNT);
    return {
      paymentAmount,
      outstandingAmount: Math.max(0, total - paymentAmount),
    };
  }

  return {
    paymentAmount: total,
    outstandingAmount: 0,
  };
}

async function handleExpressPayCheckout(orderPayload) {
  setSubmittingState(true);
  const statusMessage =
    orderPayload?.order?.paymentMethod === "cod"
      ? "Создаем счет на предоплату..."
      : "Создаем счет Express Pay...";
  showNeutralStatus(statusMessage);

  try {
    const response = await fetch(EXPRESS_PAY_CREATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    let responseData = null;

    try {
      responseData = await response.json();
    } catch (error) {
      responseData = null;
    }

    if (!response.ok || !responseData?.ok) {
      throw new Error(responseData?.message || "Не удалось создать счет Express Pay.");
    }

    if (responseData.orderNumber) {
      try {
        localStorage.setItem(
          "yolook-last-order",
          JSON.stringify({
            orderNumber: responseData.orderNumber,
            provider: "express_pay",
            createdAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Ignore storage issues before redirect.
      }
    }

    if (!responseData.invoiceUrl) {
      throw new Error("Express Pay не вернул ссылку на оплату.");
    }

    window.location.assign(responseData.invoiceUrl);
  } catch (error) {
    showError(getSubmitErrorMessage(error));
  } finally {
    setSubmittingState(false);
  }
}

async function submitTelegramOrder(orderPayload) {
  setSubmittingState(true);
  showNeutralStatus("Отправляем заявку в Telegram...");

  try {
    const response = await fetch(form.getAttribute("action") || TELEGRAM_ENDPOINT_FALLBACK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    let responseData = null;

    try {
      responseData = await response.json();
    } catch (error) {
      responseData = null;
    }

    if (!response.ok || !responseData?.ok) {
      throw new Error(
        responseData?.message || "Не удалось отправить заявку. Проверьте настройки PHP и Telegram."
      );
    }

    clearCartState();
    clearStatus();
    form.hidden = true;
    successBlock.hidden = false;
  } catch (error) {
    showError(getSubmitErrorMessage(error));
  } finally {
    setSubmittingState(false);
  }
}

function getSelectedPaymentMethod() {
  const checkedInput = paymentInputs.find((input) => input.checked);
  const selectedValue = checkedInput?.value || "online";
  return PAYMENT_METHODS[selectedValue] ? selectedValue : "";
}

function getSelectedDeliveryMethod() {
  const checkedInput = deliveryInputs.find((input) => input.checked);
  const selectedValue = checkedInput?.value || "";
  return DELIVERY_METHODS[selectedValue] ? selectedValue : "";
}

function updateDeliveryFields() {
  const selectedDeliveryMethod = getSelectedDeliveryMethod();
  const isBelpost = selectedDeliveryMethod === "belpost";
  const isEuropost = selectedDeliveryMethod === "europost";

  if (belpostFields) {
    belpostFields.hidden = !isBelpost;
  }

  if (europostFields) {
    europostFields.hidden = !isEuropost;
  }

  if (deliveryDetailsText) {
    if (!selectedDeliveryMethod) {
      deliveryDetailsText.textContent = "Сначала выберите способ доставки, и ниже появятся нужные поля.";
    } else {
      deliveryDetailsText.textContent = DELIVERY_METHODS[selectedDeliveryMethod].detailsText;
    }
  }
}

function updateDeliveryPolicy() {
  if (!deliveryPolicyValue) {
    return;
  }

  const selectedDeliveryMethod = getSelectedDeliveryMethod();

  if (!selectedDeliveryMethod) {
    deliveryPolicyValue.textContent = "Выберите способ доставки";
    if (totalPriceLabel) {
      totalPriceLabel.textContent = formatPrice(pricing.total);
    }
    return;
  }

  deliveryPolicyValue.textContent = DELIVERY_METHODS[selectedDeliveryMethod].deliveryLabel;

  if (totalPriceLabel) {
    totalPriceLabel.textContent = formatPrice(getOrderSummary().total);
  }
}

function setSubmittingState(isSubmitting) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isSubmitting;
  submitButton.setAttribute("aria-busy", String(isSubmitting));

  if (submitButtonLabel) {
    submitButtonLabel.textContent = isSubmitting ? "ОТПРАВКА..." : defaultSubmitLabel;
  }
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

function clearCartState() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    // Ignore storage errors after a successful submission.
  }
}

function sanitizePhoneInputValue(value) {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 16);
}

function normalizePhoneValue(value) {
  const sanitizedValue = sanitizePhoneInputValue(value);
  let digits = sanitizedValue.replace(/\D/g, "");

  if (digits.startsWith("80")) {
    digits = `375${digits.slice(2)}`;
  } else if (digits.startsWith("0")) {
    digits = `375${digits.slice(1)}`;
  }

  return digits.slice(0, 12);
}

function markFieldState(field, isInvalid) {
  const fieldWrapper = field?.closest(".order-field");

  if (!fieldWrapper) {
    return;
  }

  fieldWrapper.classList.toggle("is-invalid", isInvalid);
}

function markPaymentMethodState(isInvalid) {
  if (!paymentMethodGroup) {
    return;
  }

  paymentMethodGroup.classList.toggle("is-invalid", isInvalid);
}

function markDeliveryMethodState(isInvalid) {
  if (!deliveryMethodGroup) {
    return;
  }

  deliveryMethodGroup.classList.toggle("is-invalid", isInvalid);
}

function resetValidationState() {
  formFields.forEach((field) => markFieldState(field, false));
  markDeliveryMethodState(false);
  markPaymentMethodState(false);
  clearStatus();
}

function clearStatus() {
  if (!status) {
    return;
  }

  status.textContent = "";
  status.classList.remove("is-error");
}

function showError(message) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.add("is-error");
}

function showNeutralStatus(message) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove("is-error");
}

function getSubmitErrorMessage(error) {
  if (window.location.protocol === "file:") {
    return "Локально PHP не выполняется. Загрузите сайт на хостинг с поддержкой PHP и повторите отправку.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Не удалось отправить заявку. Попробуйте еще раз чуть позже.";
}

function updateCounter() {
  if (!counter || !commentInput) {
    return;
  }

  counter.textContent = String(commentInput.value.length);
}

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} BYN`;
}
