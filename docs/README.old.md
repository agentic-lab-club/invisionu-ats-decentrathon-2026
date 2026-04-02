# InvisionU-ATS-decentrathon-2026 (Intelligent Candidate Selection Support System) (ATS - Applicant Tracking System)

Проект — это создание интеллектуальной системы поддержки отбора в inVision U.
Продукт — это объяснимый AI-инструмент для приёмной комиссии, который анализирует данные кандидатов, выявляет лидерский потенциал, мотивацию и траекторию роста, формирует score/shortlist и помогает принимать более качественные решения.
В нашем решение мы использовали провайдера Groq для моделей STT + LLM Ranking и OpenAi для RAG телеграм бота, также ![здесь](ссылка на репу) вы можете посмотреть реализацию на локальных моделей
---

> Техническое Задание RUS [/docs/Задача AI inDrive inVision U РУС - Decentrathon 5.0.pdf](/docs/Задача%20AI%20inDrive%20inVision%20U%20РУС%20-%20Decentrathon%205.0.pdf)

> Technical Requirement ENG [/docs/Case AI inDrive inVision U ENG - Decentrathon 5.0.pdf](/docs/Case%20AI%20inDrive%20invision%20U%20ENG%20-%20Decentrathon%205.0.pdf)

---

## Подход к скорингу

Наша модель подсчета объединяет два независимых потока данных: **оценку транскрипции видеоинтервью (Verbal Features)** и **SJT-алгоритмику (Situational Judgment Test)**.

