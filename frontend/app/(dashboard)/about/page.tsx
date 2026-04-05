'use client';

import { useState } from 'react';
import {
  Info, ChevronRight, ChevronDown,
  Cpu, Shield, Layers, DollarSign,
  BarChart2, MessageSquare, BookOpen,
  GitBranch, ArrowRight, ExternalLink,
  Zap, Database, Globe,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id: 'about',        title: 'О проекте',              icon: Info       },
  { id: 'scoring',      title: 'Подход к скорингу',       icon: BarChart2  },
  { id: 'evolution',    title: 'Эволюция LLM (V1 → V2)',  icon: GitBranch  },
  { id: 'stack',        title: 'Сервисы и стек',          icon: Layers     },
  { id: 'security',     title: 'Безопасность данных',     icon: Shield     },
  { id: 'cost',         title: 'Стоимость решения',       icon: DollarSign },
  { id: 'stt',          title: 'Speech-To-Text',          icon: Cpu        },
  { id: 'tgbot',        title: 'Telegram RAG-бот',        icon: MessageSquare },
  { id: 'research',     title: 'Исследовательская база',  icon: BookOpen   },
];

const SERVICES = [
  { module: 'frontend/',       desc: 'ATS-интерфейс для кандидатов и комиссии',          tech: 'Next.js, React' },
  { module: 'backend/',        desc: 'Core API, бизнес-логика, оркестрация',             tech: 'Go, PostgreSQL' },
  { module: 'llm/',            desc: 'Интервью-скоринг и поведенческие признаки',        tech: 'Python, FastAPI, LLM' },
  { module: 'STT/',            desc: 'Транскрибация аудио/видео интервью',               tech: 'Whisper' },
  { module: 'tg_bot_rag/',     desc: 'Телеграм-бот с retrieval-поиском',                 tech: 'Python, Aiogram, RAG' },
  { module: 'infrastructure/', desc: 'IaC и облачная инфраструктура',                    tech: 'Terraform, DevOps' },
];

const RESEARCH = [
  { n: 1,  title: 'Evaluating the Whole Applicant: Use of Situational Judgment Testing…',  url: 'https://doi.org/10.1007/s11934-022-01115-8' },
  { n: 2,  title: 'Personality and Leadership: Meta-Analytic Review…',                     url: 'https://psycnet.apa.org/fulltext/2024-74447-001.html' },
  { n: 3,  title: 'A Nonverbal Behavior Approach to Identify Emergent Leaders…',           url: 'https://www.researchgate.net/publication/312996139' },
  { n: 4,  title: 'Emergent leaders through looking and speaking: multimodal recognition', url: 'https://link.springer.com/article/10.1007/s12193-012-0101-0' },
  { n: 5,  title: 'Emotional intelligence, leadership, and work teams: hybrid review',     url: 'https://doi.org/10.1016/j.heliyon.2023.e20356' },
  { n: 6,  title: 'Personality and Leadership: A Qualitative and Quantitative Review',     url: 'https://pubmed.ncbi.nlm.nih.gov/12184579/' },
  { n: 7,  title: 'Toward a theory of individual differences and leadership…',             url: 'https://pubmed.ncbi.nlm.nih.gov/11419808/' },
  { n: 8,  title: 'Leadership Traits Required for International Organizational Success…',  url: 'https://opus.fhv.at/frontdoor/deliver/index/docId/4276/file/Leadership_Traits.pdf' },
  { n: 9,  title: 'Beyond traditional interviews: Psychometric analysis of async video interviews…', url: 'https://www.sciencedirect.com/science/article/pii/S074756322300479X' },
];

