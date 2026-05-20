# Техническое задание: CRM/ERP система развития профессионального игрока в снукер

**Рабочее название:** Snooker Player Development OS  
**Тип продукта:** web-first PWA / CRM / ERP / аналитическая платформа развития игрока  
**Целевая аудитория:** профессиональный или полупрофессиональный игрок в снукер, тренер, родитель, академия, клуб  
**Основная идея:** не просто приложение для счёта или упражнений, а долгосрочная система развития игрока, где вся история тренировок, матчей, упражнений, ошибок, прогресса, тренеров, факторов режима и соревнований сохраняется на протяжении 8–10+ лет.

---

## 1. Цель продукта

Создать единую цифровую систему для долгосрочного развития игрока в снукер.

Система должна:

- хранить полную историю тренировочного процесса;
- фиксировать упражнения, попытки, успехи, ошибки, комментарии тренеров;
- фиксировать матчи, турниры, соперников, страны, результаты, брейки и игровые показатели;
- сохранять историю тренеров и тренировочных методик;
- помогать новому тренеру быстро понять игрока;
- предоставлять аналитику прогресса за недели, месяцы, годы;
- использовать AI как виртуального дополнительного тренера;
- позволять родителю или тренеру фиксировать тренировочные данные у стола;
- работать удобно на desktop, tablet и mobile;
- быть готовой к будущему расширению: визуализация стола, схемы упражнений, движение шаров, видеоанализ, внешние интеграции.

---

## 2. Ключевая продуктовая концепция

Это не “snooker scoring app”.

Это **CRM/ERP развития игрока**.

В центре системы находится не матч и не упражнение, а **игрок как долгосрочный спортивный проект**.

Система должна отвечать на вопросы:

- Как игрок развивался за последние 3 месяца, 1 год, 5 лет?
- Какие упражнения реально давали результат?
- Какие ошибки повторяются независимо от тренера?
- Какие изменения произошли после смены тренера?
- Какие зоны игры улучшаются, а какие стоят на месте?
- Как тренировочные показатели переносятся в реальные матчи?
- Как поездки, сон, усталость, БАДы, смена кия, столы, турниры влияют на результаты?
- Что должен знать новый тренер перед первой тренировкой?
- Что игроку тренировать завтра, на этой неделе и за месяц до турнира?

---

## 3. Основные роли пользователей

### 3.1 Player

Игрок.

Возможности:

- видеть свои тренировки;
- видеть прогресс;
- добавлять self-notes;
- просматривать упражнения;
- смотреть рекомендации AI;
- видеть календарь тренировок и турниров;
- фиксировать субъективное состояние: усталость, концентрация, настроение, сон.

### 3.2 Coach

Тренер.

Возможности:

- создавать тренировочные планы;
- запускать тренировочные сессии;
- фиксировать результаты упражнений;
- отмечать ошибки;
- оставлять комментарии;
- прикреплять видео/фото;
- анализировать прогресс;
- формировать отчёты;
- готовить handover summary для следующего тренера.

### 3.3 Parent / Guardian

Родитель или ответственный сопровождающий.

Возможности:

- фиксировать результаты тренировок, если тренер не ведёт приложение;
- видеть прогресс;
- отмечать режимные факторы: сон, поездки, витамины, БАДы, самочувствие;
- загружать результаты турниров;
- смотреть понятные отчёты без перегруза профессиональными метриками.

### 3.4 Academy Admin / Club Admin

Администратор академии или клуба.

Возможности:

- управлять игроками;
- назначать тренеров;
- видеть агрегированные отчёты;
- создавать стандартные программы;
- управлять библиотекой упражнений;
- контролировать доступы.

### 3.5 System Admin

Технический администратор.

Возможности:

- управление пользователями;
- управление подписками / тарифами в будущем;
- аудит действий;
- настройки AI;
- управление источниками внешних данных;
- мониторинг системы.

---

## 4. Основные модули системы

### 4.1 Player Profile

Профиль игрока.

Данные:

- имя;
- дата рождения;
- страна;
- dominant hand;
- текущий клуб;
- текущий тренер;
- уровень;
- цели на сезон;
- текущий equipment profile;
- история тренеров;
- история клубов;
- история тренировочных блоков.

### 4.2 Coach Continuity Timeline

Одна из ключевых дифференцирующих функций.

Экран, который показывает историю развития игрока по периодам:

- тренер;
- период работы;
- главные цели;
- основные упражнения;
- ключевые улучшения;
- ключевые проблемы;
- повторяющиеся ошибки;
- комментарии тренера;
- AI summary;
- рекомендации для следующего тренера.

Цель: новый тренер не начинает с нуля.

### 4.3 Training Sessions

Тренировочная сессия.

Данные:

- дата;
- время начала и окончания;
- место;
- стол;
- тренер;
- тип тренировки;
- цель;
- список упражнений;
- длительность;
- интенсивность;
- настроение;
- усталость до/после;
- концентрация;
- заметки;
- вложения;
- AI summary.

Типы тренировок:

- technique;
- potting;
- positional play;
- break building;
- safety;
- escape;
- match simulation;
- tournament preparation;
- recovery / light session;
- mixed session.

