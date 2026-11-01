# Разработка и развёртывание

[На главную](../README.md) · [Правила для участников](../CONTRIBUTING.md) · [Chat Sources Bridge](../services/youtube-websocket/README.md)

## 🛠 Разработка

### Требования

- **Bun `>=1.3.14`**
- Git

### Запуск frontend

```bash
git clone https://github.com/ruinateam/chatyx.git
cd chatyx

bun install --frozen-lockfile
bun run dev
```

Vite dev server будет доступен на:

```text
http://localhost:5173/
```

### Команды проекта

| Команда | Что делает |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | Production frontend build |
| `bun run build:pages` | Build + подготовка GitHub Pages |
| `bun run start` | Vite preview |
| `bun run sources:dev` | Chat Sources Bridge с `--watch` |
| `bun run sources:start` | Запуск bridge |
| `bun run youtube:dev` | Alias для `sources:dev` |
| `bun run youtube:start` | Alias для `sources:start` |
| `bun run lint` | Lint frontend и bridge |
| `bun run typecheck` | TypeScript checks |
| `bun run test` | Bun tests из `tests/` |
| `bun run test:services` | Тесты bridge |
| `bun run check` | Lint + typecheck + тесты приложения и bridge + frontend build |

Перед PR удобно запускать:

```bash
bun run check
```

## 🌐 Frontend environment

Поддерживаются необязательные build-time переменные:

```env
# Backend для функций, которым нужен отдельный API
VITE_API_URL=https://api.example.com

# Переопределение Twitch web GraphQL Client-ID
VITE_TWITCH_GQL_CLIENT_ID=your-client-id

# Версия клиента Twitch для predictions
VITE_TWITCH_CLIENT_VERSION=your-client-version

# Базовый путь сборки Vite (например, для GitHub Pages)
VITE_BASE_PATH=./
```

В production backend используется только если `VITE_API_URL` задан явно.

## 🗂️ Структура проекта

```text
ChatYX/
├── .github/workflows/          # CI / GitHub Pages
├── documents/                  # Design, licensing, references, TTS docs
├── public/                     # Static assets and platform icons
├── scripts/                    # Build/deploy helpers
├── services/
│   └── youtube-websocket/      # YouTube + Kick WebSocket bridge
├── src/
│   ├── components/             # UI components
│   ├── config/                 # Chat config and URL parameters
│   ├── features/               # Application lifecycle and feature models
│   ├── routes/                 # setup, chat, status, predictions...
│   ├── services/
│   │   ├── badges/
│   │   ├── chat/
│   │   ├── diagnostics/
│   │   ├── network/
│   │   └── predictions/
│   ├── styles/
│   ├── types/
│   └── utils/
├── tests/
├── package.json
├── bun.lock
└── vite.config.ts
```

## ✅ CI и деплой

GitHub Actions workflow
[`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
запускается для pull requests, push в `main`/`master` и вручную.

Build job выполняет:

1. `bun install --frozen-lockfile`
2. lint
3. typecheck
4. tests
5. GitHub Pages build
6. Docker build Chat Sources Bridge

Для pull request выполняются проверки без deploy. Для push и ручного запуска
workflow после успешного build публикует `dist/` через GitHub Pages. Проверки CI
не включают `test:services`; полный локальный `bun run check` включает и их.