const AXES = [
  { key: 'M', label: 'Motivation',  desc: 'Уровень внутренней мотивации и стремление к достижению целей' },
  { key: 'P', label: 'Planning',    desc: 'Навык стратегического планирования и целеполагания' },
  { key: 'R', label: 'Resilience',  desc: 'Стрессоустойчивость и адаптивность в нестандартных ситуациях' },
  { key: 'L', label: 'Leadership',  desc: 'Способность вести за собой, управлять групповой динамикой' },
  { key: 'V', label: 'Values',      desc: 'Соответствие корпоративным и этическим ценностям (Honesty-Humility)' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-3.5 h-3.5 text-gray-300" />
      <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{title}</p>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[#b5e220] bg-[#b5e220]/4 rounded-r-lg px-4 py-3 text-sm text-gray-600 leading-relaxed">
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-500">
      {children}
    </span>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 font-mono text-sm text-gray-700 overflow-x-auto">
      {children}
    </div>
  );
}

// ── Collapsible card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  id, icon: Icon, title, defaultOpen = false, children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5 text-gray-300" />
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{title}</p>
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        }
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-50">{children}</div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            inVision University
          </p>
          <h1 className="text-xl font-semibold text-gray-900">About the Project</h1>
          <p className="text-sm text-gray-400 mt-0.5">InvisionU ATS — Intelligent Candidate Selection Support System</p>
        </div>
        <a
          href="https://github.com/agentic-lab-club/invisionu-ats-decentrathon-2026"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
        >
          <Globe className="w-3 h-3" />
          GitHub
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* ── TOC ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Содержание</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group"
            >
              <Icon className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#8aaa18] transition-colors flex-shrink-0" />
              <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">{title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── About ── */}
      <CollapsibleCard id="about" icon={Info} title="О проекте" defaultOpen>
        <div className="pt-4 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            AI-платформа для приёмной комиссии inVision U: система анализирует данные кандидатов,
            оценивает лидерский потенциал, формирует объяснимый score для более качественного отбора.
          </p>
          <div className="space-y-2">
            {[
              'Кандидат проходит SJT-тест и видеоинтервью.',
              'STT-модуль преобразует речь видеоинтервью в текст.',
              'LLM scoring оценивает ответы по поведенческим критериям.',
              'Система объединяет SJT + LLM в единый финальный score.',
              'Комиссия работает в ATS-панели с фильтрами и аналитикой.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#b5e220]/20 text-[10px] font-bold text-[#8aaa18] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-600">{step}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'STT + LLM Ranking', provider: 'Groq', icon: Zap },
              { label: 'RAG Telegram Bot',  provider: 'OpenAI', icon: Database },
            ].map(({ label, provider, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                <Icon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">{provider}</p>
                  <p className="text-[11px] text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="/docs/Задача AI inDrive inVision U РУС - Decentrathon 5.0.pdf" target="_blank"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#8aaa18] transition-colors">
              <ExternalLink className="w-3 h-3" /> ТЗ (RUS)
            </a>
            <span className="text-gray-200">·</span>
            <a href="/docs/Case AI inDrive inVision U ENG - Decentrathon 5.0.pdf" target="_blank"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#8aaa18] transition-colors">
              <ExternalLink className="w-3 h-3" /> Technical Requirement (ENG)
            </a>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Scoring ── */}
      <CollapsibleCard id="scoring" icon={BarChart2} title="Подход к скорингу">
        <div className="pt-4 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Модель подсчёта объединяет два независимых потока: <strong className="text-gray-700">оценку транскрипции
            видеоинтервью (Verbal Features)</strong> и <strong className="text-gray-700">SJT-алгоритмику</strong>.
          </p>

          {/* Axes */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Оси оценки</p>
            <div className="space-y-2">
              {AXES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="w-6 h-6 rounded-md bg-[#b5e220] text-[11px] font-black text-gray-900 flex items-center justify-center flex-shrink-0">
                    {key}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{label}</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fusion */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Fusion Score</p>
            <Callout>
              Для осей M, P, R, L — вес LLM-оценки <strong>55%</strong>, вес теста <strong>45%</strong>.
              Для оси V (Values / Honesty-Humility) — вес теста <strong>55%</strong>, вес LLM <strong>45%</strong>.
            </Callout>
            <div className="mt-3 space-y-1">
              {['M', 'P', 'R', 'L'].map(ax => (
                <Formula key={ax}>
                  {ax}: 0.45 · Test_{ax} + 0.55 · (LLM_{ax} · 25)
                </Formula>
              ))}
              <Formula>V: 0.55 · Test_V + 0.45 · (LLM_V · 25)</Formula>
            </div>
          </div>

          {/* Final score */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Финальный балл</p>
            <Formula>
              Final_Score = ω_M·M + ω_P·P + ω_R·R + ω_L·L + ω_V·V
            </Formula>
            <p className="text-xs text-gray-400 mt-1">
              Веса ω адаптируются режимом ранжирования (smart filters).
            </p>
          </div>

          {/* Research callout */}
          <Callout>
            <em>«The verbal modality explained almost all of the variance of observer-reported personality
            traits and interview performance, and adding audio and visual features lead to small (or no)
            increase of the total explained variance.»</em>
            {' '}
            <a href="https://www.sciencedirect.com/science/article/pii/S074756322300479X"
              target="_blank" rel="noopener noreferrer"
              className="text-[#8aaa18] hover:underline">[9]</a>
          </Callout>
        </div>
      </CollapsibleCard>

      {/* ── LLM Evolution ── */}
      <CollapsibleCard id="evolution" icon={GitBranch} title="Эволюция LLM scoring (V1 → V2)">
        <div className="pt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* V1 */}
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-bold text-gray-500">V1</span>
                <p className="text-sm font-semibold text-gray-700">Общий промпт</p>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                {['STT', 'Общий промпт', 'JSON'].map((step, i, arr) => (
                  <div key={step} className="flex flex-col items-center gap-1">
                    <span className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg">{step}</span>
                    {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 rotate-90" />}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-red-400 mt-3 leading-relaxed">
                Лёгкие модели (&lt;70B) давали большой разброс при оценке «сложных» кандидатов.
              </p>
            </div>
            {/* V2 */}
            <div className="rounded-xl border border-[#b5e220]/40 bg-[#b5e220]/3 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-md bg-[#b5e220]/20 text-[11px] font-bold text-[#6b8c14]">V2</span>
                <p className="text-sm font-semibold text-gray-700">Персонализированные промпты</p>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                {['STT', 'LLM-парсер по вопросам', 'Анализ каждого вопроса', 'Подсчёт по категориям', 'JSON'].map((step, i, arr) => (
                  <div key={step} className="flex flex-col items-center gap-1">
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-lg">{step}</span>
                    {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 rotate-90" />}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#6b8c14] mt-3 leading-relaxed">
                4-балльная шкала (1–4) вместо 100-балльной. Каждый балл детерминирован.
              </p>
            </div>
          </div>
          <Callout>
            Разница в оценивании между разными LLM теперь сводится лишь к их внутреннему bias,
            что гарантирует объективное сравнение кандидатов между собой.
          </Callout>
        </div>
      </CollapsibleCard>

      {/* ── Stack ── */}
      <CollapsibleCard id="stack" icon={Layers} title="Сервисы и стек">
        <div className="pt-4">
          <div className="divide-y divide-gray-50">
            {SERVICES.map(({ module, desc, tech }) => (
              <div key={module} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2.5 min-w-0">
                  <code className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
                    {module}
                  </code>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
                <Badge>{tech}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Security ── */}
      <CollapsibleCard id="security" icon={Shield} title="Безопасность данных">
        <div className="pt-4 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Для минимизации риска утечки персональных данных через внешних API-провайдеров
            подготовлена отдельная ветка с <strong className="text-gray-700">локальным инференсом</strong> моделей.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#b5e220]" />
                <p className="text-xs font-semibold text-gray-700">local_llm</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Обезличивание данных не используется — обработка выполняется локально,
                данные остаются внутри инфраструктуры команды.
              </p>
              <a href="https://github.com/agentic-lab-club/invisionu-ats-decentrathon-2026/tree/local_llm"
                target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-[11px] text-[#8aaa18] hover:underline">
                <ExternalLink className="w-3 h-3" /> GitHub ветка local_llm
              </a>
            </div>
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs font-semibold text-gray-700">main (API)</p>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Рекомендуется обязательное обезличивание персональных данных
                перед отправкой в LLM/STT.
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                Использовать: Microsoft Presidio
              </p>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Cost ── */}
      <CollapsibleCard id="cost" icon={DollarSign} title="Стоимость API-решения">
        <div className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'API-запросов',   value: '7',      sub: 'на кандидата' },
              { label: 'Токенов',        value: '~11.7K', sub: 'на кандидата' },
              { label: 'Стоимость',      value: '$0.002', sub: 'полный анализ' },
              { label: 'Заявок за $1',   value: '≈ 500',  sub: 'обработанных' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">{label}</p>
                <p className="text-[11px] text-gray-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── STT ── */}
      <CollapsibleCard id="stt" icon={Cpu} title="Speech-To-Text">
        <div className="pt-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <code className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded-lg">
              whisper-large-v3-turbo
            </code>
            <span className="text-xs text-gray-400">via Groq</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Высокоточное распознавание текста, устойчиво к фоновому шуму, сильным акцентам
            и грамматическим ошибкам в речи. LLM-оценка фокусируется на смысловом содержании,
            а не на безупречности произношения.
          </p>
          <Callout>
            Сравнение с <code className="text-xs">whisper-large-v3</code> показало незначительную разницу
            в качестве транскрибации — выбрана <code className="text-xs">turbo</code>-версия как более
            оптимальная по соотношению скорости и стоимости.
          </Callout>
        </div>
      </CollapsibleCard>

      {/* ── TG Bot ── */}
      <CollapsibleCard id="tgbot" icon={MessageSquare} title="Telegram RAG-бот">
        <div className="pt-4 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Телеграм-бот для приёмной комиссии отвечает на вопросы о процессе поступления,
            требованиях и т.д., используя RAG (Retrieval-Augmented Generation) для получения
            актуальной информации из базы знаний.
          </p>
          <div className="space-y-2">
            {[
              'Пользователь задаёт вопрос в Telegram.',
              'Бот отправляет запрос в нашу систему.',
              'Система извлекает релевантные документы из ChromaDB и формирует ответ с помощью LLM.',
              'Бот возвращает ответ пользователю в Telegram.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-500">{step}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge>Python</Badge>
            <Badge>Aiogram</Badge>
            <Badge>ChromaDB</Badge>
            <Badge>OpenAI</Badge>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Research ── */}
      <CollapsibleCard id="research" icon={BookOpen} title="Исследовательская база">
        <div className="pt-4 space-y-1.5">
          {RESEARCH.map(({ n, title, url }) => (
            <a
              key={n}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#b5e220]/20 group-hover:text-[#8aaa18] transition-colors">
                {n}
              </span>
              <p className="text-sm text-gray-500 group-hover:text-gray-700 leading-relaxed transition-colors flex-1">
                {title}
              </p>
              <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#8aaa18] flex-shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      </CollapsibleCard>

      {/* ── Footer note ── */}
      <p className="text-center text-[11px] text-gray-300 pb-4">
        InvisionU ATS · Decentrathon 5.0 · agentic-lab-club
      </p>
    </div>
  );
}