### 4.4 Drill Library

Библиотека упражнений.

Упражнения должны быть структурированы по категориям:

- cue action;
- potting;
- positional play;
- break building;
- safety;
- snooker escape;
- tactical play;
- match simulation;
- pressure training;
- mental routine;
- custom drills.

Каждое упражнение должно иметь:

- название;
- категорию;
- описание;
- цель;
- уровень сложности;
- схему стола;
- стартовую позицию шаров;
- правила выполнения;
- критерии успеха;
- метрики;
- варианты усложнения;
- варианты упрощения;
- типичные ошибки;
- рекомендации тренера;
- теги.

### 4.5 Drill Execution

Фиксация выполнения упражнения.

Данные:

- session id;
- drill id;
- set number;
- attempts;
- successful attempts;
- score;
- max run;
- average score;
- completion rate;
- error tags;
- coach notes;
- player notes;
- video attachments;
- table layout snapshot;
- AI comments.

Пример:

```text
Drill: Long Red to Corner
Attempts: 30
Success: 17
Success rate: 56.7%
Miss thick: 8
Miss thin: 4
Jaw miss: 1
Position success: 9
Coach note: Head movement on backswing. Needs slower final delivery.
```

### 4.6 Match Log

Журнал матчей.

Данные:

- дата;
- турнир;
- страна;
- город;
- клуб;
- соперник;
- round;
- format;
- frames won/lost;
- high break;
- 50+ breaks;
- 70+ breaks;
- 100+ breaks;
- deciding frame result;
- safety success;
- long pot success;
- unforced errors;
- tactical errors;
- match notes;
- video link;
- external source link.

### 4.7 Shot-by-Shot Mode

Продвинутый режим.

Используется для важных матчей или детального анализа.

Данные:

- frame id;
- shot number;
- player;
- shot type;
- ball on;
- result;
- pot/miss/foul/safety;
- points scored;
- cue ball control;
- target zone hit/miss;
- miss side;
- difficulty rating;
- pressure rating;
- shot time;
- tactical quality;
- error tags.

Shot-by-shot mode не обязателен для MVP, но архитектура должна быть готова.

### 4.8 Calendar

Календарь событий.

Типы событий:

- training;
- tournament;
- match;
- travel;
- rest day;
- illness;
- injury;
- equipment change;
- coach change;
- supplement start;
- supplement end;
- sleep issue;
- school/workload;
- custom factor.

### 4.9 Wellness / Lifestyle / Supplement Tracking

Модуль факторов, влияющих на результат.

Важно: система не должна делать медицинские выводы. Она может показывать корреляции, но не причинность.

Данные:

- сон;
- усталость;
- настроение;
- фокус;
- стресс;
- поездки;
- болезнь;
- травма;
- витамины;
- БАДы;
- режим питания;
- смена кия;
- смена наклейки;
- смена стола;
- смена клуба.

AI должен формулировать выводы аккуратно:

> После начала периода X наблюдалось изменение метрики Y. Это корреляция, а не доказанная причинно-следственная связь.

### 4.10 Analytics Dashboard

Основные dashboards:

- player overview;
- weekly progress;
- monthly progress;
- season overview;
- drill progress;
- skill map;
- match performance;
- break building;
- safety performance;
- pressure performance;
- coach comparison;
- tournament preparation;
- long-term trend.

### 4.11 AI Coach

AI является аналитическим и рекомендательным слоем.

Функции:

- weekly summary;
- monthly summary;
- training recommendations;
- weak area detection;
- plateau detection;
- coach handover summary;
- tournament preparation plan;
- error pattern analysis;
- drill effectiveness analysis;
- correlation analysis;
- question answering over player history.

Примерные запросы к AI:

```text
Что изменилось за последние 3 месяца?
Почему игрок плохо переносит тренировочные брейки в реальные матчи?
Какие ошибки повторяются чаще всего?
Какие упражнения дали лучший результат по long pot success?
Что должен знать новый тренер?
Составь план на 2 недели до турнира.
```

### 4.12 External Data Import

Импорт внешних результатов.

Источники:

- snooker.org API;
- CueScore;
- WST/WPBSA;
- CueTracker, если легально и технически возможно;
- ручной CSV/Excel;
- ручной ввод;
- URL import;
- PDF/image upload с последующим AI extraction в будущем.

Требования:

- не завязываться на один источник;
- иметь ExternalDataProvider abstraction;
- хранить raw imported payload;
- хранить source;
- хранить confidence score;
- позволять ручную верификацию;
- поддерживать duplicate detection;
- поддерживать player matching.

---

## 5. Стек технологий

### 5.1 Общая стратегия

Рекомендуемый подход: **web-first PWA**.

Сначала создаётся полноценное веб-приложение, адаптированное под desktop/tablet/mobile. Затем оно может быть упаковано в Android/iOS через Capacitor.

Причины:

- тренеру удобно работать с планшета у стола;
- родителю удобно работать с телефона;
- аналитику удобно смотреть на desktop;
- web-first быстрее в разработке;
- проще использовать AI coding agents;
- проще деплоить на Linux/Docker;
- проще поддерживать один кодbase;
- позже можно превратить в installable mobile app.

