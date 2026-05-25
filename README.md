# Spotifree

Музыкальный плеер в стиле Spotify с поддержкой пользовательских треков и GIF-анимаций. Состоит из веб-версии (Node.js + Express + ванильный JS) и десктопной (Electron, собирается в `.exe`).

## Структура проекта

```
.
├── main.js                # Electron-обёртка: запускает сервер и открывает окно
├── package.json           # Скрипты, зависимости и конфиг electron-builder
├── server/
│   ├── index.js           # Express API: загрузка треков, отдача файлов и списка
│   ├── db.json            # Локальная БД треков (создаётся автоматически)
│   └── uploads/           # Загруженные аудио и обложки
└── public/
    ├── index.html         # Каркас интерфейса (sidebar + main + player)
    ├── css/style.css      # Тёмная Spotify-подобная тема
    └── js/app.js          # Логика плеера и формы загрузки
```

## Запуск веб-версии

```bash
npm install
npm start
```

Открой `http://localhost:3000`.

## Запуск Electron

```bash
npm install
npm run electron
```

Electron сам поднимет бекенд (`server/index.js`) и откроет окно с интерфейсом.

## Сборка `.exe`

```bash
npm install
npm run build:win
```

Готовый установщик появится в `dist/` под именем `Spotifree-Setup-1.0.0.exe`. Передай файл друзьям — установка одним кликом.

## Эндпоинты бекенда

| Метод  | URL                | Описание                                                              |
|--------|--------------------|-----------------------------------------------------------------------|
| GET    | `/api/tracks`      | Список треков                                                         |
| POST   | `/api/upload`      | `multipart/form-data`: `title`, `author`, `album`, `track`, `cover`   |
| DELETE | `/api/tracks/:id`  | Удалить трек и его файлы                                              |
| GET    | `/uploads/<file>`  | Статика для аудио и обложек                                           |
| GET    | `/api/health`      | Health-чек                                                            |

## Поддерживаемые форматы

- **Аудио:** `.mp3`, `.wav`, `.ogg`, `.m4a`
- **Обложки:** `.jpg`, `.jpeg`, `.png`, `.gif` (анимированные), `.webp`

## Горячие клавиши

- `Space` — play / pause
- `←` / `→` — предыдущий / следующий трек
- `Esc` — закрыть модальное окно загрузки
