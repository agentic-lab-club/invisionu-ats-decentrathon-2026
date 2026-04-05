import asyncio
import logging
import re
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import FastAPI, Query
from pydantic import BaseModel

# ─────────────────────────────────────────────
#  Логирование
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("talant")

# ─────────────────────────────────────────────
#  Конфигурация
# ─────────────────────────────────────────────

@dataclass
class Config:
    # Интервал автообновления кэша (секунды)
    refresh_interval: int = 24 * 3600

    # Максимум одновременных запросов к одному источнику
    concurrency_per_source: int = 4

    # Таймаут для одного HTTP-запроса
    request_timeout: int = 20

    # Максимум символов в winner_info
    winner_info_max_len: int = 200

    # Playwright fallback включён?
    use_playwright_fallback: bool = True

    # Заголовок браузера для запросов
    user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )


CFG = Config()

# ─────────────────────────────────────────────
#  Ключевые слова для двойного фильтра
# ─────────────────────────────────────────────

# Слова, связанные с победой / достижением
VICTORY_KEYWORDS: list[str] = [
    "победител", "призёр", "призер", "занял", "заняла",
    "завоевал", "завоевала", "золот", "серебр", "бронз",
    "медаль", "наградил", "награжд", "чемпион",
    "выиграл", "выиграла", "обладатель", "лауреат",
    "первое место", "второе место", "третье место",
    "гран-при", "гран при",
]

# Слова, указывающие на школьника / студента колледжа
SCHOOL_KEYWORDS: list[str] = [
    "школьник", "школьников", "школьниц", "школьная",
    "ученик", "ученица", "учеников", "учащихся", "учащийся",
    "колледж", "колледжа", "колледже", "студент колледж",
    "воспитанник", "воспитанниц",
]

# ─────────────────────────────────────────────
#  Источники
# ─────────────────────────────────────────────
@dataclass
class Source:
    name: str
    base_url: str          # URL первой страницы
    max_pages: int = 5
    # Шаблон для пагинации: {base} и {page} — плейсхолдеры
    pagination_tpl: str = "{base}page/{page}/"
    # Нужен ли Playwright (JS-рендеринг)
    needs_js: bool = False


SOURCES: list[Source] = [
    Source(
        name="Daryn.kz",
        base_url="https://daryn.kz/all-news-press-relis/",
        max_pages=10,
    ),
    Source(
        name="Tengrinews",
        base_url="https://tengrinews.kz/educationscience/",
        max_pages=8,
    ),
    Source(
        name="МОН РК",
        base_url="https://edu.gov.kz/ru/news/",
        max_pages=5,
        pagination_tpl="{base}?page={page}",
    ),
    Source(
        name="Inform.kz",
        base_url="https://www.inform.kz/ru/education",
        max_pages=5,
        pagination_tpl="{base}?page={page}",
    ),
    Source(
        name="Bilim.kz",
        base_url="https://bilim.kz/category/zhetistikter/",
        max_pages=5,
    ),
    Source(
        name="Kazpravda",
        base_url="https://kazpravda.kz/rubrics/obshchestvo/",
        max_pages=4,
    ),
]

# ─────────────────────────────────────────────
#  Regex-паттерны извлечения имён победителей
# ─────────────────────────────────────────────
# Русские имена: Имя Фамилия или Фамилия Имя Отчество
_RU_NAME = r"[А-ЯЁ][а-яё]{1,20}\s+[А-ЯЁ][а-яё]{1,20}(?:\s+[А-ЯЁ][а-яё]{1,20})?"

_WINNER_PATTERNS: list[re.Pattern] = [re.compile(p, re.IGNORECASE | re.UNICODE) for p in [
    # "победитель Иван Иванов"
    rf"(?:победитель|призёр|призер|лауреат|чемпион|обладатель)\s+({_RU_NAME})",
    # "Иван Иванов завоевал золото / стал чемпионом"
    rf"({_RU_NAME})\s+(?:завоевал[аи]?|получил[аи]?|стал[аи]?|занял[аи]?)\s+"
    r"(?:золот\w+|серебр\w+|бронз\w+|медаль|чемпион\w*|первое\s+место)",
    # "наградили Ивана Иванова"
    rf"наградил[иа]?\s+({_RU_NAME})",
    # "Иван Иванов — золото"
    rf"({_RU_NAME})\s+[—–-]\s+(?:золото|серебро|бронза|1-е\s+место|2-е\s+место|3-е\s+место)",
    # "школьник Иван Иванов"
    rf"(?:школьник|ученик|учащийся|студент)\s+({_RU_NAME})",
    # "Иван Иванов из [города/школы]"
    rf"({_RU_NAME})\s+из\s+[А-ЯЁа-яё]",
]]