---

## 6. Рекомендуемый стек

### 6.1 Frontend

**Next.js + React + TypeScript**

Причины:

- хороший выбор для web application;
- поддержка server-side rendering и client-side интерактивности;
- удобно строить dashboard;
- удобно использовать с Docker;
- хорошо подходит для AI-assisted development;
- можно сделать PWA;
- можно позже упаковать через Capacitor.

Дополнительно:

- Tailwind CSS;
- shadcn/ui;
- TanStack Query;
- Zustand или Jotai для локального состояния;
- React Hook Form + Zod;
- Recharts или ECharts для графиков;
- date-fns для дат;
- i18next/next-intl для будущей мультиязычности.

### 6.2 UI / Snooker Table Renderer

Требование: приложение должно иметь хороший потенциал для визуализации снукерного стола, шаров, схем упражнений и в будущем движения шаров.

Рекомендуемый подход:

#### MVP Rendering Layer

**React-Konva / Konva**

Использовать для:

- 2D прорисовки стола;
- шаров;
- линий прицеливания;
- зон попадания;
- стартовых layout для упражнений;
- drag-and-drop шаров;
- сохранения table layout;
- создания drill diagram editor.

Почему:

- хорошо работает с React;
- подходит для интерактивных 2D canvas-сцен;
- проще для MVP;
- проще объяснить агентам;
- быстрее разработать editor.

#### Future Rendering Layer

**PixiJS**

Использовать позже, если потребуется:

- более сложная анимация;
- плавное движение шаров;
- WebGL/WebGPU rendering;
- replay ударов;
- симуляция траекторий;
- визуально богатый training mode;
- potentially physics-based interactions.

#### Архитектурное требование

Не привязывать бизнес-логику к конкретной canvas-библиотеке.

Нужно создать отдельный доменный слой:

```text
TableLayout
BallPosition
ShotPath
TargetZone
DrillDiagram
TableRendererAdapter
```

Тогда MVP можно сделать на Konva, а позже часть рендера перевести на PixiJS без переписывания всей системы.

### 6.3 Backend

Рекомендуемый вариант:

**NestJS + TypeScript**

Причины:

- единый язык frontend/backend;
- строгая структура;
- удобно для модульной архитектуры;
- хорошо подходит для REST/GraphQL;
- хорошо подходит для background jobs;
- легко покрывать тестами;
- удобно давать задачи AI-агентам.

Альтернатива:

**.NET 8/9 Web API**

Подходит, если хочется enterprise-grade backend и сильную типизацию. Но для скорости разработки с агентами и единого TypeScript stack предпочтительнее NestJS.

### 6.4 Database

**PostgreSQL**

Причины:

- надёжная relational DB;
- хороша для долгосрочных данных;
- JSONB для гибких структур drill results;
- indexes/materialized views;
- расширение pgvector для AI/RAG в будущем.

ORM:

- Prisma  
или
- Drizzle ORM

Рекомендация: **Prisma** для скорости и удобства агентов.

### 6.5 File Storage

Для вложений:

- видео тренировок;
- фото layout;
- PDF;
- импортированные документы;
- AI-generated reports.

MVP:

- локальное хранилище на сервере через mounted volume.

Production-ready:

- S3-compatible storage;
- MinIO self-hosted;
- AWS S3 / Cloudflare R2 / Backblaze B2.

### 6.6 AI Layer

AI лучше вынести в отдельный модуль/сервис.

MVP:

- backend вызывает LLM API;
- summaries генерируются по structured data;
- prompt templates хранятся в репозитории;
- AI outputs сохраняются в базе.

Future:

- embeddings;
- pgvector;
- player-specific RAG;
- semantic search по заметкам тренеров;
- video transcript analysis;
- automated coach reports;
- AI agent workflows.

### 6.7 Background Jobs

Использовать:

- BullMQ + Redis

Задачи:

- генерация AI summary;
- импорт внешних данных;
- обработка видео;
- пересчёт аналитики;
- отправка уведомлений;
- экспорт отчётов;
- синхронизация календаря.

### 6.8 Deployment

Целевое окружение:

- Linux server;
- Docker;
- Docker Compose;
- Nginx reverse proxy;
- Let's Encrypt;
- PostgreSQL container;
- Redis container;
- backend container;
- frontend container;
- worker container;
- optional MinIO container.

---

## 7. Предлагаемая архитектура

```text
[Browser / PWA / Mobile Web]
          |
          v
[Next.js Frontend]
          |
          v
[NestJS API Gateway / Backend]
          |
          +--> [PostgreSQL]
          +--> [Redis / BullMQ]
          +--> [File Storage / MinIO]
          +--> [AI Service / LLM Provider]
          +--> [External Data Providers]
                  |
                  +--> snooker.org
                  +--> CueScore
                  +--> WST/WPBSA
                  +--> CSV/Excel import
```

---

## 8. Репозиторий

Рекомендуемая структура monorepo:

