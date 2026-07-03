(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector("[data-mobile-nav-toggle]");
  const nav = document.querySelector("[data-mobile-nav]");
  const mobileQuery = window.matchMedia("(max-width: 640px)");

  if (!(header instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) {
    return;
  }

  const syncState = (isOpen) => {
    header.classList.toggle("is-nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
  };

  const closeNav = () => {
    syncState(false);
  };

  toggle.addEventListener("click", () => {
    if (!mobileQuery.matches) {
      return;
    }

    syncState(!header.classList.contains("is-nav-open"));
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;

    if (target instanceof Element && target.closest(".nav-link")) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  const handleViewportChange = (event) => {
    if (!event.matches) {
      closeNav();
    }
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleViewportChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(handleViewportChange);
  }

  syncState(false);
})();