# ─────────────────────────────────────────────
#  Pydantic-схемы ответов
# ─────────────────────────────────────────────
class NewsItem(BaseModel):
    title: str
    link: str
    source: str
    high_school_student_name: Optional[str] = None
    date: Optional[str] = None
    winner_info: Optional[str] = None  # Имя + достижение (лучшее, что нашли)

class CacheStatus(BaseModel):
    updated_at_utc: Optional[str]
    total: int
    sources_scraped: list[str] = []

class SourceStatus(BaseModel):
    name: str
    base_url: str
    status: str          # "ok" | "error" | "empty" | "pending"
    http_code: Optional[int] = None
    items_found: int = 0
    last_checked: Optional[str] = None
    error: Optional[str] = None

# ─────────────────────────────────────────────
#  Глобальный кэш
# ─────────────────────────────────────────────
NEWS_CACHE: list[NewsItem] = []
LAST_UPDATED_UTC: Optional[str] = None
SCRAPED_SOURCES: list[str] = []

# Персистентный set ссылок — живёт весь uptime процесса.
# Новые статьи добавляются при каждом refresh, уже известные пропускаются —
# это исключает повторный парсинг одних и тех же статей между обновлениями.
SEEN_LINKS: set[str] = set()

# Статус каждого источника по имени — обновляется после каждого scrape.
# Ключ: source.name, инициализируется лениво в _scrape_all и /sources.
SOURCE_STATUSES: dict[str, SourceStatus] = {}

_cache_lock: Optional[asyncio.Lock] = None
_stop_event: Optional[asyncio.Event] = None


def _lock() -> asyncio.Lock:
    global _cache_lock
    if _cache_lock is None:
        _cache_lock = asyncio.Lock()
    return _cache_lock


def _stopper() -> asyncio.Event:
    global _stop_event
    if _stop_event is None:
        _stop_event = asyncio.Event()
    return _stop_event

# ─────────────────────────────────────────────
#  Фильтрация
# ─────────────────────────────────────────────
def _is_relevant(text: str) -> bool:
    """Двойной фильтр: нужны оба критерия — победа И школьник/колледж."""
    t = text.lower()
    return (
        any(kw in t for kw in VICTORY_KEYWORDS)
        and any(kw in t for kw in SCHOOL_KEYWORDS)
    )

# ─────────────────────────────────────────────
#  HTTP-клиент (httpx)
# ─────────────────────────────────────────────
def _make_headers() -> dict:
    return {
        "User-Agent": CFG.user_agent,
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }


async def _fetch_html_httpx(url: str) -> tuple[Optional[str], Optional[int]]:
    """Загружает HTML через httpx. Возвращает (html, http_code)."""
    try:
        async with httpx.AsyncClient(
            timeout=CFG.request_timeout,
            follow_redirects=True,
            headers=_make_headers(),
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text, resp.status_code
    except httpx.HTTPStatusError as exc:
        log.warning("httpx failed [%s]: %s", url, exc)
        return None, exc.response.status_code
    except Exception as exc:
        log.warning("httpx failed [%s]: %s", url, exc)
        return None, None

# ─────────────────────────────────────────────
#  Playwright fallback (опционально)
# ─────────────────────────────────────────────
async def _fetch_html_playwright(url: str) -> Optional[str]:
    """
    JS-рендеринг через Playwright.
    Используется только если httpx вернул < 2000 символов (пустую страницу)
    или явно указан needs_js=True у источника.

    Требует: pip install playwright && playwright install chromium
    """
    try:
        from playwright.async_api import async_playwright  # type: ignore
    except ImportError:
        log.debug("Playwright не установлен, пропускаем fallback.")
        return None

    log.info("🎭 Playwright fallback: %s", url)
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page(user_agent=CFG.user_agent)
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(1500)  # Ждём JS-рендеринг
            content = await page.content()
            await browser.close()
            return content
    except Exception as exc:
        log.warning("Playwright failed [%s]: %s", url, exc)
        return None


async def _fetch_html(url: str, needs_js: bool = False) -> tuple[Optional[str], Optional[int]]:
    """
    Умный загрузчик:
      1. Сначала пробуем httpx (быстро).
      2. Если страница пришла слишком короткой или needs_js=True — Playwright.
    Возвращает (html, http_code).
    """
    html, code = await _fetch_html_httpx(url)

    if CFG.use_playwright_fallback and needs_js:
        html = await _fetch_html_playwright(url) or html

    elif CFG.use_playwright_fallback and html and len(html) < 2000:
        log.info("Страница слишком короткая (%d), пробуем Playwright: %s", len(html), url)
        html = await _fetch_html_playwright(url) or html

    return html, code

# ─────────────────────────────────────────────
#  Извлечение имён победителей из HTML статьи
# ─────────────────────────────────────────────
def _strip_tags(html: str) -> str:
    """Грубое удаление HTML-тегов."""
    return re.sub(r"<[^>]+>", " ", html)


def _extract_winner_name(text: str) -> Optional[str]:
    """
    Пытается найти только имя победителя (без контекста).
    Возвращает первое найденное имя или None.
    """
    plain = text.lower() if len(text) > 1000 else text
    plain = _strip_tags(plain) if "<" in plain else plain
    plain = re.sub(r"\s{2,}", " ", plain)

    for pattern in _WINNER_PATTERNS:
        match = pattern.search(plain)
        if match:
            try:
                name = match.group(1).strip()
                if name and len(name) > 2:
                    return name
            except (IndexError, AttributeError):
                pass
    return None


def _extract_winner_info(html: str, title: str) -> str:
    """
    Пытается найти имя победителя и его достижение в тексте статьи.
    Если ничего не нашли — возвращает заголовок (fallback).
    """
    plain = _strip_tags(html)
    # Убираем лишние пробелы
    plain = re.sub(r"\s{2,}", " ", plain)

    for pattern in _WINNER_PATTERNS:
        match = pattern.search(plain)
        if match:
            # Берём контекст: 60 символов до и 120 после совпадения
            start = max(0, match.start() - 60)
            end = min(len(plain), match.end() + 120)
            snippet = plain[start:end].strip()
            return snippet[: CFG.winner_info_max_len]

    # Fallback — заголовок
    return title[: CFG.winner_info_max_len]


async def _enrich_with_article(
    link: str, title: str, semaphore: asyncio.Semaphore
) -> tuple[Optional[str], str]:
    """
    Загружает статью и извлекает имя победителя и winner_info с учётом семафора.
    Возвращает (student_name, winner_info).
    """
    async with semaphore:
        html, _ = await _fetch_html(link)
    if not html:
        return None, title[: CFG.winner_info_max_len]

    name = _extract_winner_name(html)
    info = _extract_winner_info(html, title)
    return name, info

# ─────────────────────────────────────────────
#  Извлечение даты из текста
# ─────────────────────────────────────────────
_DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2}\.\d{1,2}\.\d{4})\b"),                # 29.11.2025
    re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"),                       # 2025-11-29
    re.compile(r"\b(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|"
               r"июля|августа|сентября|октября|ноября|декабря)\s+\d{4})\b",
               re.IGNORECASE),
]


def _extract_date(text: str) -> Optional[str]:
    for pat in _DATE_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None

# ─────────────────────────────────────────────
#  Парсинг одной страницы источника
# ─────────────────────────────────────────────
async def _scrape_page(
    url: str,
    source: Source,
    semaphore: asyncio.Semaphore,
    global_seen: set[str],          # ← единый seen на все страницы источника
) -> tuple[list[NewsItem], Optional[int]]:
    """
    Парсит одну страницу источника.
    global_seen — общий set[url] для всего источника (и всего приложения),
    новые ссылки добавляются сюда, уже известные пропускаются без HTTP-запроса.
    Возвращает (items, http_code_первой_страницы).
    """
    results: list[NewsItem] = []
    log.info("📡 [%s] Загружаем: %s", source.name, url)

    html, http_code = await _fetch_html(url, needs_js=source.needs_js)
    if not html:
        log.warning("⚠️  [%s] Пустой ответ: %s", source.name, url)
        return results, http_code

    link_pattern = re.compile(
        r'href=["\']([^"\']{10,})["\'][^>]*>\s*([^<]{20,300})\s*<',
        re.DOTALL,
    )

    enrich_tasks: list[tuple[str, str, asyncio.Task, Optional[str]]] = []
    base_domain = f"{urlparse(url).scheme}://{urlparse(url).netloc}"

    for match in link_pattern.finditer(html):
        href = match.group(1).strip()
        title = match.group(2).strip()
        title = re.sub(r"<[^>]+>", "", title).strip()

        if not href.startswith("http"):
            href = urljoin(base_domain, href)

        if len(title) < 20 or not _is_relevant(title):
            continue

        # Пропускаем уже известные ссылки — не делаем повторный HTTP-запрос
        if href in global_seen:
            continue
        global_seen.add(href)

        context = html[max(0, match.start() - 300): match.end() + 300]
        date = _extract_date(context)

        task = asyncio.create_task(_enrich_with_article(href, title, semaphore))
        enrich_tasks.append((title, href, task, date))

    for title, href, task, date in enrich_tasks:
        try:
            student_name, winner_info = await task
        except Exception as exc:
            log.warning("Ошибка обогащения [%s]: %s", href, exc)
            student_name = None
            winner_info = title[: CFG.winner_info_max_len]

        item = NewsItem(
            title=title,
            link=href,
            source=source.name,
            high_school_student_name=student_name,
            date=date,
            winner_info=winner_info,
        )
        results.append(item)
        log.info("  ✓ [%s] %s", source.name, title[:90])

    return results, http_code


