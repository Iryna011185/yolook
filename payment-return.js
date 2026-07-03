(() => {
  const statusNode = document.querySelector("[data-payment-return-status]");
  const messageNode = document.querySelector("[data-payment-return-message]");
  const errorNode = document.querySelector("[data-payment-return-error]");
  const pageUrl = new URL(window.location.href);
  const orderNumber = pageUrl.searchParams.get("order")?.trim() || "";

  if (!statusNode || !messageNode || !orderNumber) {
    return;
  }

  const isSuccessPage = window.location.pathname.includes("/payment/success");
  const endpoint = `../../api/payments/express-pay/status/?order=${encodeURIComponent(orderNumber)}&refresh=1`;

  const updateUi = (orderStatus) => {
    const paymentStatus = String(orderStatus.paymentStatus || "");

    if (paymentStatus === "paid") {
      statusNode.textContent = "Оплата подтверждена";
      messageNode.textContent = `Заказ №${orderStatus.orderNumber} успешно оплачен. Мы уже получили подтверждение и свяжемся с вами, чтобы подтвердить заказ и уточнить отправку.`;

      try {
        localStorage.removeItem("yolook-cart-v2");
      } catch (error) {
        // Ignore localStorage issues on return page.
      }

      return;
    }

    if (paymentStatus === "deposit_paid") {
      statusNode.textContent = "Предоплата подтверждена";
      messageNode.textContent = `По заказу №${orderStatus.orderNumber} мы получили предоплату. Остальная сумма оплачивается при получении, а мы свяжемся с вами для подтверждения отправки.`;
      return;
    }

    if (paymentStatus === "pending" && isSuccessPage) {
      statusNode.textContent = "Ожидаем webhook от Express Pay";
      messageNode.textContent = `Заказ №${orderStatus.orderNumber} создан, но подтверждение оплаты ещё не дошло. Обычно это занимает немного времени. Обновите страницу через несколько секунд.`;
      return;
    }

    if (paymentStatus === "expired") {
      statusNode.textContent = "Счет просрочен";
      messageNode.textContent = `Срок оплаты по заказу №${orderStatus.orderNumber} истёк. Оформите новый счет, если всё ещё хотите завершить покупку.`;
      return;
    }

    if (paymentStatus === "cancelled") {
      statusNode.textContent = "Оплата отменена";
      messageNode.textContent = `Заказ №${orderStatus.orderNumber} не был оплачен. Можно вернуться к оформлению и попробовать ещё раз.`;
      return;
    }

    statusNode.textContent = `Статус: ${paymentStatus || "неизвестно"}`;
    messageNode.textContent = `Заказ №${orderStatus.orderNumber} сохранён. Если статус долго не меняется, напишите нам в Instagram или Telegram.`;
  };

  fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      let payload = null;

      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Не удалось получить статус оплаты.");
      }

      updateUi(payload);
    })
    .catch((error) => {
      if (!errorNode) {
        return;
      }

      errorNode.textContent = error instanceof Error ? error.message : "Не удалось проверить статус оплаты.";
      errorNode.classList.add("is-error");
    });
})();
