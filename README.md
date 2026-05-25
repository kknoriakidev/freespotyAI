# Spotifree

Свой музыкальный плеер в стиле Spotify: тёмная тема, боковая панель, нижний плеер, поддержка
GIF-обложек, форма для загрузки собственных треков. Веб-версия + сборка в `.exe` через Electron.

## Стек
- **Backend:** Node.js + Express + Multer (загрузка файлов, JSON-БД)
- **Frontend:** чистый HTML/CSS/JS (без сборщиков), кастомные стили под Spotify
- **Desktop:** Electron + electron-builder (NSIS installer для Windows)

## Структура
```
spotifree/
├── server/
│   ├── index.js         # Express-сервер: API + статика
│   ├── db.json          # Хранилище метаданных треков
│   └── uploads/         # Загруженные аудио и обложки
├── public/
│   ├── index.html       # Главная страница плеера
│   ├── css/style.css    # Тёмная тема в стиле Spotify
│   └── js/app.js        # Логика плеера и формы загрузки
├── main.js              # Electron entrypoint
└── package.json
```

## Запуск (веб)
```bash
npm install
npm start
# http://localhost:3000
```

## Запуск (десктоп)
```bash
npm install
npm run dev          # сервер + Electron одновременно
```
или вручную:
```bash
npm start            # в одном терминале
npm run electron     # в другом
```

## Сборка `.exe`
```bash
npm run build:win
```
Готовый установщик будет в `dist/Spotifree-Setup-*.exe`.

## API
| Метод  | Путь                | Описание                          |
|--------|---------------------|-----------------------------------|
| GET    | `/api/health`       | Проверка сервера                  |
| GET    | `/api/tracks`       | Список треков (по дате)           |
| GET    | `/api/tracks/:id`   | Один трек                         |
| POST   | `/api/upload`       | Загрузка трека (multipart: `audio`, `cover`, `title`, `artist`, `album`) |
| DELETE | `/api/tracks/:id`   | Удалить трек и файлы              |

## Форматы
- **Аудио:** `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac` (до 100 МБ)
- **Обложки:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` — GIF проигрывается как анимация

## Горячие клавиши
- `Space` — play/pause
- `Shift + ←` / `Shift + →` — предыдущий / следующий трек
- `Esc` — закрыть модалку