```text
snooker-player-os/
  apps/
    web/
      src/
      public/
      next.config.ts
      package.json

    api/
      src/
      prisma/
      test/
      package.json

    worker/
      src/
      package.json

  packages/
    shared/
      src/
        types/
        schemas/
        constants/

    snooker-domain/
      src/
        table/
        drills/
        scoring/
        analytics/

    ui/
      src/
        components/
        charts/
        table-renderer/

    ai-prompts/
      prompts/
        weekly-summary.md
        coach-handover.md
        tournament-prep.md
        drill-analysis.md

  infra/
    docker/
    nginx/
    scripts/

  docs/
    product-spec.md
    technical-spec.md
    database-model.md
    api-spec.md
    ai-spec.md
    table-renderer-spec.md
    agent-guidelines.md

  docker-compose.yml
  .env.example
  README.md
```

---

## 9. Модель данных

### 9.1 Core entities

```text
User
Role
PlayerProfile
CoachProfile
ParentProfile
Academy
Club
PlayerCoachRelation
TrainingSession
TrainingBlock
DrillTemplate
DrillExecution
DrillAttempt
Match
Frame
Shot
Tournament
CalendarEvent
LifestyleFactor
SupplementEvent
EquipmentProfile
CoachNote
PlayerNote
Attachment
AIInsight
AIReport
ExternalDataSource
ExternalImportJob
ExternalImportedRecord
```

---

## 10. Предварительная схема таблиц

### users

```text
id
email
password_hash
display_name
created_at
updated_at
last_login_at
status
```

### roles

```text
id
user_id
role_type
scope_type
scope_id
created_at
```

role_type:

- player;
- coach;
- parent;
- academy_admin;
- system_admin.

### player_profiles

```text
id
user_id
first_name
last_name
date_of_birth
country
dominant_hand
current_club_id
current_coach_id
level
season_goal
created_at
updated_at
```

### coach_profiles

```text
id
user_id
display_name
country
certifications
bio
created_at
updated_at
```

### player_coach_relations

```text
id
player_id
coach_id
start_date
end_date
status
main_focus
notes
created_at
updated_at
```

### training_sessions

```text
id
player_id
coach_id
club_id
started_at
ended_at
session_type
title
goal
intensity
fatigue_before
fatigue_after
focus_level
mood
notes
created_by_user_id
created_at
updated_at
```

### drill_templates

```text
id
name
category
difficulty
description
goal
rules
success_criteria
metrics_schema_json
default_table_layout_json
tags
created_by_user_id
visibility
created_at
updated_at
```

### drill_executions

```text
id
training_session_id
drill_template_id
player_id
coach_id
started_at
ended_at
attempts
successes
score
max_run
average_score
result_json
error_tags
coach_notes
player_notes
table_layout_snapshot_json
created_at
updated_at
```

### drill_attempts

```text
id
drill_execution_id
attempt_number
result
score
pot_success
position_success
miss_type
error_tags
shot_time_ms
notes
created_at
```

### matches

```text
id
player_id
opponent_name
opponent_external_id
tournament_id
match_date
country
city
club
round
format
frames_won
frames_lost
high_break
breaks_50
breaks_70
breaks_100
result
source
source_url
notes
created_at
updated_at
```

### frames

```text
id
match_id
frame_number
player_score
opponent_score
winner
high_break
frame_duration_sec
notes
created_at
```

### shots

```text
id
frame_id
shot_number
player_id
shot_type
ball_on
result
points_scored
foul_points
miss_type
safety_result
cue_ball_control_rating
target_zone_hit
difficulty_rating
pressure_rating
shot_time_ms
error_tags
table_layout_before_json
table_layout_after_json
created_at
```

### calendar_events

```text
id
player_id
event_type
title
description
start_at
end_at
source
metadata_json
created_by_user_id
created_at
updated_at
```

### lifestyle_factors

```text
id
player_id
date
sleep_hours
sleep_quality
fatigue
stress
focus
mood
illness
injury
travel
notes
created_at
updated_at
```

### supplement_events

```text
id
player_id
name
category
start_date
end_date
dosage_note
reason
notes
created_by_user_id
created_at
updated_at
```

### equipment_profiles

```text
id
player_id
cue_name
cue_weight
tip_brand
tip_size
tip_change_date
extension
chalk
notes
active_from
active_to
created_at
updated_at
```

### ai_reports

```text
id
player_id
report_type
period_start
period_end
title
summary
recommendations_json
risk_flags_json
source_data_hash
created_at
created_by
```

### ai_insights

```text
id
player_id
insight_type
title
description
confidence
related_entity_type
related_entity_id
period_start
period_end
created_at
status
```

### external_data_sources

```text
id
name
provider_type
base_url
auth_type
status
created_at
updated_at
```

### external_import_jobs

```text
id
source_id
player_id
status
started_at
finished_at
params_json
result_summary_json
error_message
created_at
```

### external_imported_records

```text
id
import_job_id
source_id
external_id
record_type
raw_payload_json
normalized_payload_json
matched_entity_type
matched_entity_id
confidence
verification_status
created_at
updated_at
```

---

## 11. Snooker Table Renderer

### 11.1 Цель

Создать reusable компонент для визуализации:

- стола;
- шаров;
- позиций;
- линий;
- зон;
- упражнений;
- ударов;
- возможных траекторий;
- future replay/animation.

