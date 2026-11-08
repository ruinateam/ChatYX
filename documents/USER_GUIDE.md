# Справочник пользователя

[На главную](../README.md) · [Голоса TTS](./TTS_VOICES.md)

## 🔧 Настройка URL

Ниже перечислены основные параметры, а не полный справочник. Источник истины:
[`src/config/chatUrlParams.ts`](../src/config/chatUrlParams.ts).

### Источники чата

| Параметр | Назначение |
|---|---|
| `c` | Twitch channel; alias: `channel` |
| `yt` | YouTube handle / channel |
| `kick` | Kick channel slug |
| `ytws` | URL YouTube WebSocket bridge |
| `kickws` | URL Kick WebSocket bridge |
| `pm` | Platform marker: `none`, `stripe`, `icon` |

Hosted bridge по умолчанию:

```text
wss://ytwss.ruina.team
```

Для локального bridge:

```text
ytws=ws://localhost:9905
kickws=ws://localhost:9905
```

### Основные параметры отображения

| Параметр | Назначение |
|---|---|
| `s` | Размер текста |
| `f` | Пресет шрифта |
| `fw` | Font weight |
| `nfw` | Font weight ника |
| `fc` | Custom font при custom-пресете |
| `sh` | Shadow |
| `shadowcolor` | Цвет тени текста, `#rrggbb` (по умолчанию `#000000`) |
| `st` | Stroke |
| `strokecolor` | Цвет обводки текста, `#rrggbb` (по умолчанию `#000000`) |
| `fd` | Fade в секундах |
| `an` | Режим анимации |
| `ms` | Скорость анимации сообщений |
| `es` | Масштаб эмоутов |
| `gifs` | Показывать GIF |
| `gifscale` | Масштаб GIF |
| `sc` | Small caps |
| `nl` | Перенос после имени |
| `hn` | Скрывать имена |
| `rl` | Reverse line order |
| `hr` | Horizontal layout |

### Сообщения и фильтры

| Параметр | Назначение |
|---|---|
| `rm` | Recent messages |
| `rmlimit` | Лимит recent messages, от `1` до `100` |
| `b` | Показывать сообщения ботов |
| `bn` | Список bot names |
| `cmd` | Отображение command messages |
| `sg` | Показывать одного chatter |
| `u7` | Показывать unlisted 7TV emotes |
| `hsb` | Устаревший параметр скрытия сторонних бейджей |

### Контейнер и события

| Параметр | Назначение |
|---|---|
| `bgc` | Цвет фона overlay |
| `bgo` | Прозрачность фона |
| `bgr` | Border radius |
| `bgp` | Padding |
| `bgw` | Ширина границы (`bgb` — legacy alias) |
| `bcl` | Цвет границы |
| `teh` | Highlight Twitch events |
| `evc` | Цвета отдельных типов событий |
| `eva` | Прозрачность фона событий |
| `tec` | Устаревший общий цвет Twitch events |
| `teo` | Устаревший параметр прозрачности фона Twitch events |
| `teb` | Bold для Twitch events |
| `tei` | Italic для Twitch events |
| `hl` | Highlighted messages |
| `rewards` | Channel Point rewards |
| `gigantify` | Gigantified emotes |
| `pred` | Predictions |

### Ссылки

| Параметр | Назначение |
|---|---|
| `links` | `normal`, `hide` или `highlight` |
| `linkcolor` | Цвет выделенных ссылок |
| `hidelinkrewards` | Скрывать link rewards |

### RTE / TTS

| Параметр | Назначение |
|---|---|
| `rtep` | RTE proxy |
| `aztts` | Azure TTS provider |
| `rtetts` | ChatIS TTS provider |
| `rtebadge` | RTE badge integration |
| `rtecosmetics` | RTE custom cosmetics |
| `ttsread` | Читать сообщения чата |
| `ttsbots` | Читать сообщения ботов |
| `ttsvoice` | Голос основного TTS provider |
| `ttschatisvoice` | Голос ChatIS provider |
| `ttsvolume` | Громкость |
| `ttsmax` | Максимальная длина текста |

Boolean-параметры понимают формы:

```text
true / 1 / yes / on
false / 0 / no / off
```

Поддерживаются и legacy aliases. Для генерации и импорта конфигурации лучше
использовать setup-страницу: она применяет нормализацию и валидацию значений.

## 💬 Команды в чате

Команды обрабатываются для Twitch broadcaster, `lead_moderator` и `moderator`.

Основные префиксы равноправны:

```text
!chat
!chatis
!chatyx
```

| Команда | Действие |
|---|---|
| `!chat refresh` | Обновить эмоуты, бейджи и cosmetics |
| `!chat refresh emotes` | Обновить только эмоуты |
| `!chat refresh badges` | Обновить только бейджи |
| `!chat refresh cosmetics` | Обновить cosmetics |
| `!chat reload` | Мягкая перезагрузка runtime |
| `!chat hardreload` | Полная перезагрузка Browser Source |
| `!chat show` | Показать чат |
| `!chat hide` | Скрыть чат |
| `!chat clear` | Очистить сообщения |
| `!chat ping` | Проверить обработку команд |
| `!chat test [1-50]` | Добавить тестовые сообщения |
| `!tts <текст>` | Произнести текст через включённый TTS provider |
| `!tts -v <voice> <текст>` | Произнести текст выбранным голосом |
| `!tts skip` | Пропустить текущую реплику |
| `!tts stop` | Остановить TTS |
| `!tts clear` | Очистить очередь TTS |

Для `refresh` без аргумента используется scope `all`.

Поддерживаются legacy-команды:

```text
!refreshoverlay
!update
!clearcache
!reloadchat
!hardreload
```

### Developer channel targeting

В developer chat `#linaryx` команды от configured developer identity могут
адресоваться конкретному каналу через `-c`:

```text
!chatyx refresh -c channel
!chatyx reload -c channel1,channel2
!chatyx ping -c all
```

## 🧩 DOM-хуки сообщений

Каждая строка чата использует `.chat_line` и содержит стабильные data-атрибуты,
которые можно использовать для собственных CSS/JS, тем и отладки.

| Хук | Где | Содержимое |
|---|---|---|
| `data-platform` | `.chat_line` | `twitch`, `youtube` или `kick` |
| `data-nick` | `.chat_line` | Логин автора |
| `data-user-id` | `.chat_line` | ID автора |
| `data-time` | `.chat_line` | Unix time сообщения в миллисекундах |
| `data-id` | `.chat_line` | ID сообщения |
| `data-event` | `.chat_line` | Тип Twitch event, если есть |
| `.badge` | строка | Бейджи автора |
| `.user_info` | строка | Контейнер информации об авторе |
| `.nick` | строка | Ник |
| `.colon` | строка | Разделитель |
| `.message` | строка | Текст и эмоуты |
| `.emote-container` | `.message` | Обёртка эмоутов |
| `.reply_line` | строка | Превью reply |
| `.mention` | `.message` | Mention |
| `.chat-link` | `.message` | Ссылка |