# ─────────────────────────────────────────────
#  Парсинг всех страниц одного источника
# ─────────────────────────────────────────────
async def _scrape_source(source: Source) -> list[NewsItem]:
    """
    Парсит все страницы одного источника.
    Использует SEEN_LINKS как глобальный seen — если страница вернула 0 НОВЫХ
    статей (все уже видели), дальнейшая пагинация бессмысленна и останавливается.
    Обновляет SOURCE_STATUSES[source.name] по результату.
    """
    semaphore = asyncio.Semaphore(CFG.concurrency_per_source)
    all_items: list[NewsItem] = []
    last_http_code: Optional[int] = None
    error_msg: Optional[str] = None

    try:
        for page_num in range(1, source.max_pages + 1):
            if page_num == 1:
                url = source.base_url
            else:
                url = source.pagination_tpl.format(
                    base=source.base_url.rstrip("/") + "/",
                    page=page_num,
                )

            # SEEN_LINKS передаём напрямую — _scrape_page добавляет в него новые ссылки
            items, http_code = await _scrape_page(url, source, semaphore, SEEN_LINKS)
            if http_code:
                last_http_code = http_code
            all_items.extend(items)

            if not items:
                log.info("  [%s] Страница %d: новых нет, останавливаемся.", source.name, page_num)
                break

    except Exception as exc:
        error_msg = str(exc)
        log.error("❌ [%s] Неожиданная ошибка: %s", source.name, exc)

    # Определяем финальный статус источника
    if error_msg:
        status_str = "error"
    elif last_http_code and last_http_code >= 400:
        status_str = "error"
    elif not all_items:
        status_str = "empty"
    else:
        status_str = "ok"

    SOURCE_STATUSES[source.name] = SourceStatus(
        name=source.name,
        base_url=source.base_url,
        status=status_str,
        http_code=last_http_code,
        items_found=len(all_items),
        last_checked=datetime.now(timezone.utc).isoformat(),
        error=error_msg,
    )

    return all_items


# ─────────────────────────────────────────────
#  Главная функция сбора данных
# ─────────────────────────────────────────────
async def _scrape_all() -> list[NewsItem]:
    log.info("=" * 60)
    log.info("🚀 Начинаем сбор данных из %d источников (seen=%d)", len(SOURCES), len(SEEN_LINKS))

    # Инициализируем статусы как "pending" перед стартом
    for src in SOURCES:
        if src.name not in SOURCE_STATUSES:
            SOURCE_STATUSES[src.name] = SourceStatus(
                name=src.name, base_url=src.base_url, status="pending"
            )

    source_tasks = [asyncio.create_task(_scrape_source(src)) for src in SOURCES]
    results_nested = await asyncio.gather(*source_tasks, return_exceptions=True)

    all_items: list[NewsItem] = []
    for src, result in zip(SOURCES, results_nested):
        if isinstance(result, Exception):
            log.error("❌ Источник [%s] упал: %s", src.name, result)
            SOURCE_STATUSES[src.name] = SourceStatus(
                name=src.name, base_url=src.base_url,
                status="error", error=str(result),
                last_checked=datetime.now(timezone.utc).isoformat(),
            )
        else:
            log.info("📦 [%s]: +%d новых новостей", src.name, len(result))
            all_items.extend(result)

    # SEEN_LINKS уже содержит все ссылки — дубли невозможны
    log.info("✅ Новых уникальных новостей за этот цикл: %d | Всего в seen: %d",
             len(all_items), len(SEEN_LINKS))
    log.info("=" * 60)
    return all_items