### 11.2 Компоненты

```text
SnookerTableCanvas
TableSurface
Cushions
Pockets
Ball
BallLayer
AimLine
ShotPath
TargetZone
AnnotationLayer
DrillLayoutEditor
TableLayoutPreview
```

### 11.3 Domain model

```ts
type BallColor =
  | "white"
  | "red"
  | "yellow"
  | "green"
  | "brown"
  | "blue"
  | "pink"
  | "black";

type BallPosition = {
  id: string;
  color: BallColor;
  x: number;
  y: number;
  visible: boolean;
};

type TargetZone = {
  id: string;
  type: "circle" | "rectangle" | "polygon";
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
  label?: string;
};

type ShotPath = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  cushions?: Array<{ x: number; y: number }>;
  label?: string;
};

type TableLayout = {
  id: string;
  tableSize: "full-size" | "club" | "custom";
  balls: BallPosition[];
  targetZones: TargetZone[];
  shotPaths: ShotPath[];
  annotations: TableAnnotation[];
};
```

### 11.4 Требования к MVP

- отрисовка стола;
- отрисовка всех цветов;
- drag-and-drop шаров;
- сохранение layout;
- загрузка layout из JSON;
- отображение схемы упражнения;
- target zones;
- simple shot lines;
- mobile/tablet touch support;
- export layout as image;
- responsive scaling.

### 11.5 Требования к будущей версии

- движение шаров;
- replay ударов;
- animation timeline;
- ghost ball;
- projected cue ball path;
- cushion contact points;
- collision simulation;
- shot recommendation overlay;
- video overlay;
- AI-generated drill diagram.

### 11.6 Важное архитектурное правило

Renderer не должен знать бизнес-логику тренировок.

Renderer получает только:

```text
TableLayout
RendererOptions
InteractionMode
```

И возвращает события:

```text
onBallMove
onZoneChange
onPathCreate
onLayoutSave
onSelectionChange
```

---

## 12. Библиотека упражнений

### 12.1 Cue Action

Цель: стабильная механика удара.

Упражнения:

1. White Ball Up-and-Down Table
2. Straight Cueing Line
3. Stop Shot Control
4. Stun Shot Ladder
5. Screw-back Distance Control
6. Follow-through Consistency
7. Long Straight Pot Mechanics
8. Cue Ball Return Test

Метрики:

- straightness;
- cue ball deviation;
- pot success;
- cue ball stop accuracy;
- repeatability;
- coach technical error tags.

Типичные ошибки:

- head movement;
- deceleration;
- cue across the line;
- unwanted side;
- rushed backswing;
- poor timing.

### 12.2 Potting

Упражнения:

1. Long Red to Corner
2. Half-ball Potting
3. Thin Cut Potting
4. Middle Pocket Blues
5. Black off Spot
6. Pink to Corner
7. Red from Baulk
8. Pressure 10-Ball Potting Test

Метрики:

- pot success rate;
- miss side;
- pocket jaw miss;
- cue ball control after pot;
- shot time;
- pressure score.

### 12.3 Positional Play

Упражнения:

1. 3-Ball Positional Pattern
2. Stun-Run-Through Routes
3. Two-Cushion Position
4. Baulk Colour Routes
5. Cue Ball Landing Zone Drill
6. Red-to-Colour Position Test
7. Blue/Pink/Black Transition Drill

Метрики:

- pot success;
- position success;
- landing zone distance;
- selected route;
- cue ball speed control;
- next shot quality.

### 12.4 Break Building

Упражнения:

1. Line-Up
2. T-Drill
3. 5 Reds + Colours
4. 10 Reds Open Table
5. Black Spot Routine
6. Pink/Black Alternation
7. Pack Split Routine
8. Random Layout Clearance
9. Century Simulation

Метрики:

- max break;
- average break;
- balls potted per visit;
- break-ending reason;
- red-to-colour conversion;
- pack split success;
- points per visit.

### 12.5 Safety

Упражнения:

1. Long Safety to Baulk
2. Thin Safety off Red
3. Object Ball to Cushion
4. Cue Ball Behind Baulk Colours
5. Containing Safety
6. Aggressive Safety
7. Safety Exchange Simulation
8. Return Safety Drill

Метрики:

- safety success;
- cue ball final zone;
- object ball safe/unsafe;
- opponent pot chance left;
- foul risk;
- tactical quality.

### 12.6 Snooker Escape

Упражнения:

1. One-Cushion Escape
2. Two-Cushion Escape
3. Three-Cushion Escape
4. Escape with Safety
5. Hit-and-Stick Escape
6. Foul-and-Miss Pressure Drill
7. Escape Under Shot Clock

Метрики:

- hit success;
- safe after escape;
- foul points conceded;
- attempts required;
- selected route quality;
- pressure handling.

### 12.7 Match Simulation

Упражнения:

1. Best of 7 Training Match
2. Deciding Frame Simulation
3. First Chance Clearance
4. Comeback from 0–40
5. Protect 40-Point Lead
6. Tactical Frame Only
7. 30-Second Shot Clock Frame
8. Tournament Day Simulation

Метрики:

- frame result;
- first chance conversion;
- unforced errors;
- tactical errors;
- frame-winning chance conversion;
- pressure mistakes;
- average break under pressure.

---

## 13. AI Coach Specification

### 13.1 Принцип

AI не заменяет профессионального тренера.

AI помогает:

- структурировать данные;
- находить паттерны;
- готовить summaries;
- сравнивать периоды;
- предлагать направления работы;
- помогать новому тренеру быстрее понять игрока.

### 13.2 AI Inputs

AI может использовать:

- training sessions;
- drill executions;
- match results;
- shot data;
- coach notes;
- player notes;
- calendar events;
- wellness data;
- supplement events;
- equipment changes;
- external match data;
- previous AI reports.

### 13.3 AI Outputs

Типы результатов:

- weekly training summary;
- monthly progress report;
- coach handover report;
- tournament preparation plan;
- skill map analysis;
- weak area report;
- drill effectiveness report;
- correlation observation;
- custom answer.

### 13.4 Prompt templates

Prompt templates должны храниться в репозитории:

```text
packages/ai-prompts/prompts/
  weekly-summary.md
  monthly-summary.md
  coach-handover.md
  tournament-prep.md
  drill-effectiveness.md
  correlation-analysis.md
```

### 13.5 AI Safety

AI не должен:

- давать медицинские утверждения;
- назначать витамины/БАДы;
- делать категоричные причинные выводы;
- заменять врача;
- заменять тренера;
- скрывать уровень уверенности.

AI должен:

- говорить “наблюдается корреляция”;
- показывать источник вывода;
- указывать период анализа;
- объяснять, какие данные использованы;
- указывать, если данных недостаточно.

---

## 14. API Requirements

### 14.1 API style

Рекомендуется REST для MVP.

Причины:

- проще;
- быстрее;
- удобно тестировать;
- удобно давать агентам;
- легко документировать через OpenAPI.

Future option: GraphQL для сложных dashboards, если потребуется.

### 14.2 Основные endpoints

```text
/auth/login
/auth/logout
/auth/refresh
/auth/me

/players
/players/:id
/players/:id/timeline
/players/:id/dashboard
/players/:id/skill-map

/coaches
/coaches/:id

/training-sessions
/training-sessions/:id
/training-sessions/:id/drills

/drill-templates
/drill-templates/:id
/drill-executions
/drill-executions/:id
/drill-executions/:id/attempts

/matches
/matches/:id
/matches/:id/frames
/matches/:id/shots

/calendar-events
/lifestyle-factors
/supplement-events
/equipment-profiles

/ai/reports
/ai/reports/generate
/ai/ask
/ai/coach-handover

/external-sources
/external-import-jobs
/external-import-jobs/:id/run

/attachments
/attachments/:id
```

---

## 15. Offline-first / PWA Requirements

### 15.1 Цель

Тренировки могут проходить в клубе, где интернет нестабилен.

Приложение должно позволять:

- открыть тренировку;
- фиксировать результаты;
- добавлять заметки;
- изменять layout;
- сохранять drill executions;
- синхронизировать данные позже.

### 15.2 MVP offline scope

Offline поддержка:

- активная training session;
- drill execution;
- draft notes;
- table layout drafts.

### 15.3 Technical approach

- PWA manifest;
- service worker;
- IndexedDB;
- local mutation queue;
- sync status per entity;
- conflict detection.

### 15.4 Conflict handling

Если два пользователя изменили одну и ту же сущность:

- показывать конфликт;
- хранить обе версии;
- дать тренеру/родителю выбрать;
- не терять данные.

---

## 16. Security / Privacy

### 16.1 Основные требования

- JWT/session-based authentication;
- refresh tokens;
- role-based access control;
- audit log;
- encrypted secrets;
- HTTPS only;
- secure cookies;
- backups;
- export user data;
- delete access by request.

### 16.2 Data ownership

Данные должны принадлежать игроку/семье/академии в зависимости от модели.

Ключевой принцип:

- тренер получает доступ;
- тренер не становится владельцем всей истории;
- доступ тренера можно отозвать;
- история не теряется при смене тренера.

### 16.3 Sensitive data

Wellness/supplement данные считать sensitive.

Требования:

- отдельные permissions;
- не показывать всем тренерам по умолчанию;
- хранить audit log доступа;
- позволять отключить этот модуль.

---

## 17. Analytics Requirements

### 17.1 Core metrics

- total training hours;
- sessions per week;
- drill success rate;
- pot success;
- position success;
- safety success;
- escape success;
- max break;
- average break;
- points per visit;
- unforced errors;
- tactical errors;
- first chance conversion;
- frame-winning chance conversion;
- performance under pressure.

### 17.2 Skill Map

Навыки:

- cue action;
- long potting;
- middle-distance potting;
- positional play;
- break building;
- safety;
- escaping snookers;
- tactical decision-making;
- pressure play;
- mental consistency.

### 17.3 Time comparisons

Система должна сравнивать:

- week over week;
- month over month;
- season over season;
- before/after coach change;
- before/after training block;
- before/after equipment change;
- before/after supplement period;
- practice vs match performance.

---

## 18. UI Requirements