> **Зачем нужен тест (SJT)?**  
> Тестирование позволяет стандартизировать оценку лидерского потенциала, делая ее более надежной и объяснимой по сравнению с классическими эссе или неструктурированными интервью. Исследования [\[1\]](https://doi.org/10.1007/s11934-022-01115-8), [\[2\]](https://psycnet.apa.org/fulltext/2024-74447-001.html) показывают, что традиционные методы часто подвержены субъективности (bias), влиянию коучинга и плагиата. В то же время психологические опросники и SJT гораздо точнее измеряют non-cognitive навыки — ответственность, умение работать в команде и ценностные ориентации — в формате, который можно объективно валидировать.

> **Почему мы фокусируемся на анализе текста (Verbal Features)?**  
> При машинном анализе видеоинтервью критически важно, чтобы задаваемые вопросы провоцировали кандидатов на проявление конкретных личностных черт (trait-relevant). Исследования доказывают, что именно текстовые (verbal) признаки несут наибольшую информативность и объяснимость по сравнению с чисто визуальными (visual) или звуковыми (audio) данными [\[4\]](https://link.springer.com/article/10.1007/s12193-012-0101-0).
>
> Более того, в исследовании [\[9\]](https://www.sciencedirect.com/science/article/pii/S074756322300479X) суммарная мультимодальная модель (text + audio + video) объясняла `R² = 0.44` успешности интервью. Однако львиную долю этой дисперсии закрывали именно текстовые фичи (`R² = 0.38`), тогда как аудио (`R² = 0.33`) и визуальные признаки (`R² = 0.19`) давали либо минимальный, либо нулевой прирост.
> 
> *«The verbal modality explained almost all of the variance of observer-reported personality traits and interview performance, and adding audio and visual features lead to small (or no) increase of the total explained variance.»* [\[9\]](https://www.sciencedirect.com/science/article/pii/S074756322300479X) 

### Алгоритмика общего подсчета (Fusion Score)

Финальный рейтинг кандидата формируется путем слияния (fusion) нормализованных результатов ситуационного теста (SJT) и LLM-оценки транскрипции интервью для каждой из пяти осей (M, P, R, L, V). 
Поскольку LLM оценивает навыки по шкале от 1 до 4, её результат умножается на 25 для приведения к общей 100-балльной шкале.

Для большинства осей (M, P, R, L) вес LLM-оценки (анализ прямой речи кандидата и реальных поведенческих примеров) составляет 55%, а вес теста (ответы на стандартизированные ситуации) — 45%, так как прямая речь обладает большей прогностической валидностью. Исключением является ось ценностей V (Values / Honesty-Humility), где вес теста выше (55%), поскольку структурированные психологические опросники исторически лучше выявляют этические установки.

Формулы слияния по каждой оси выглядят следующим образом:
- **Мотивация (M)**: $0.45 \cdot Test_M + 0.55 \cdot (LLM_M \cdot 25)$
- **Планирование (P)**: $0.45 \cdot Test_P + 0.55 \cdot (LLM_P \cdot 25)$
- **Стрессоустойчивость (R)**: $0.45 \cdot Test_R + 0.55 \cdot (LLM_R \cdot 25)$
- **Лидерство (L)**: $0.45 \cdot Test_L + 0.55 \cdot (LLM_L \cdot 25)$
- **Ценности (V)**: $0.55 \cdot Test_V + 0.45 \cdot (LLM_V \cdot 25)$

После вычисления гибридных баллов по каждой из осей (от 0 до 100), рассчитывается единый финальный скор кандидата (Final Score) через взвешенную сумму:
$Final\_Score = \omega_M \cdot M + \omega_P \cdot P + \omega_R \cdot R + \omega_L \cdot L + \omega_V \cdot V$

Динамические веса осей ($\omega$) являются "умными фильтрами" и адаптируются в зависимости от выбранного режима ранжирования профиля (например, упор на лидерские качества `balanced_leader` или смещение фокуса на другие оси). Подробнее см. [Questions & Scoring Reference](docs/Questions_and_Scoring_Reference.md#final-ranking-modes).



## Стоимость API-решения

На обработку одной заявки требуется 7 запросов к API провайдера, что в среднем составляет около 11.7 тыс. токенов. Итоговая стоимость анализа одного кандидата составляет всего **$0.002**. Таким образом, бюджет в **$1** позволяет полностью обработать заявки **500 потенциальных абитуриентов**.

<img src="docs/images/llm_compare/gpt_oss_requests.png"  width="54%" height="auto"> <img src="docs/images/llm_compare/gpt_oss_tokens.png" width="45%" height="auto">

<img src="docs/images/llm_compare/gpt_oss_price.png" style="margin-left: 20%;" width="60%" height="auto"> 

## Architecture

> ARCHITECTURE.md check this file for detailed architecture.

### C4 Diagram (Container Diagram)

![](docs/images/architecture/c4-container-diagram.png)

### ERD (Entity-Relationship Diagram, of Golang Backend Postgres Database)

![](docs/images/architecture/erd-database-tables-schema.png) 

## Monorepo Services

1) Frontend
2) Backend (Golang)
    - Swagger/OpenAPI (docs/API-Specs.md files)
    - (не нужно) Authorization/Authentication (Redis???)
    - Roles: Client (Абитуриент, Школьник, Студент который падается на Грант), Moderator (Приемная Коммисия, Сотрудник, Админ панелька)
3) PostgreSQL
    - ERD
4) LLM scoring (Scoring) (Groq/ChatGPT API or Local Model)
5) Telegram Bot (RAG-based University Admission AI Chatbot) (Aiogram, Python)
6) LLM (Telegram Bot) (Groq/ChatGPT API or Local Model)
7) RAG (Telegram Bot) (Find Embedding Model/Database, may be PgVector package)
8) Speech-To-Text (OpenAI Whisper vs AWS Transcribe)
9) Infrastructure (DevOps)
    - Yandex Cloud vs AWS
    - Teraform, Ansible (IaC)
    - Domen Name, Cloudflare, Traefik
10) Security
    - Антиплагиат (NoGPT, проверка на использование GPT и LLM моделей)
    - Protect your ATS from AI manipulation (Prompt Injection Defense) (Hidden Text Detection) (Clean Data Guarantee)

### Frontend

Frontend-панель реализована на **Next.js** (React). Интерфейс спроектирован так, чтобы одинаково хорошо решать задачи двух основных групп пользователей:
- **Client (Кандидаты/Абитуриенты):** Понятный пошаговый интерфейс для подачи заявок, прохождения ситуационного теста (SJT) и записи/загрузки видеоинтервью.
- **Moderator (Приемная комиссия):** Полноценная ATS-панель (Applicant Tracking System). Позволяет сортировать кандидатов, использовать "умные фильтры" для изменения весов осей (M, P, R, L, V) под конкретные требования программы, а также детально изучать карточку кандидата с аналитикой и резюме от LLM.

[ ] скриншоты и demo videos

![](docs/demos/demo-01-frontend-v1-28-03-2026.gif)

---

![](docs/demos/demo-02-frontend-v1-28-03-2026.gif)

---

![](docs/demos/demo-03-frontend-v1-28-03-2026.gif)

### Backend

Основной сервер написан на **Go (Golang)** и спроектирован с учетом масштабируемости (clean architecture).

