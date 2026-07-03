# YOLOOK Admin Setup

## Что уже сделано

- есть веб-админка: `/admin.html`
- она редактирует:
  - `catalog-data.js`
  - `data/homepage-content.json`
- сохранение идёт через GitHub API
- деплой на хостинг идёт через GitHub Actions по FTP

## Важно про GitHub

Для админки нужен **GitHub Personal Access Token**, а не пароль от GitHub.

Лучше создать **Fine-grained token** с доступом только к нужному репозиторию и правом:

- `Contents: Read and write`

## Что нужно настроить в GitHub

### 1. Загрузить проект в репозиторий

Нужен обычный репозиторий с этим сайтом.

### 2. Добавить FTP secrets

В репозитории открой:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Создай такие секреты:

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT`
- `FTP_PROTOCOL`
- `FTP_SERVER_DIR`

Пример:

- `FTP_PROTOCOL` = `ftps`
- `FTP_PORT` = `21` или `990` в зависимости от хостинга
- `FTP_SERVER_DIR` = `/public_html/`

### 3. Проверить workflow

Файл уже добавлен:

`/.github/workflows/deploy-ftp.yml`

Он запускается:

- автоматически при push в `main`
- вручную из вкладки `Actions`

## Как пользоваться админкой

Открой:

`/admin.html`

Заполни:

- owner
- repo
- branch
- GitHub token

После этого можно:

- менять товары каталога
- менять тексты и фото слайдера
- загружать новые изображения прямо в GitHub
- нажимать `Сохранить в GitHub`

Если workflow настроен, после коммита GitHub сам отправит изменения на FTP-хостинг.

## Что редактируется через админку

### Слайдер

- заголовок
- путь к изображению

### Каталог

- ID товара
- название
- категория (`Новинки` / `Под заказ`)
- цена
- бейдж
- основное фото
- галерея
- короткий текст
- полное описание

## Как загружать картинки

В блоке `Загрузка изображений в GitHub`:

1. укажи путь, например:
   - `assets/slider/new-slide.jpg`
   - `assets/catalog/custom/new-model/front.jpg`
2. выбери файл
3. нажми `Сохранить в GitHub`

Потом этот же путь можно использовать в полях товара или слайда.