### 18.1 General UI

Принципы:

- mobile-first;
- tablet optimized;
- desktop dashboards;
- fast data entry;
- large buttons near table;
- minimal typing during training;
- dark mode;
- high contrast mode;
- responsive charts;
- offline status indicator.

### 18.2 Основные экраны

MVP screens:

1. Login
2. Player Dashboard
3. Player Profile
4. Training Calendar
5. Training Session List
6. Training Session Detail
7. Start Training Session
8. Drill Library
9. Drill Detail
10. Drill Execution Screen
11. Table Layout Editor
12. Match Log
13. Match Detail
14. Calendar Factors
15. AI Reports
16. Coach Timeline
17. Settings

### 18.3 Drill Execution UX

У тренера/родителя должно быть быстрое управление:

- + attempt;
- success;
- miss;
- miss thick;
- miss thin;
- lost position;
- safety good/bad;
- add note;
- add video;
- finish set;
- finish drill.

Тренировка не должна превращаться в бухгалтерию.

---

## 19. Agent-based Development

### 19.1 Цель

Разработка должна быть организована так, чтобы AI coding agents могли эффективно создавать модули.

### 19.2 Правила для агентов

В репозитории должен быть файл:

```text
AGENTS.md
```

Он должен описывать:

- архитектуру;
- coding conventions;
- как запускать проект;
- как писать тесты;
- как добавлять migration;
- как добавлять API endpoint;
- как добавлять UI компонент;
- как работать с domain model;
- как не ломать table renderer;
- как документировать решения.

### 19.3 Разделение задач для агентов

Агенты должны работать маленькими bounded tasks.

Примеры задач:

```text
Create Prisma models for TrainingSession and DrillExecution.
Implement REST endpoints for drill templates.
Create React component SnookerTableCanvas using react-konva.
Create DrillExecutionScreen mobile-first UI.
Add IndexedDB local queue for offline drill attempts.
Implement weekly AI summary prompt and backend job.
Create dashboard chart for pot success over time.
```

### 19.4 Definition of Done for agent tasks

Каждая задача должна включать:

- код;
- unit tests where applicable;
- type safety;
- migration if needed;
- API docs update;
- UI screenshot/story if UI task;
- no unrelated changes;
- clear commit message.

### 19.5 Recommended automation

- ESLint;
- Prettier;
- TypeScript strict mode;
- unit tests;
- integration tests;
- Playwright e2e;
- Docker build check;
- migration check;
- seed data generation.

---

## 20. Docker Deployment

### 20.1 Services

```text
web
api
worker
postgres
redis
minio
nginx
```

### 20.2 Example docker-compose structure