Ключевые функции и особенности:
- **База данных:** Использование **PostgreSQL** в качестве надежного хранилища профилей, результатов прохождения тестов, транскрипций интервью и сформированных LLM оценок.
- **Ролевая модель:** Поддержка нескольких уровней доступа: *Студенты* (Clients) сдают тесты и загружают заявки, а *Сотрудники комиссии* (Moderators) видят административную панель и проводят отбор.
- **Оркестрация микросервисов:** Выступает как центральный хаб, оркестрирующий асинхронные вызовы к микросервисам транскрибации (Speech-To-Text / Whisper) и скоринга (LLM Scoring).
- **Открытый API:** АПИ полностью задокументировано через **Swagger (OpenAPI)**, что облегчает работу фронтенду и тестировщикам.

Пример документации (Swagger UI):

![](docs/images/backend-api-docs-swagger.jpeg)

### Infrastructure

[ ] сделать
[ ] описание
[ ] скриншоты

### LLM Scoring

Сервис анализа и скоринга кандидатов — это независимый микросервис, написанный на Python (FastAPI). Он отвечает за приём транскрибированного текста интервью (STT) и его обработку с помощью LLM для извлечения конкретных поведенческих характеристик и лидерского потенциала.

Ключевые особенности конвейера:
- **Zero-Shot / Few-Shot экстракция**: использование LLM для оценки текста по заданным критериям без необходимости собирать собственный огромный датасет.
- **Структурированный ответ**: результаты всегда возвращаются в строгом JSON-формате, включая разбивку по вопросам, оценку по каждой категории (1-4 балла) и обоснование (reasoning).
- **Разделение промптов**: анализ каждого вопроса происходит через отдельный, персонализированный системный промпт, что снижает уровень галлюцинаций модели и повышает стабильность оценки.

Сервис легко разворачивается через Docker и доступен по API, что позволяет интегрировать его напрямую в основной Backend.

```plantuml
Speech / video
    ↓
STT → текст
    ↓
LLM / rules evaluator
    ↓
Scoring engine
    ↓
JSON результат
    ↓
UI / API / DB
```

## V1
```plantuml
   STT 
    ↓
Общий промпт
    ↓
   Json
```


В версии V1 применялось оценочное решение на основе одного общего промпта. Из-за этого использование более легких моделей (< 70B) могло приводить к меньшей точности и большему разбросу при оценивании «сложных» кандидатов (например, красноречивых, но не приводящих реальных примеров, в противовес стеснительным, но целеустремленным кандидатам с лидерскими качествами).
![](docs/images/llm_compare/image_score.png)


## V2
```plantuml
   STT 
    ↓
LLM-парсер по вопросам
    ↓
Анализ каждого вопроса отдельным персонализированным промптом
    ↓
Подсчёт баллов по каждой категории
    ↓
   JSON
```
Во второй версии стабильность модели значительно возросла за счет персонализации. Разница в оценивании между разными LLM-моделями теперь сводится лишь к их внутреннему смещению (bias), что гарантирует более объективное и точное сравнение кандидатов между собой. 

Кроме того, мы перешли от 100-балльной системы оценки к жестко заданной 4-балльной шкале (1-4). Это позволило исключить приблизительные результаты (если в V1 модель могла колебаться и ставить одному и тому же кандидату от 70 до 80 баллов, то в V2 каждый балл определен детерминированно). В промпте теперь четко прописаны критерии для выставления каждой конкретной оценки. Пример промпта: [Prompt](llm/prompts/q5_prompt.txt) 

![](docs/images/llm_compare/image_score_v2.png)


![](docs/images/llm_compare/price_list.png)

### Speech-To-Text (STT)

Для транскрибации аудио- и видеоответов кандидатов мы используем модель **Whisper (`whisper-large-v3-turbo`)**. 
Эта модель обеспечивает высокоточное распознавание текста, устойчива к фоновому шуму, сильным акцентам и грамматическим ошибкам в речи. Это критически важно, поскольку последующее оценивание LLM фокусируется на смысловом содержании ответа кандидата, а не на безупречности его английского языка или произношения.

Мы также провели сравнение с более тяжелой моделью `whisper-large-v3`. Поскольку качество транскрибации в наших тестах отличалось незначительно, мы сделали выбор в пользу `turbo`-версии как более оптимальной с точки зрения соотношения скорости и стоимости обработки.

![ ](docs/images/whisper/stt_price.png)

### Тест (SJT — Situational Judgment Test)

Система подсчета результатов ситуационного тестирования (SJT) базируется на накоплении баллов по пяти ключевым осям, отражающим лидерский потенциал и поведенческие характеристики кандидата:

