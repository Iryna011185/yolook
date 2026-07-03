(() => {
  const REPO_SETTINGS_KEY = "yolook-admin-repo-settings";
  const HOMEPAGE_CONTENT_PATH = "data/homepage-content.json";
  const CATALOG_FILE_PATH = "catalog-data.js";

  const slidesEditor = document.getElementById("slidesEditor");
  const productsEditor = document.getElementById("productsEditor");
  const assetUploads = document.getElementById("assetUploads");
  const saveAllButton = document.getElementById("saveAllButton");
  const addProductButton = document.getElementById("addProductButton");
  const addUploadRowButton = document.getElementById("addUploadRow");
  const saveRepoSettingsButton = document.getElementById("saveRepoSettings");
  const statusNode = document.getElementById("adminStatus");

  const repoInputs = {
    owner: document.getElementById("githubOwner"),
    repo: document.getElementById("githubRepo"),
    branch: document.getElementById("githubBranch"),
    token: document.getElementById("githubToken"),
  };

  const state = {
    homepageContent: null,
    catalogContent: null,
  };

  const setStatus = (message, type = "") => {
    if (!(statusNode instanceof HTMLElement)) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle("is-error", type === "error");
    statusNode.classList.toggle("is-success", type === "success");
  };

  const encodeGitHubPath = (path) => path.split("/").map(encodeURIComponent).join("/");

  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
  };

  const normalizeCatalogContent = (catalog) => {
    const categories = {
      new: { ...catalog.categories.new },
      all: { ...catalog.categories.all },
      order: { ...catalog.categories.order },
      favorites: { ...catalog.categories.favorites },
    };

    const orderedIds = unique([
      ...(catalog.featuredByCategory.new || []),
      ...(catalog.featuredByCategory.order || []),
      ...Object.keys(catalog.products || {}),
    ]);

    const products = orderedIds
      .map((id) => catalog.products[id])
      .filter(Boolean)
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        badge: product.badge,
        unitPrice: Number(product.unitPrice) || 0,
        image: product.image,
        images: Array.isArray(product.images) ? [...product.images] : [],
        subtitle: product.subtitle || "",
        description: product.description || "",
        descriptionHtml: product.descriptionHtml || "",
      }));

    return {
      categories,
      products,
      defaultCategory: catalog.defaultCategory || "new",
    };
  };

  const loadHomepageContent = async () => {
    const response = await window.fetch(`./${HOMEPAGE_CONTENT_PATH}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${HOMEPAGE_CONTENT_PATH}: ${response.status}`);
    }

    return response.json();
  };

  const restoreRepoSettings = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(REPO_SETTINGS_KEY) || "{}");

      if (repoInputs.owner instanceof HTMLInputElement && typeof saved.owner === "string") {
        repoInputs.owner.value = saved.owner;
      }

      if (repoInputs.repo instanceof HTMLInputElement && typeof saved.repo === "string") {
        repoInputs.repo.value = saved.repo;
      }

      if (repoInputs.branch instanceof HTMLInputElement && typeof saved.branch === "string") {
        repoInputs.branch.value = saved.branch;
      }
    } catch (error) {
      console.error(error);
    }
  };

  const persistRepoSettings = () => {
    const payload = {
      owner: repoInputs.owner?.value.trim() || "",
      repo: repoInputs.repo?.value.trim() || "",
      branch: repoInputs.branch?.value.trim() || "main",
    };

    window.localStorage.setItem(REPO_SETTINGS_KEY, JSON.stringify(payload));
    setStatus("Owner, repo и branch сохранены на этом устройстве.");
  };

  const renderSlides = () => {
    if (!(slidesEditor instanceof HTMLElement) || !state.homepageContent) {
      return;
    }

    slidesEditor.innerHTML = state.homepageContent.heroSlides
      .map(
        (slide, index) => `
          <article class="admin-slide-card" data-slide-editor>
            <div class="admin-slide-index">0${index + 1}</div>
            <div class="admin-slide-fields">
              <label class="admin-field">
                <span class="admin-label">Заголовок</span>
                <input class="admin-input" type="text" data-slide-field="title" value="${escapeHtml(slide.title || "")}" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Путь к изображению</span>
                <input class="admin-input" type="text" data-slide-field="image" value="${escapeHtml(slide.image || "")}" />
              </label>
            </div>
          </article>
        `
      )
      .join("");
  };

  const renderUploadRows = () => {
    if (!(assetUploads instanceof HTMLElement)) {
      return;
    }

    const existingRows = Array.from(assetUploads.querySelectorAll("[data-upload-row]"));

    if (existingRows.length > 0) {
      return;
    }

    addUploadRow();
  };

  const addUploadRow = () => {
    if (!(assetUploads instanceof HTMLElement)) {
      return;
    }

    const row = document.createElement("div");
    row.className = "admin-upload-row";
    row.setAttribute("data-upload-row", "true");
    row.innerHTML = `
      <label class="admin-field">
        <span class="admin-label">Путь в репозитории</span>
        <input class="admin-input" type="text" data-upload-path placeholder="например, assets/slider/new-slide.jpg" />
      </label>
      <label class="admin-field">
        <span class="admin-label">Файл</span>
        <input class="admin-file" type="file" data-upload-file />
      </label>
      <button class="admin-button admin-button-muted" type="button" data-remove-upload>Удалить</button>
    `;

    assetUploads.append(row);
  };

  const productSummaryText = (product) => {
    const categoryText = product.category === "order" ? "Под заказ" : "Новинки";
    return `${categoryText} • ${product.unitPrice} BYN`;
  };

  const renderProducts = () => {
    if (!(productsEditor instanceof HTMLElement) || !state.catalogContent) {
      return;
    }

    productsEditor.innerHTML = state.catalogContent.products
      .map(
        (product, index) => `
          <article class="admin-product-card" data-product-editor>
            <details class="admin-product-details" ${index < 2 ? "open" : ""}>
              <summary class="admin-product-summary">
                <div class="admin-product-summary-text">
                  <strong>${escapeHtml(product.name || "Новый товар")}</strong>
                  <span>${escapeHtml(productSummaryText(product))}</span>
                </div>
                <div class="admin-product-actions">
                  <button class="admin-button admin-button-muted" type="button" data-product-move="up">Выше</button>
                  <button class="admin-button admin-button-muted" type="button" data-product-move="down">Ниже</button>
                  <button class="admin-button admin-button-muted" type="button" data-product-remove>Удалить</button>
                </div>
              </summary>

              <div class="admin-product-body">
                <div class="admin-product-grid">
                  <label class="admin-field">
                    <span class="admin-label">ID товара</span>
                    <input class="admin-input" type="text" data-product-field="id" value="${escapeHtml(product.id || "")}" />
                  </label>
                  <label class="admin-field">
                    <span class="admin-label">Название</span>
                    <input class="admin-input" type="text" data-product-field="name" value="${escapeHtml(product.name || "")}" />
                  </label>
                  <label class="admin-field">
                    <span class="admin-label">Категория</span>
                    <select class="admin-select" data-product-field="category">
                      <option value="new" ${product.category === "new" ? "selected" : ""}>Новинки</option>
                      <option value="order" ${product.category === "order" ? "selected" : ""}>Под заказ</option>
                    </select>
                  </label>
                  <label class="admin-field">
                    <span class="admin-label">Цена</span>
                    <input class="admin-input" type="number" min="0" step="1" data-product-field="unitPrice" value="${escapeHtml(String(product.unitPrice || 0))}" />
                  </label>
                  <label class="admin-field">
                    <span class="admin-label">Бейдж</span>
                    <input class="admin-input" type="text" data-product-field="badge" value="${escapeHtml(product.badge || "")}" />
                  </label>
                  <label class="admin-field">
                    <span class="admin-label">Основное фото</span>
                    <input class="admin-input" type="text" data-product-field="image" value="${escapeHtml(product.image || "")}" />
                  </label>
                </div>

                <label class="admin-field">
                  <span class="admin-label">Галерея (по одному пути на строку)</span>
                  <textarea class="admin-textarea" data-product-field="images">${escapeHtml((product.images || []).join("\n"))}</textarea>
                </label>

                <label class="admin-field">
                  <span class="admin-label">Короткий подзаголовок</span>
                  <textarea class="admin-textarea" data-product-field="subtitle">${escapeHtml(product.subtitle || "")}</textarea>
                </label>

                <label class="admin-field">
                  <span class="admin-label">Короткое описание</span>
                  <textarea class="admin-textarea" data-product-field="description">${escapeHtml(product.description || "")}</textarea>
                </label>

                <label class="admin-field">
                  <span class="admin-label">Полное описание HTML</span>
                  <textarea class="admin-textarea" data-product-field="descriptionHtml">${escapeHtml(product.descriptionHtml || "")}</textarea>
                </label>
              </div>
            </details>
          </article>
        `
      )
      .join("");
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const createEmptyProduct = () => ({
    id: `new-product-${Date.now()}`,
    name: "NEW PRODUCT",
    category: "new",
    badge: "НОВИНКА",
    unitPrice: 0,
    image: "",
    images: [],
    subtitle: "",
    description: "",
    descriptionHtml: "",
  });

  const readSlidesFromForm = () => {
    const slideNodes = Array.from(document.querySelectorAll("[data-slide-editor]"));

    return slideNodes.map((slideNode) => ({
      title: slideNode.querySelector('[data-slide-field="title"]')?.value.trim() || "",
      image: slideNode.querySelector('[data-slide-field="image"]')?.value.trim() || "",
    }));
  };

  const readProductsFromForm = () => {
    const productNodes = Array.from(document.querySelectorAll("[data-product-editor]"));

    return productNodes.map((productNode) => {
      const value = (field) => productNode.querySelector(`[data-product-field="${field}"]`)?.value ?? "";

      return {
        id: value("id").trim(),
        name: value("name").trim(),
        category: value("category").trim() === "order" ? "order" : "new",
        badge: value("badge").trim(),
        unitPrice: Number(value("unitPrice")) || 0,
        image: value("image").trim(),
        images: value("images")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        subtitle: value("subtitle").trim(),
        description: value("description").trim(),
        descriptionHtml: value("descriptionHtml").trim(),
      };
    });
  };

  const validateContent = (slides, products) => {
    if (slides.length === 0) {
      throw new Error("Нужно хотя бы одно описание слайда.");
    }

    slides.forEach((slide, index) => {
      if (!slide.title || !slide.image) {
        throw new Error(`Слайд ${index + 1}: заполните заголовок и путь к изображению.`);
      }
    });

    const ids = products.map((product) => product.id);
    const uniqueIds = new Set(ids);

    if (ids.some((id) => !id)) {
      throw new Error("У всех товаров должен быть заполнен ID.");
    }

    if (uniqueIds.size !== ids.length) {
      throw new Error("ID товаров должны быть уникальными.");
    }

    products.forEach((product) => {
      if (!product.name || !product.image) {
        throw new Error(`Товар ${product.id}: заполните название и основное фото.`);
      }
    });
  };

  const buildCatalogFile = (catalogContent) => {
    const categories = {
      new: catalogContent.categories.new,
      all: catalogContent.categories.all,
      order: catalogContent.categories.order,
      favorites: catalogContent.categories.favorites,
    };

    const baseProducts = Object.fromEntries(
      catalogContent.products.map((product) => [
        product.id,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          badge: product.badge,
          unitPrice: product.unitPrice,
          image: product.image,
          images: product.images,
          subtitle: product.subtitle,
          description: product.description,
          descriptionHtml: product.descriptionHtml,
        },
      ])
    );

    const newProductOrder = catalogContent.products.filter((product) => product.category === "new").map((product) => product.id);
    const orderProductOrder = catalogContent.products.filter((product) => product.category === "order").map((product) => product.id);

    return `(() => {
  const createProductUrl = (id) => \`./product.html?product=\${encodeURIComponent(id)}\`;

  const categories = ${JSON.stringify(categories, null, 2)};

  const baseProducts = ${JSON.stringify(baseProducts, null, 2)};

  const products = Object.fromEntries(
    Object.entries(baseProducts).map(([id, product]) => [
      id,
      {
        ...product,
        categoryLabel: categories[product.category]?.label || "",
        categoryTitle: categories[product.category]?.title || "",
        url: createProductUrl(id),
      },
    ])
  );

  const newProductOrder = ${JSON.stringify(newProductOrder, null, 2)};
  const orderProductOrder = ${JSON.stringify(orderProductOrder, null, 2)};

  const featuredByCategory = {
    new: newProductOrder,
    all: [...newProductOrder, ...orderProductOrder],
    order: orderProductOrder,
  };

  window.YOLOOK_CATALOG = {
    categories,
    products,
    featuredByCategory,
    defaultCategory: ${JSON.stringify(catalogContent.defaultCategory || "new")},
  };
})();
`;
  };

  const getRepoConfig = () => {
    const owner = repoInputs.owner?.value.trim() || "";
    const repo = repoInputs.repo?.value.trim() || "";
    const branch = repoInputs.branch?.value.trim() || "main";
    const token = repoInputs.token?.value.trim() || "";

    if (!owner || !repo || !branch || !token) {
      throw new Error("Заполните owner, repository, branch и GitHub token.");
    }

    return { owner, repo, branch, token };
  };

  const githubRequest = async (url, token, options = {}) => {
    const response = await window.fetch(url, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${errorText}`);
    }

    return response.json();
  };

  const getFileSha = async ({ owner, repo, branch, token, path }) => {
    const response = await githubRequest(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`,
      token
    );

    return response?.sha || "";
  };

  const uint8ArrayToBase64 = (bytes) => {
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  };

  const fileToBase64 = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    return uint8ArrayToBase64(new Uint8Array(arrayBuffer));
  };

  const putFileToGitHub = async ({
    owner,
    repo,
    branch,
    token,
    path,
    contentBase64,
    message,
  }) => {
    const sha = await getFileSha({ owner, repo, branch, token, path });

    await githubRequest(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(path)}`,
      token,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          content: contentBase64,
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
  };

  const uploadQueuedAssets = async (repoConfig) => {
    const uploadRows = Array.from(document.querySelectorAll("[data-upload-row]"));
    const queuedRows = uploadRows.filter((row) => {
      const fileInput = row.querySelector("[data-upload-file]");
      const pathInput = row.querySelector("[data-upload-path]");
      return fileInput instanceof HTMLInputElement && pathInput instanceof HTMLInputElement && fileInput.files?.[0] && pathInput.value.trim();
    });

    for (const row of queuedRows) {
      const fileInput = row.querySelector("[data-upload-file]");
      const pathInput = row.querySelector("[data-upload-path]");

      if (!(fileInput instanceof HTMLInputElement) || !(pathInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
        continue;
      }

      const file = fileInput.files[0];
      const path = pathInput.value.trim();
      const contentBase64 = await fileToBase64(file);

      await putFileToGitHub({
        ...repoConfig,
        path,
        contentBase64,
        message: `Upload asset ${path}`,
      });
    }
  };

  const saveContentToGitHub = async () => {
    try {
      setStatus("Проверяю данные и готовлю коммит...");

      const repoConfig = getRepoConfig();
      const slides = readSlidesFromForm();
      const products = readProductsFromForm();
      validateContent(slides, products);

      const nextHomepageContent = {
        heroSlides: slides,
      };

      const nextCatalogContent = {
        categories: state.catalogContent.categories,
        products,
        defaultCategory: state.catalogContent.defaultCategory || "new",
      };

      await uploadQueuedAssets(repoConfig);
      setStatus("Изображения загружены. Сохраняю слайдер...");

      await putFileToGitHub({
        ...repoConfig,
        path: HOMEPAGE_CONTENT_PATH,
        contentBase64: window.btoa(unescape(encodeURIComponent(JSON.stringify(nextHomepageContent, null, 2) + "\n"))),
        message: "Update homepage slider content",
      });

      setStatus("Слайдер сохранён. Сохраняю каталог...");

      const catalogFileContent = buildCatalogFile(nextCatalogContent);

      await putFileToGitHub({
        ...repoConfig,
        path: CATALOG_FILE_PATH,
        contentBase64: window.btoa(unescape(encodeURIComponent(catalogFileContent))),
        message: "Update catalog content from admin panel",
      });

      state.homepageContent = nextHomepageContent;
      state.catalogContent = nextCatalogContent;

      setStatus("Готово. Изменения отправлены в GitHub. Если настроен workflow, FTP-деплой запустится автоматически.", "success");
      renderProducts();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить изменения.", "error");
    }
  };

  const bindProductControls = () => {
    if (!(productsEditor instanceof HTMLElement)) {
      return;
    }

    productsEditor.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const productCard = target.closest("[data-product-editor]");
      if (!(productCard instanceof HTMLElement)) {
        return;
      }

      const productIndex = Array.from(productsEditor.querySelectorAll("[data-product-editor]")).indexOf(productCard);

      if (productIndex < 0) {
        return;
      }

      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      state.catalogContent.products = readProductsFromForm();

      if (target.matches("[data-product-remove]")) {
        state.catalogContent.products.splice(productIndex, 1);
        renderProducts();
        return;
      }

      const moveDirection = target.getAttribute("data-product-move");
      if (moveDirection === "up" && productIndex > 0) {
        const [product] = state.catalogContent.products.splice(productIndex, 1);
        state.catalogContent.products.splice(productIndex - 1, 0, product);
        renderProducts();
        return;
      }

      if (moveDirection === "down" && productIndex < state.catalogContent.products.length - 1) {
        const [product] = state.catalogContent.products.splice(productIndex, 1);
        state.catalogContent.products.splice(productIndex + 1, 0, product);
        renderProducts();
      }
    });
  };

  const bindUploadControls = () => {
    if (!(assetUploads instanceof HTMLElement)) {
      return;
    }

    assetUploads.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement) || !target.matches("[data-remove-upload]")) {
        return;
      }

      const uploadRow = target.closest("[data-upload-row]");
      if (uploadRow instanceof HTMLElement) {
        uploadRow.remove();
      }

      if (assetUploads.children.length === 0) {
        addUploadRow();
      }
    });
  };

  const init = async () => {
    try {
      restoreRepoSettings();
      state.catalogContent = normalizeCatalogContent(window.YOLOOK_CATALOG);
      state.homepageContent = await loadHomepageContent();
      renderSlides();
      renderProducts();
      renderUploadRows();
      bindProductControls();
      bindUploadControls();
      setStatus("Админка готова. Для сохранения нужен GitHub token с правами записи в repo.");
    } catch (error) {
      console.error(error);
      setStatus("Не удалось подготовить админку. Проверь загрузку catalog-data.js и data/homepage-content.json.", "error");
    }
  };

  addProductButton?.addEventListener("click", () => {
    state.catalogContent.products = readProductsFromForm();
    state.catalogContent.products.push(createEmptyProduct());
    renderProducts();
  });

  addUploadRowButton?.addEventListener("click", addUploadRow);
  saveRepoSettingsButton?.addEventListener("click", persistRepoSettings);
  saveAllButton?.addEventListener("click", saveContentToGitHub);

  init();
})();