```yaml
services:
  web:
    build:
      context: .
      dockerfile: infra/docker/web.Dockerfile
    env_file:
      - .env
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: infra/docker/api.Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      dockerfile: infra/docker/worker.Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: snooker_os
      POSTGRES_USER: snooker
      POSTGRES_PASSWORD: snooker_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 20.3 Nginx

Nginx должен:

- принимать HTTPS;
- проксировать frontend;
- проксировать API;
- поддерживать upload limits для видео;
- отдавать static assets;
- поддерживать gzip/brotli;
- иметь Let's Encrypt сертификаты.

---

## 21. Roadmap

### Phase 0 — Product Foundation

- финализация требований;
- data model;
- wireframes;
- drill library v1;
- technical architecture;
- repository setup;
- Docker local environment.

### Phase 1 — MVP

Цель: можно вести реальные тренировки.

Функции:

- auth;
- player profile;
- coach/parent roles;
- drill library;
- training session;
- drill execution;
- basic table layout renderer;
- notes;
- attachments;
- basic dashboard;
- manual match log;
- calendar factors;
- weekly AI summary;
- Docker deployment.

### Phase 2 — Professional Training OS

Функции:

- coach timeline;
- training blocks;
- skill map;
- advanced analytics;
- match simulation;
- custom drills;
- report exports;
- offline-first;
- mobile PWA install;
- coach handover AI report.

### Phase 3 — External Integrations

Функции:

- CueScore import;
- snooker.org import;
- CSV/Excel import;
- duplicate matching;
- verification workflow;
- tournament calendar sync;
- external player profile mapping.

### Phase 4 — Advanced AI

Функции:

- AI chat over player history;
- drill effectiveness analysis;
- trend detection;
- plateau detection;
- tournament prep recommendations;
- coach comparison;
- RAG over coach notes;
- long-term development forecasting.

### Phase 5 — Visual / Video / Simulation

Функции:

- advanced table editor;
- animated shot replay;
- ball movement visualization;
- video annotation;
- AI video analysis integration;
- trajectory overlays;
- drill replay;
- future physics engine.

---

## 22. MVP Acceptance Criteria

### 22.1 Training

- Coach can create training session.
- Coach can add drills to session.
- Coach can record attempts.
- Coach can mark success/miss/error.
- Coach can add notes.
- Player dashboard updates after session.

### 22.2 Drill Library

- Admin/coach can create drill.
- Drill can contain table layout.
- Drill has metrics.
- Drill can be reused in sessions.

### 22.3 Table Renderer

- Table is displayed correctly on desktop/tablet/mobile.
- Balls can be positioned.
- Layout can be saved and loaded.
- Layout can be attached to drill.

### 22.4 Match Log

- Match can be created manually.
- Result can be saved.
- Key stats can be added.
- Match appears in player history.

### 22.5 AI

- Weekly summary can be generated.
- AI uses structured player data.
- AI report is saved.
- AI includes period and data sources.
- AI does not make medical claims.

### 22.6 Deployment

- System runs through Docker Compose.
- Web app is accessible through Nginx.
- PostgreSQL persists data.
- Redis works for background jobs.
- File uploads persist after restart.

---

## 23. Non-functional Requirements

### Performance

- dashboard initial load under 3 seconds on normal broadband;
- drill execution action feedback under 200 ms locally;
- offline actions should feel instant;
- API p95 response under 500 ms for normal CRUD.

### Reliability

- daily database backups;
- migration rollback strategy;
- file backup strategy;
- job retry mechanism;
- import logs.

### Maintainability

- modular architecture;
- strict TypeScript;
- documented domain models;
- generated API docs;
- tests for core logic;
- clear seed data.

### Scalability

MVP может быть рассчитан на одного или нескольких игроков.

Архитектура должна позволять расширение до:

- multiple players;
- multiple coaches;
- academy accounts;
- club accounts;
- tournaments;
- paid subscriptions.

---

## 24. Open Questions

Перед финальной версией ТЗ нужно уточнить:

1. Это система сначала для одного игрока или сразу multi-player academy product?
2. Кто владелец данных: игрок/родитель или академия?
3. Нужна ли мультиязычность сразу?
4. Какие языки: EN/RU/PL?
5. Нужно ли сразу делать оплату/subscription?
6. Видео загружаем в MVP или позже?
7. Shot-by-shot mode нужен в MVP или Phase 2?
8. Нужно ли поддерживать live scoring во время матча?
9. Какие внешние источники обязательны в первой версии?
10. Будет ли система использоваться в клубе несколькими тренерами?
11. Нужно ли делать public profile игрока?
12. Нужна ли интеграция с YouTube/streaming в будущем?

---

## 25. Предлагаемый первый backlog

### Epic 1 — Project Setup

- create monorepo;
- configure TypeScript;
- configure ESLint/Prettier;
- configure Docker Compose;
- setup Next.js app;
- setup NestJS API;
- setup PostgreSQL;
- setup Prisma;
- setup Redis;
- setup basic CI.

### Epic 2 — Auth & Roles

- user registration;
- login/logout;
- roles;
- permissions;
- player-coach-parent relationships.

### Epic 3 — Player Profile

- player CRUD;
- profile dashboard;
- coach relation;
- equipment profile.

### Epic 4 — Drill Library

- drill categories;
- drill CRUD;
- drill metrics schema;
- drill table layout;
- drill list/search/filter.

### Epic 5 — Table Renderer

- SnookerTableCanvas;
- ball rendering;
- drag-and-drop;
- save/load JSON;
- target zones;
- shot lines;
- responsive scaling.

### Epic 6 — Training Sessions

- create session;
- add drills;
- record attempts;
- error tags;
- notes;
- finish session;
- session summary.

### Epic 7 — Analytics

- basic dashboard;
- drill progress chart;
- training volume chart;
- pot success trend;
- break building stats.

### Epic 8 — Match Log

- create match;
- add frames;
- key stats;
- match history;
- opponent history.

### Epic 9 — Calendar Factors

- calendar view;
- lifestyle factors;
- supplement events;
- equipment changes;
- coach changes.

### Epic 10 — AI Reports

- weekly summary prompt;
- monthly summary prompt;
- report generation job;
- save AI report;
- report UI.

### Epic 11 — Deployment

- production Dockerfiles;
- Nginx config;
- environment config;
- backup script;
- deployment documentation.

---

## 26. Рекомендуемая стратегия MVP

Не пытаться сразу сделать идеальную AI/video/simulation платформу.

Первый рабочий продукт должен решить главную боль:

> данные тренировок не теряются, прогресс виден, тренер может быстро понять историю игрока.

MVP должен быть сфокусирован на:

- тренировочных сессиях;
- упражнениях;
- метриках;
- ошибках;
- заметках тренера;
- визуальных схемах стола;
- базовой аналитике;
- AI summary;
- coach continuity timeline.

После этого можно развивать:

- импорт матчей;
- advanced AI;
- mobile app packaging;
- video analysis;
- simulation;
- academy mode.

---

## 27. References

Технические источники, полезные для реализации:

- Next.js self-hosting / Docker: https://nextjs.org/docs/app/guides/self-hosting
- Next.js deployment with Docker: https://nextjs.org/docs/app/getting-started/deploying
- Konva / React-Konva: https://konvajs.org/docs/react/index.html
- Konva overview: https://konvajs.org/docs/overview.html
- PixiJS introduction: https://pixijs.com/8.x/guides/getting-started/intro
- Capacitor: https://capacitorjs.com/
- Capacitor docs: https://capacitorjs.com/docs/
- Capacitor Android/iOS setup: https://capacitorjs.com/docs/getting-started