- **M** (Motivation) — уровень внутренней мотивации и стремление к достижению целей;
- **P** (Planning) — навык стратегического планирования будущего и целеполагания;
- **R** (Resilience) — стрессоустойчивость и адаптивность в нестандартных или сложных ситуациях;
- **L** (Leadership) — способность вести за собой, управлять групповой динамикой и выстраивать стратегии;
- **V** (Values) — соответствие корпоративным и этическим ценностям (включая фактор «Honesty-Humility» — честность и скромность).

Каждый ответ на один из 40 вопросов теста имеет определенный вес для каждой из представленных осей. После прохождения тестирования вычисляется «сырой» балл (сумма весов выбранных ответов). Затем он нормализуется по шкале от 0 до 100 на основе максимально возможных баллов для каждого вопроса. Полученные результаты интегрируются с оценками от LLM-модели (на основе транскрипции интервью) для формирования итогового рейтинга кандидата. 

Общий балл рассчитывается по формуле:

```math
Final\_Score = \omega_M \cdot M + \omega_P \cdot P + \omega_R \cdot R + \omega_L \cdot L + \omega_V \cdot V
```

Где веса $\omega$ задаются в процентах и адаптируются в зависимости от выбранных фильтров вакансии. Подробнее: [Режимы финального ранжирования](docs/Questions_and_Scoring_Reference.md#final-ranking-modes).

При доработке вопросов и алгоритмов скоринга мы опирались на следующие академические исследования:
1. [Evaluating the Whole Applicant: Use of Situational Judgment Testing and Personality Testing to Address Disparities in Resident Selection](https://doi.org/10.1007/s11934-022-01115-8)
2. [Personality and Leadership: Meta-Analytic Review of Cross-Cultural Moderation, Behavioral Mediation, and Honesty-Humility](https://psycnet.apa.org/fulltext/2024-74447-001.html)
3. [A Nonverbal Behavior Approach to Identify Emergent Leaders in Small Groups](https://www.researchgate.net/publication/312996139_A_Nonverbal_Behavior_Approach_to_Identify_Emergent_Leaders_in_Small_Groups)

### Telegram Bot (RAG-based University Admission AI Chatbot)

- **Телеграм-бот для приёмной комиссии**: который отвечает на вопросы о процессе поступления, требованиях и т.д., используя RAG (Retrieval-Augmented Generation) для получения актуальной информации из базы знаний.
- Поток работы:
  1. Пользователь задает вопрос в Telegram.
  2. Бот отправляет запрос в нашу систему.
  3. наша систему извлекает релевантные документы из ChromoDb и формирует ответ с помощью LLM
  4. Бот возвращает ответ пользователю в Telegram.

![](docs/images/tg-rag-chatbot-screenshot-01.jpg)



### База исследований

Для анализа проблемы и разработки оптимальных метрик, коррелирующих с лидерским потенциалом, мы опирались на следующие академические исследования:

[1] [Evaluating the Whole Applicant: Use of Situational Judgment Testing and Personality Testing to Address Disparities in Resident Selection](https://doi.org/10.1007/s11934-022-01115-8)

[2] [Personality and Leadership: Meta-Analytic Review of Cross-Cultural Moderation, Behavioral Mediation, and Honesty-Humility](https://psycnet.apa.org/fulltext/2024-74447-001.html)

[3]  [A Nonverbal Behavior Approach to Identify Emergent Leaders in Small Groups](https://www.researchgate.net/publication/312996139_A_Nonverbal_Behavior_Approach_to_Identify_Emergent_Leaders_in_Small_Groups)

[4] [Emergent leaders through looking and speaking: from audio-visual data to multimodal recognition](https://link.springer.com/article/10.1007/s12193-012-0101-0)

[5] [Emotional intelligence, leadership, and work teams: A hybrid literature review](https://doi.org/10.1016/j.heliyon.2023.e20356)

[6] [Personality and Leadership: A Qualitative and Quantitative Review](https://pubmed.ncbi.nlm.nih.gov/12184579/)

[7] [Toward a theory of individual differences and leadership: understanding the motivation to lead](https://pubmed.ncbi.nlm.nih.gov/11419808/)

[8] [Leadership Traits Required for International Organizational Success in the Digital Era](https://opus.fhv.at/frontdoor/deliver/index/docId/4276/file/Leadership_Traits.pdf)

[9] [Beyond traditional interviews: Psychometric analysis of asynchronous video interviews for personality and interview performance evaluationusing machine learning](https://www.sciencedirect.com/science/article/pii/S074756322300479X)

