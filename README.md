<div align="center">

<img src="./public/img/emote-3x.webp" alt="ChatYX mascot" width="88" />

# ChatYX

**Мультиплатформенный чат-оверлей для OBS: Twitch, YouTube и Kick в одном Browser Source.**

<p>
  <img src="./public/img/platform-twitch.svg" alt="Twitch" height="28" />
  &nbsp;&nbsp;
  <img src="./public/img/platform-youtube.svg" alt="YouTube" height="28" />
  &nbsp;&nbsp;
  <img src="./public/img/platform-kick.svg" alt="Kick" height="28" />
</p>

<p>
  <img alt="SolidJS" src="https://img.shields.io/badge/SolidJS-2C4F7C?style=for-the-badge&logo=solid&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Bun" src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" />
</p>

[Настроить оверлей](https://chat.ruina.team/) · [Диагностика](https://chat.ruina.team/status) · [Документация](#документация)

</div>

## О проекте

**ChatYX** — open-source оверлей чата для стримов. Он объединяет сообщения с
**Twitch**, **YouTube Live Chat** и **Kick** в одной браузерной сцене OBS,
поддерживает сторонние эмоуты и косметику, события чата, модерацию, гибкое
оформление и управление оверлеем прямо из Twitch-чата.

Frontend статический: Twitch подключается напрямую из Browser Source, а
YouTube и Kick используют отдельный WebSocket bridge. Поэтому основной
интерфейс можно размещать на обычном статическом хостинге, а bridge —
при необходимости поднять самостоятельно.

> Основной сценарий использования не требует ручного редактирования URL:
> откройте [chat.ruina.team](https://chat.ruina.team/), настройте оверлей и
> скопируйте готовую ссылку для OBS.

## ✨ Возможности

### Платформы

- **Twitch** — IRC в реальном времени из браузера, Twitch metadata/GQL,
  moderation events и channel events.
- **YouTube** — Live Chat через Chat Sources Bridge.
- **Kick** — public channel metadata и realtime-подписка через тот же bridge.
- Несколько источников можно использовать одновременно в одном оверлее.

### Эмоуты, бейджи и косметика

- Twitch emotes.
- **7TV**, **BetterTTV** и **FrankerFaceZ**.
- Персональные и zero-width эмоуты.
- Twitch и сторонние бейджи.
- 7TV paints для ников.
- Живые обновления 7TV через EventAPI.
- Cheers / Bits.
- Gigantified emotes и GIF-отображение.

### Сообщения и события

- Replies.
- Highlighted messages.
- Channel Point rewards.
- Twitch channel events.
- Удаление сообщений и moderation events.
- Recent messages при подключении.
- Фильтрация ботов.
- Фильтр одного chatter.
- Поддержка predictions.

### Внешний вид

- Размер текста, шрифт и custom font.
- Отдельный вес ника и основного текста.
- Stroke и shadow.
- Масштаб эмоутов и GIF.
- Fade и анимация сообщений.
- Горизонтальный режим.
- Обратный порядок строк.
- Small caps.
- Перенос после имени.
- Скрытие имён.
- Маркер платформы: `stripe`, `icon` или `none`.
- Настраиваемые фон, прозрачность, радиус, padding и border.
- Отдельное оформление Twitch events.
- Режимы ссылок: обычные, скрытые или выделенные.

### Управление и диагностика

- Команды управления прямо из Twitch-чата.
- Мягкая и полная перезагрузка оверлея.
- Обновление эмоутов, бейджей и косметики без ручной перезагрузки сцены.
- Тестовые сообщения.
- Страница диагностики `/status`.
- Debug/performance monitor через `debug=true`.

### TTS

ChatYX содержит опциональную TTS-подсистему:

- чтение сообщений чата;
- отдельная политика для ботов;
- выбор голоса;
- ограничение длины текста;
- регулировка громкости;
- команды `!tts`;
- `skip`, `stop` и очистка очереди.

TTS не обязателен для работы обычного чат-оверлея. Список голосов и связанные
заметки находятся в [справочнике голосов](./documents/TTS_VOICES.md).

## 🚀 Быстрый старт

1. Откройте **[chat.ruina.team](https://chat.ruina.team/)**.
2. Укажите Twitch-канал и, при необходимости, YouTube/Kick.
3. Настройте внешний вид, сообщения, события и дополнительные функции.
4. Скопируйте сгенерированную ссылку оверлея.
5. В OBS добавьте **Browser Source** и вставьте эту ссылку.

Для полноэкранной сцены обычно удобно использовать размер Browser Source,
совпадающий с canvas OBS, например `1920 × 1080`.

Фон самой страницы прозрачный; видимый фон сообщений настраивается отдельно.

## Маршруты

| Маршрут | Назначение |
|---|---|
| `/`, `/setup` | Настройка оверлея и предпросмотр |
| `/chat` | Оверлей чата для Browser Source |
| `/predictions` | Отдельное представление predictions |
| `/status` | Диагностика frontend и внешних сервисов |
| `/rtestatus` | Диагностика RTE |
| `/dev/messages` | Страница сообщений для разработки; доступна в dev-режиме |

## Как это работает

Frontend на SolidJS можно разместить на статическом хостинге. Twitch IRC
подключается непосредственно из Browser Source; эмоуты, бейджи и другие данные
загружаются из API соответствующих провайдеров. Для YouTube и Kick отдельный
[Chat Sources Bridge](./services/youtube-websocket/README.md) передаёт события
во frontend по WebSocket. По умолчанию используется `wss://ytwss.ruina.team`;
bridge можно запустить самостоятельно.

## Разработка

Нужны Git и **Bun ≥ 1.3.14**:

```bash
git clone https://github.com/ruinateam/chatyx.git
cd chatyx
bun install --frozen-lockfile
bun run dev
```

Откройте `http://localhost:5173/`. Полная проверка проекта — `bun run check`.
Команды, переменные окружения и CI описаны в [руководстве разработчика](./documents/DEVELOPMENT.md).

## Документация

| Документ | Содержание |
|---|---|
| [Справочник пользователя](./documents/USER_GUIDE.md) | URL-параметры, команды чата и DOM-хуки |
| [Разработка и развёртывание](./documents/DEVELOPMENT.md) | Локальный запуск, команды, окружение и CI |
| [Chat Sources Bridge](./services/youtube-websocket/README.md) | Запуск, API, лимиты и развёртывание сервиса YouTube/Kick |
| [Архитектура](./documents/ARCHITECTURE.md) | Слои, владение ресурсами и контракты |
| [Дизайн](./documents/DESIGN.md) | Визуальная модель и токены |
| [Голоса TTS](./documents/TTS_VOICES.md) | Голоса и настройки TTS |
| [Источники и лицензирование](./documents/CHAT_REFERENCES.md) | Происхождение и источники компонентов чата |
| [Лицензирование](./documents/LICENSING.md) | Лицензии и атрибуция |
| [Участие в проекте](./CONTRIBUTING.md) | Проверки и соглашения для изменений |

## Стек

SolidJS, TypeScript, Vite, Tailwind CSS, Kobalte и Hugeicons — frontend;
Bun и YouTube.js — bridge. Проверки используют Oxlint, TypeScript и Bun Test.

## Лицензия

First-party код распространяется под **GPL-3.0-only**: [LICENSE](./LICENSE).
Историческая лицензия MIT сохранена в [LICENSE-MIT](./LICENSE-MIT); подробности
и требования к атрибуции — в [политике лицензирования](./documents/LICENSING.md).
