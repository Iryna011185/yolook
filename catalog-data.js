(() => {
  const createProductUrl = (id) => `./product.html?product=${encodeURIComponent(id)}`;

  const categories = {
  "new": {
    "key": "new",
    "label": "НОВИНКИ",
    "title": "Новинки"
  },
  "all": {
    "key": "all",
    "label": "ВСЕ",
    "title": "Все"
  },
  "order": {
    "key": "order",
    "label": "ПОД ЗАКАЗ",
    "title": "Под заказ"
  },
  "favorites": {
    "key": "favorites",
    "label": "ИЗБРАННОЕ",
    "title": "Избранное"
  }
};

  const baseProducts = {
  "taupe-baguette": {
    "id": "taupe-baguette",
    "name": "TAUPE BAGUETTE",
    "category": "new",
    "badge": "НОВИНКА",
    "unitPrice": 70,
    "image": "./assets/catalog/custom/taupe-baguette/front.jpg",
    "images": [
      "./assets/catalog/custom/taupe-baguette/front.jpg",
      "./assets/catalog/custom/taupe-baguette/look.jpg",
      "./assets/catalog/custom/taupe-baguette/in-hand.jpg",
      "./assets/catalog/custom/taupe-baguette/inside.jpg",
      "./assets/catalog/custom/taupe-baguette/top-detail.jpg",
      "./assets/catalog/custom/taupe-baguette/side-detail.jpg",
      "./assets/catalog/custom/taupe-baguette/strap-detail.jpg",
      "assets/admin-uploads/products/taupe-baguette/снимок-экрана-2026-07-04-в-15-21-24-1783177723473.png"
    ],
    "subtitle": "Коричневая кроссбоди-багет для повседневных образов и вечерних выходов.",
    "description": "Коричневая кроссбоди-багет с лаконичным силуэтом, аккуратной фурнитурой и практичным форматом на каждый день.",
    "descriptionHtml": "Коричневая кроссбоди-багет — стильный и практичный аксессуар для повседневных образов и вечерних выходов. Лаконичный силуэт, аккуратная фурнитура и актуальный дизайн подчеркнут ваш вкус. Материал: экокожа, комбинированная с джинсом.<br><br><strong>Характеристики:</strong><br>• форма: багет, плечо/кроссбоди/в руке<br>• материал: экокожа + джинсовая ткань, подкладка<br>• фурнитура: металлическая, серебристые акценты<br>• ремень: регулируемый, съемный; есть короткие ручки<br>• размер: 26×5×8 см"
  },
  "choco-shopper": {
    "id": "choco-shopper",
    "name": "CHOCO SHOPPER",
    "category": "new",
    "badge": "ВЫБОР ДНЯ",
    "unitPrice": 115,
    "image": "./assets/catalog/custom/choco-shopper/front.jpg",
    "images": [
      "./assets/catalog/custom/choco-shopper/front.jpg",
      "./assets/catalog/custom/choco-shopper/open-front.jpg",
      "./assets/catalog/custom/choco-shopper/open-angle.jpg",
      "./assets/catalog/custom/choco-shopper/open-top.jpg",
      "./assets/catalog/custom/choco-shopper/side.jpg",
      "./assets/catalog/custom/choco-shopper/bottom.jpg",
      "./assets/catalog/custom/choco-shopper/lock-detail.jpg"
    ],
    "subtitle": "Шоколадная замшевая сумка-тоут для офиса, города и повседневных образов.",
    "description": "Шоколадная сумка-тоут из мягкой искусственной замши с золотистой фурнитурой и вместительным форматом.",
    "descriptionHtml": "Шоколадная замшевая сумка-тоут/шоппер — стильный и функциональный аксессуар на каждый день. Выполнена из мягкой искусственной замши с аккуратной отделкой и золотистой фурнитурой. Структурный силуэт смотрится элегантно в офисе и в городе, а удобная форма шоппера обеспечивает простор для всего необходимого.<br><br><strong>Характеристики:</strong><br>• форма: тоут/шоппер, в руке/плечо/кроссбоди<br>• материал: искусственная замша + экокожа (ремни и кант), подкладка<br>• фурнитура: металлическая, золотистая, поворотный замок<br>• ремень: регулируемый, съемный; есть верхняя ручка<br>• размер: 30×26×11 см"
  },
  "mini-box": {
    "id": "mini-box",
    "name": "MINI BOX",
    "category": "new",
    "badge": "МИНИ ФОРМАТ",
    "unitPrice": 75,
    "image": "./assets/catalog/custom/mini-box/front.jpg",
    "images": [
      "./assets/catalog/custom/mini-box/front.jpg",
      "./assets/catalog/custom/mini-box/angle.jpg",
      "./assets/catalog/custom/mini-box/flatlay.jpg",
      "./assets/catalog/custom/mini-box/in-hand.jpg",
      "./assets/catalog/custom/mini-box/side-detail.jpg"
    ],
    "subtitle": "Коричневая мини-сумочка из премиальной мягкой экокожи с короткой ручкой.",
    "description": "Компактная мини-сумка с зернистой фактурой, серебристой фурнитурой и съемным регулируемым ремнем.",
    "descriptionHtml": "Коричневая мини-сумочка из премиальной мягкой экокожи — стильный и практичный аксессуар. Зернистая фактура, серебристая фурнитура и акцентный узел на короткой ручке придают модели современный шарм, а поворотный замок добавляет аккуратный акцент.<br><br><strong>Характеристики:</strong><br>• форма: мини-тоут/бокс, плечо/кроссбоди/в руке<br>• материал: мягкая экокожа с зернением, подкладка<br>• фурнитура: металлическая, серебристые акценты, поворотный замок<br>• ремень: регулируемый, съемный; есть верхняя ручка<br>• размер: 23×12×12 см"
  },
  "asym-baguette": {
    "id": "asym-baguette",
    "name": "ASYM BAGUETTE",
    "category": "new",
    "badge": "ХИТ НЕДЕЛИ",
    "unitPrice": 70,
    "image": "./assets/catalog/custom/asym-baguette/front.jpg",
    "images": [
      "./assets/catalog/custom/asym-baguette/front.jpg",
      "./assets/catalog/custom/asym-baguette/chair-1.jpg",
      "./assets/catalog/custom/asym-baguette/chair-2.jpg",
      "./assets/catalog/custom/asym-baguette/model-close.jpg",
      "./assets/catalog/custom/asym-baguette/model-table.jpg",
      "./assets/catalog/custom/asym-baguette/model-back.jpg",
      "./assets/catalog/custom/asym-baguette/model-raised.jpg",
      "./assets/catalog/custom/asym-baguette/open-top.jpg",
      "./assets/catalog/custom/asym-baguette/side.jpg",
      "./assets/catalog/custom/asym-baguette/hardware.jpg"
    ],
    "subtitle": "Коричневая сумка-багет с асимметричным клапаном и золотистой фурнитурой.",
    "description": "Компактная, но вместительная сумка-багет из качественной экокожи с фиксированным плечевым ремнем.",
    "descriptionHtml": "Коричневая сумка-багет из экокожи с асимметричным клапаном и золотистой фурнитурой. Фиксированный плечевой ремень-ручка не регулируется и не снимается. Компактная, но вместительная: поместятся телефон, кошелек и ключи, а подкладка аккуратно защищает содержимое.<br><br><strong>Характеристики:</strong><br>• форма: багет, плечо<br>• материал: качественная экокожа, подкладка<br>• фурнитура: металлическая, золотистые акценты<br>• ремень: фиксированный, не регулируется и несъемный<br>• размер: 30×13×5 см"
  },
  "open-weave-tote": {
    "id": "open-weave-tote",
    "name": "OPEN WEAVE TOTE",
    "category": "order",
    "badge": "ПОД ЗАКАЗ",
    "unitPrice": 70,
    "image": "./assets/catalog/custom/made-to-order/open-weave-tote/cream.jpg",
    "images": [
      "./assets/catalog/custom/made-to-order/open-weave-tote/cream.jpg",
      "./assets/catalog/custom/made-to-order/open-weave-tote/sand.jpg"
    ],
    "subtitle": "Элегантный тоут с плетёной фактурой для города, офиса и выходных. Доступен в пудрово-розовом и молочном оттенке.",
    "description": "Лёгкий и структурный плетёный тоут с длинными ручками, брелоком-сердцем и съёмной косметичкой на молнии для порядка внутри.",
    "descriptionHtml": "Элегантный тоут с плетёной фактурой — лёгкий, держит форму и выглядит премиально. Длинные ручки удобно садятся на плечо, брелок-сердце добавляет романтичный акцент, а в комплекте есть съёмная косметичка на молнии для порядка внутри.<br><br>Два универсальных оттенка — пудрово-розовый и молочный. Модель идеально подойдёт для города, офиса и выходных: внутрь легко поместятся планшет, ежедневник и все повседневные мелочи.<br><br><strong>Особенности:</strong><br>• формат: элегантный повседневный тоут<br>• фактура: плотное плетение, держит форму<br>• ручки: длинные, удобно носить на плече<br>• декор: брелок-сердце<br>• внутри: съёмная косметичка на молнии<br>• оттенки: пудрово-розовый и молочный<br>• доступность: под заказ"
  },
  "anagram-straw-tote": {
    "id": "anagram-straw-tote",
    "name": "ANAGRAM STRAW TOTE",
    "category": "order",
    "badge": "ЛЕТНЯЯ КОЛЛЕКЦИЯ",
    "unitPrice": 115,
    "image": "./assets/catalog/custom/made-to-order/anagram-straw-tote/duo.jpg",
    "images": [
      "./assets/catalog/custom/made-to-order/anagram-straw-tote/duo.jpg"
    ],
    "subtitle": "Летняя соломенная сумка-тоут в стиле boho-chic для пляжа, прогулок и путешествий. Доступна в молочном и карамельном оттенке.",
    "description": "Лаконичная трапециевидная сумка-тоут из натуральной соломы с резным декором на фронте, удобными кожаными ручками и вместительным форматом для стильного лета.",
    "descriptionHtml": "Летняя соломенная сумка-тоут в стиле boho-chic — идеальный выбор для пляжа, прогулок и путешествий.<br><br>Лаконичная трапециевидная форма, плотное плетение из натуральной соломы и изысканный резной декор на передней панели делают эту модель выразительным акцентом летнего образа. Кожаные ручки удобной длины позволяют носить сумку и на плече, и в руке, а вместительный корпус легко поместит все необходимое — от пляжных принадлежностей до городских мелочей.<br><br><strong>Особенности:</strong><br>• формат: летняя сумка-тоут в стиле boho-chic<br>• материал: натуральная солома с плотным плетением<br>• декор: резной логотип на передней панели<br>• ручки: кожаные, удобной длины<br>• оттенки: молочный и карамельный<br>• доступность: под заказ"
  },
  "ring-handle-tote": {
    "id": "ring-handle-tote",
    "name": "RING HANDLE TOTE",
    "category": "order",
    "badge": "2 ОТТЕНКА",
    "unitPrice": 75,
    "image": "./assets/catalog/custom/made-to-order/ring-handle-tote/brown.jpg",
    "images": [
      "./assets/catalog/custom/made-to-order/ring-handle-tote/brown.jpg",
      "./assets/catalog/custom/made-to-order/ring-handle-tote/ivory.jpg"
    ],
    "subtitle": "Плетёная сумка-полумесяц с круглыми ручками — базовый летний аксессуар для города, отпуска и пляжа.",
    "description": "Лёгкая сумка из прочного натурального волокна с круглой ручкой, держит форму и дополнена чёрно-белым платком для графичного акцента.",
    "descriptionHtml": "Плетёная сумка-полумесяц с круглыми ручками — стильный базовый аксессуар для лета. Выполнена из прочного натурального волокна: лёгкая, держит форму и вмещает всё необходимое. Чёрно-белый платок на ручке добавляет графичный акцент и легко перевязывается под ваш образ.<br><br><strong>Особенности:</strong><br>• формат: плетёная сумка-полумесяц<br>• материал: прочное натуральное волокно<br>• ручки: жёсткие, круглые<br>• декор: съёмный чёрно-белый платок<br>• размеры: доступна в трёх размерах<br>• сценарии: для города, отпуска и пляжа<br>• доступность: под заказ"
  },
  "flower-crochet-bag": {
    "id": "flower-crochet-bag",
    "name": "FLOWER CROCHET BAG",
    "category": "order",
    "badge": "HANDMADE LOOK",
    "unitPrice": 70,
    "image": "./assets/catalog/custom/made-to-order/flower-crochet-bag/ivory.jpg",
    "images": [
      "./assets/catalog/custom/made-to-order/flower-crochet-bag/ivory.jpg",
      "./assets/catalog/custom/made-to-order/flower-crochet-bag/taupe.jpg"
    ],
    "subtitle": "Вязаная сумка-шоппер в нежном молочном цвете с яркими цветочными аппликациями и лёгким летним настроением.",
    "description": "Мягкая ажурная crochet-сумка с цветочным декором по всей поверхности, удобной плечевой ручкой и свободной трапециевидной формой.",
    "descriptionHtml": "Вязаная сумка-шоппер в нежном молочном цвете — воплощение летней лёгкости и романтичного настроения. Мягкое ажурное плетение крючком создаёт воздушную текстуру, а объёмные цветочные аппликации по всей поверхности превращают сумку в настоящий арт-объект.<br><br>Разноцветные цветочки — голубые, оранжевые, розовые, зелёные и жёлтые — добавляют яркий акцент и делают образ свежим и игривым. Мягкая плечевая ручка позволяет удобно носить сумку на плече, а свободная форма трапеции вмещает все необходимые вещи.<br><br>Эта сумка идеально подойдёт для прогулок по городу, пикников и пляжного отдыха. Ручная работа, натуральные материалы и цветочный декор — всё, что нужно, чтобы поймать летнее настроение и не отпускать его весь сезон.<br><br><strong>Особенности:</strong><br>• формат: вязаная сумка-шоппер<br>• фактура: мягкое ажурное crochet-плетение<br>• декор: разноцветные цветочные аппликации<br>• ручка: мягкая, плечевая<br>• форма: свободная трапеция<br>• настроение: для города, пикников и пляжного отдыха<br>• доступность: под заказ"
  }
};

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

  const newProductOrder = [
  "taupe-baguette",
  "choco-shopper",
  "mini-box",
  "asym-baguette"
];
  const orderProductOrder = [
  "open-weave-tote",
  "anagram-straw-tote",
  "ring-handle-tote",
  "flower-crochet-bag"
];

  const featuredByCategory = {
    new: newProductOrder,
    all: [...newProductOrder, ...orderProductOrder],
    order: orderProductOrder,
  };

  window.YOLOOK_CATALOG = {
    categories,
    products,
    featuredByCategory,
    defaultCategory: "new",
  };
})();