# ─────────────────────────────────────────────
#  Управление кэшем
# ─────────────────────────────────────────────
async def refresh_cache() -> int:
    global LAST_UPDATED_UTC, SCRAPED_SOURCES
    new_items = await _scrape_all()
    async with _lock():
        # Добавляем только новые — в SEEN_LINKS они уже есть, дублей не будет
        NEWS_CACHE.extend(new_items)
        LAST_UPDATED_UTC = datetime.now(timezone.utc).isoformat()
        SCRAPED_SOURCES = [s.name for s in SOURCES]
    return len(NEWS_CACHE)


async def _periodic_refresh_loop():
    while not _stopper().is_set():
        try:
            await refresh_cache()
        except Exception as exc:
            log.error("⚠️  Периодическое обновление упало: %s", exc)
        # Ждём интервал или сигнал остановки
        try:
            await asyncio.wait_for(_stopper().wait(), timeout=CFG.refresh_interval)
        except asyncio.TimeoutError:
            continue


# ─────────────────────────────────────────────
#  FastAPI приложение
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_: FastAPI):
    _stopper().clear()
    task = asyncio.create_task(_periodic_refresh_loop())
    log.info("🎓 TalantParser запущен. Фильтр: победы школьников и студентов колледжей.")
    yield
    _stopper().set()
    task.cancel()
    log.info("👋 TalantParser остановлен.")


app = FastAPI(
    title="TalantParser",
    description=(
        "Агрегатор побед школьников и студентов колледжей Казахстана. "
        "Данные из daryn.kz, tengrinews.kz, edu.gov.kz и других источников."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


@app.get(
    "/",
    response_model=list[NewsItem],
    summary="Список всех релевантных новостей",
)
async def get_news(
    source: Optional[str] = Query(None, description="Фильтр по источнику (например: Daryn.kz)"),
    query: Optional[str] = Query(None, description="Поиск по заголовку или winner_info"),
):
    """
    Возвращает кэшированный список новостей.
    - `source` — фильтр по имени источника
    - `query`  — полнотекстовый поиск по заголовку и winner_info
    """
    if not NEWS_CACHE:
        await refresh_cache()

    items = list(NEWS_CACHE)

    if source:
        items = [i for i in items if source.lower() in i.source.lower()]

    if query:
        q = query.lower()
        items = [
            i for i in items
            if q in i.title.lower() or (i.winner_info and q in i.winner_info.lower())
        ]

    return items


@app.post(
    "/refresh",
    response_model=CacheStatus,
    summary="Принудительное обновление кэша",
)
async def refresh_now():
    """Запускает немедленный парсинг всех источников."""
    total = await refresh_cache()
    return CacheStatus(
        updated_at_utc=LAST_UPDATED_UTC,
        total=total,
        sources_scraped=SCRAPED_SOURCES,
    )


@app.get(
    "/status",
    response_model=CacheStatus,
    summary="Статус кэша",
)
async def status():
    """Возвращает время последнего обновления и количество новостей в кэше."""
    return CacheStatus(
        updated_at_utc=LAST_UPDATED_UTC,
        total=len(NEWS_CACHE),
        sources_scraped=SCRAPED_SOURCES,
    )


@app.get("/health", summary="Проверка работоспособности")
async def health():
    return {
        "status": "ok",
        "cache_size": len(NEWS_CACHE),
        "seen_links_total": len(SEEN_LINKS),
        "last_updated": LAST_UPDATED_UTC,
    }


@app.get(
    "/sources",
    response_model=list[SourceStatus],
    summary="Статус каждого источника",
)
async def get_sources():
    """
    Возвращает для каждого источника:
    - name       — название
    - base_url   — корневой URL
    - status     — ok | empty | error | pending
    - http_code  — HTTP-код последнего запроса (404, 200, None если таймаут)
    - items_found — сколько новых статей найдено в последнем цикле
    - last_checked — время последней проверки (UTC ISO)
    - error      — текст ошибки (если есть)
    """
    # Убеждаемся, что все источники присутствуют в словаре
    for src in SOURCES:
        if src.name not in SOURCE_STATUSES:
            SOURCE_STATUSES[src.name] = SourceStatus(
                name=src.name, base_url=src.base_url, status="pending"
            )
    return list(SOURCE_STATUSES.values())


# ─────────────────────────────────────────────
#  Локальный запуск
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)