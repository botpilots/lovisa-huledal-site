import './style.css'
import { animateAboutLayout } from './about-layout-animation'
import { marked } from 'marked'
import home from '../content/home.json'

type Language = 'sv' | 'en'

interface MosaicImage {
  image: string
  offsetX?: number
  offsetY?: number
  alt?: string
}

interface HomeContent {
  biography: string
  biographyEn: string
  aboutMosaic: MosaicImage[]
}

interface ProgrammeRepertoireEntry {
  composer: string
  piece: string
}

interface ProgrammeImage {
  image?: string
  offsetX?: number
  offsetY?: number
}

interface Programme {
  title: string
  headerColor?: string
  description: string
  images?: (string | ProgrammeImage)[]
  /** @deprecated Legacy single image — use `images` list */
  image?: ProgrammeImage
  repertoire?: ProgrammeRepertoireEntry[]
}

/** Theme sand palette (sand-500 … sand-900) for programmes without a CMS colour. */
const PROGRAMME_HEADER_PALETTE = [
  '#b09a76',
  '#a28661',
  '#886d4e',
  '#715b43',
  '#5c4b38',
] as const

interface ProgrammeEntry {
  path: string
  programme: Programme
}

interface Event {
  date: string
  time?: string
  name: string
  description?: string
  link?: string
  programme?: string
}

function cmsPathFromGlob(filePath: string): string {
  return filePath.replace(/^\.\.\//, '')
}

const programmeModules = import.meta.glob<Programme>('../content/programmes/*.json', {
  eager: true,
  import: 'default',
})

const programmeEntries: ProgrammeEntry[] = Object.entries(programmeModules)
  .map(([filePath, programme]) => ({
    path: cmsPathFromGlob(filePath),
    programme,
  }))
  .sort((a, b) => a.programme.title.localeCompare(b.programme.title, 'sv'))

const eventModules = import.meta.glob<Event>('../content/events/*.json', {
  eager: true,
  import: 'default',
})

const allEvents: Event[] = Object.values(eventModules)

const BIOGRAPHY_PROSE =
  'biography-prose text-lg font-light leading-relaxed text-gray-600 [&_h5]:text-lg [&_h5]:font-normal [&_h5]:text-gray-900 [&_h5]:mb-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_em]:italic [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2'

const PROGRAMME_LAYOUT = 'programme-grid grid min-w-0 gap-10 lg:grid-cols-2 lg:items-start lg:gap-10'
const PROGRAMME_MEDIA_STACK = 'programme-media-stack'
const PROGRAMME_MEDIA_STACK_WITH_IMAGE = 'programme-media-stack programme-media-stack--with-carousel'
const PROGRAMME_TAB_BASE =
  'justify-self-center w-fit cursor-pointer select-none text-sm tracking-widest transition-colors'
const PROGRAMME_TAB_ACTIVE = 'text-gray-900 border-b border-gray-900'
const PROGRAMME_TAB_INACTIVE = 'text-gray-400 hover:text-gray-600'

type ProgrammeTab = 'description' | 'repertoire' | 'upcoming'
const EVENT_DATE_FORMAT = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const content = home as HomeContent

let language: Language = 'sv'
let aboutExpanded = false

function biographyMarkdown() {
  return language === 'sv' ? content.biography : content.biographyEn
}

function splitBiography(markdown: string) {
  const blocks = markdown
    .trim()
    .split(/\n\s*\n+/)
    .filter(Boolean)
  const html = blocks.map((block) => marked.parse(block, { async: false }) as string)
  return {
    preview: html.slice(0, 3).join(''),
    rest: html.slice(3).join(''),
    hasMore: html.length > 3,
  }
}

function getMosaicImages(): MosaicImage[] {
  return (content.aboutMosaic ?? []).slice(0, 4)
}

function imageObjectPosition(photo: { offsetX?: number; offsetY?: number }): string {
  const x = photo.offsetX ?? 50
  const y = photo.offsetY ?? 50
  return `object-position: ${x}% ${y}%`
}

function readMoreLabel() {
  return language === 'sv' ? 'Läs mer' : 'Read more'
}

function renderMarkdown(markdown: string): string {
  const blocks = markdown
    .trim()
    .split(/\n\s*\n+/)
    .filter(Boolean)
  return blocks.map((block) => marked.parse(block, { async: false }) as string).join('')
}

function isUpcomingEvent(event: Event): boolean {
  const eventDay = new Date(`${event.date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventDay >= today
}

function eventsForProgramme(programmePath: string): Event[] {
  return allEvents
    .filter((event) => event.programme === programmePath && isUpcomingEvent(event))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
}

function formatEventWhen(event: Event): string {
  const date = EVENT_DATE_FORMAT.format(new Date(`${event.date}T12:00:00`))
  return event.time ? `${date}, ${event.time}` : date
}

function parseProgrammeHeaderColor(raw: string | undefined): string | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) return value
  if (/^rgba?\([^)]+\)$/.test(value)) return value
  return undefined
}

/** CMS colour, or next theme stack colour (no repeat until stack is used, never same as neighbour). */
function assignProgrammeHeaderColors(entries: ProgrammeEntry[]): string[] {
  const colors: string[] = []
  const usedFromStack = new Set<string>()
  let stackIndex = 0

  for (let i = 0; i < entries.length; i++) {
    const custom = parseProgrammeHeaderColor(entries[i].programme.headerColor)
    if (custom) {
      colors.push(custom)
      continue
    }

    const prev = colors[i - 1]
    let picked: string | undefined

    const tryPick = (used: Set<string>) => {
      for (let offset = 0; offset < PROGRAMME_HEADER_PALETTE.length; offset++) {
        const idx = (stackIndex + offset) % PROGRAMME_HEADER_PALETTE.length
        const candidate = PROGRAMME_HEADER_PALETTE[idx]
        if (used.has(candidate) || candidate === prev) continue
        stackIndex = idx + 1
        return candidate
      }
      return undefined
    }

    picked = tryPick(usedFromStack)

    if (!picked) {
      usedFromStack.clear()
      picked = tryPick(usedFromStack)
    }

    picked ??= PROGRAMME_HEADER_PALETTE.find((c) => c !== prev) ?? PROGRAMME_HEADER_PALETTE[0]
    usedFromStack.add(picked)
    colors.push(picked)
  }

  return colors
}

function normalizeProgrammeImage(entry: string | ProgrammeImage | undefined): ProgrammeImage | undefined {
  if (!entry) return undefined
  if (typeof entry === 'string') return { image: entry }
  if (entry.image) return entry
  return undefined
}

function getProgrammeImages(programme: Programme): ProgrammeImage[] {
  const fromList = (programme.images ?? [])
    .map((entry) => normalizeProgrammeImage(entry))
    .filter((img): img is ProgrammeImage => Boolean(img?.image))

  if (fromList.length) return fromList

  const legacy = normalizeProgrammeImage(programme.image)
  return legacy ? [legacy] : []
}

function renderProgrammeCarouselChevron(direction: 'prev' | 'next'): string {
  const isPrev = direction === 'prev'
  const position = isPrev ? 'left-3' : 'right-3'
  const control = isPrev ? 'data-carousel-prev' : 'data-carousel-next'
  const label = isPrev ? 'Previous image' : 'Next image'
  const path = isPrev ? 'M14 6 L8 12 L14 18' : 'M10 6 L16 12 L10 18'

  return `
    <button
      type="button"
      ${control}
      aria-label="${label}"
      class="absolute ${position} top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer select-none items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${path}" />
      </svg>
    </button>
  `
}

function renderProgrammeCarouselDots(count: number): string {
  return Array.from({ length: count }, (_, i) => {
    const active = i === 0
    return `
      <button
        type="button"
        data-carousel-dot="${i}"
        aria-label="Show image ${i + 1} of ${count}"
        aria-current="${active}"
        class="flex h-8 w-8 cursor-pointer select-none items-center justify-center rounded-full transition-colors hover:opacity-80"
      >
        <span
          class="block h-2 w-2 rounded-full transition-colors ${active ? 'bg-gray-900' : 'bg-gray-400/55'}"
          data-carousel-dot-marker
          aria-hidden="true"
        ></span>
      </button>
    `
  }).join('')
}

function renderProgrammeCarousel(images: ProgrammeImage[]): string {
  const slides = images
    .map(
      (img, i) => `
        <img
          data-carousel-slide="${i}"
          src="${img.image}"
          alt=""
          style="${imageObjectPosition(img)}"
          class="programme-carousel-slide absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          ${i === 0 ? '' : 'hidden'}
        />
      `,
    )
    .join('')

  const multi = images.length > 1
  const controls = multi
    ? `${renderProgrammeCarouselChevron('prev')}${renderProgrammeCarouselChevron('next')}`
    : ''

  const dots = multi
    ? `
        <div class="flex shrink-0 items-center justify-center gap-0.5 border-t border-sand-300/80 bg-sand-100 py-2" data-carousel-dots>
          ${renderProgrammeCarouselDots(images.length)}
        </div>
      `
    : ''

  return `
    <div
      class="programme-carousel flex min-h-0 flex-1 flex-col"
      data-programme-carousel
      data-slide-index="0"
      data-slide-count="${images.length}"
    >
      <div class="relative min-h-0 flex-1 overflow-hidden bg-sand-200">
        <div class="absolute inset-0">${slides}</div>
        ${controls}
      </div>
      ${dots}
    </div>
  `
}

function programmeAvailableTabs(programme: Programme, programmePath: string): ProgrammeTab[] {
  const tabs: ProgrammeTab[] = ['description']
  if (programme.repertoire?.length) tabs.push('repertoire')
  if (eventsForProgramme(programmePath).length) tabs.push('upcoming')
  return tabs
}

function renderProgrammeRepertoirePanel(entries: ProgrammeRepertoireEntry[]): string {
  const items = entries
    .map(
      (entry) => `
        <li class="break-inside-avoid">
          <span class="text-gray-900">${entry.composer}</span>
          <span class="text-gray-600"> — <span class="italic">${entry.piece}</span></span>
        </li>
      `,
    )
    .join('')

  return `<ul class="grid gap-x-10 gap-y-2 text-base font-light leading-relaxed md:grid-cols-2">${items}</ul>`
}

function renderExternalLinkIcon(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  `
}

function renderProgrammeUpcomingEventLabel(event: Event): string {
  const name = `<span class="text-gray-900">${event.name}</span>`
  if (!event.link) return name

  return `
    <span class="inline-flex min-w-0 items-center">
      ${name}
      <a
        href="${event.link}"
        class="ml-2.5 shrink-0 text-sand-700 transition-colors hover:text-gray-900"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open ${event.name} (opens in new tab)"
      >
        ${renderExternalLinkIcon()}
      </a>
    </span>
  `
}

function renderProgrammeUpcomingPanel(programmePath: string): string {
  const events = eventsForProgramme(programmePath)

  const items = events
    .map(
      (event) => `
        <li class="contents">
          <time datetime="${event.date}" class="tracking-wide text-sand-800">${formatEventWhen(event)}</time>
          <span class="text-center text-sand-400" aria-hidden="true">—</span>
          <span class="min-w-0">${renderProgrammeUpcomingEventLabel(event)}</span>
        </li>
      `,
    )
    .join('')

  return `
    <ul
      class="programme-upcoming grid w-full gap-x-6 gap-y-4 text-base font-light leading-relaxed [grid-template-columns:max-content_auto_minmax(0,1fr)] items-center"
    >
      ${items}
    </ul>
  `
}

function programmeTabButtonClass(tab: ProgrammeTab, active: ProgrammeTab): string {
  const state = tab === active ? PROGRAMME_TAB_ACTIVE : PROGRAMME_TAB_INACTIVE
  return `${PROGRAMME_TAB_BASE} ${state}`
}

const PROGRAMME_TAB_LABELS: Record<Exclude<ProgrammeTab, 'upcoming'>, string> = {
  description: 'DESCRIPTION',
  repertoire: 'REPERTOIRE',
}

function programmeTabLabel(tab: ProgrammeTab, programmePath: string): string {
  if (tab === 'upcoming') {
    const count = eventsForProgramme(programmePath).length
    return count > 0 ? `UPCOMING (${count})` : 'UPCOMING'
  }
  return PROGRAMME_TAB_LABELS[tab]
}

function renderProgrammeTabs(
  available: ProgrammeTab[],
  active: ProgrammeTab,
  programmePath: string,
): string {
  return available
    .map(
      (id) => `
        <button
          type="button"
          data-programme-tab="${id}"
          class="${programmeTabButtonClass(id, active)}"
          role="tab"
          aria-selected="${id === active}"
        >
          ${programmeTabLabel(id, programmePath)}
        </button>
      `,
    )
    .join('')
}

function renderProgrammeCopyColumn(
  programme: Programme,
  programmePath: string,
  copyOrder: string,
): string {
  const available = programmeAvailableTabs(programme, programmePath)
  const active: ProgrammeTab = 'description'
  const showTabs = available.length > 1

  const tabsMarkup = showTabs
    ? `
        <div
          class="programme-tabs mb-8 grid w-full shrink-0 py-4"
          role="tablist"
          style="grid-template-columns: repeat(${available.length}, minmax(0, 1fr))"
        >
          ${renderProgrammeTabs(available, active, programmePath)}
        </div>
      `
    : ''

  const repertoirePanel = available.includes('repertoire')
    ? `
          <div data-programme-panel="repertoire" class="programme-panel" hidden>
            ${renderProgrammeRepertoirePanel(programme.repertoire!)}
          </div>
        `
    : ''

  const upcomingPanel = available.includes('upcoming')
    ? `
          <div data-programme-panel="upcoming" class="programme-panel" hidden>
            ${renderProgrammeUpcomingPanel(programmePath)}
          </div>
        `
    : ''

  return `
    <div data-programme-copy class="min-w-0 ${copyOrder}">
      <div data-programme-root data-active-tab="${active}">
        ${tabsMarkup}
        <div class="programme-panels">
          <div data-programme-panel="description" class="programme-panel">
            <div class="${BIOGRAPHY_PROSE}">${renderMarkdown(programme.description)}</div>
          </div>
          ${repertoirePanel}
          ${upcomingPanel}
        </div>
      </div>
    </div>
  `
}

/** Title + image share one column; text in the other. Alternates left / right on lg. */
function programmeColumnOrders(index: number): { copy: string; media: string; titleAlign: string } {
  const mediaOnRight = index % 2 === 1
  return {
    copy: mediaOnRight ? 'order-2 lg:order-1' : 'order-2 lg:order-2',
    media: mediaOnRight ? 'order-1 lg:order-2' : 'order-1 lg:order-1',
    titleAlign: mediaOnRight ? 'text-right' : 'text-left',
  }
}

function renderProgrammeMedia(programme: Programme, index: number, headerColor: string): string {
  const { media, titleAlign } = programmeColumnOrders(index)
  const bgStyle = `background-color: ${headerColor}`
  const images = getProgrammeImages(programme)

  const titleBlock = `
    <p class="mb-1 text-xs font-normal tracking-[0.25em] text-white/80 md:mb-2">PROGRAMME</p>
    <h3 class="text-xl font-light leading-tight tracking-wide text-white md:text-3xl">${programme.title}</h3>
  `

  if (!images.length) {
    return `
      <div data-programme-media class="min-w-0 ${media}">
        <div class="${PROGRAMME_MEDIA_STACK}" style="${bgStyle}">
          <header class="programme-media-header flex flex-1 flex-col items-center justify-center px-4 py-8 text-center md:px-6 md:py-12">
            ${titleBlock}
          </header>
        </div>
      </div>
    `
  }

  return `
    <div data-programme-media class="min-w-0 ${media}">
      <div class="${PROGRAMME_MEDIA_STACK_WITH_IMAGE}">
        <header class="programme-media-header shrink-0 border-b-2 border-white px-4 py-2.5 ${titleAlign} md:px-6 md:py-6" style="${bgStyle}">
          ${titleBlock}
        </header>
        ${renderProgrammeCarousel(images)}
      </div>
    </div>
  `
}

function renderProgramme(entry: ProgrammeEntry, index: number, headerColor: string): string {
  const { programme, path } = entry
  const { copy } = programmeColumnOrders(index)
  const divider = index > 0 ? 'border-t border-sand-300/60 pt-24' : ''

  return `
    <article class="${divider}">
      <div class="${PROGRAMME_LAYOUT}">
        ${renderProgrammeCopyColumn(programme, path, copy)}
        ${renderProgrammeMedia(programme, index, headerColor)}
      </div>
    </article>
  `
}

function renderProgrammesSection(): string {
  if (!programmeEntries.length) return ''

  const headerColors = assignProgrammeHeaderColors(programmeEntries)

  return `
    <section id="programmes" class="bg-sand-100 px-6 py-32">
      <div class="mx-auto max-w-7xl">
        <h2 class="select-none mb-16 text-center text-3xl font-light tracking-widest text-gray-900">PROGRAMMES</h2>
        <div class="space-y-24">
          ${programmeEntries.map((entry, index) => renderProgramme(entry, index, headerColors[index]!)).join('')}
        </div>
      </div>
    </section>
  `
}

function renderMosaic(): string {
  const [hero, topRight, bottomRight, bottomWide] = getMosaicImages()

  const cell = (photo: MosaicImage | undefined) => {
    if (!photo?.image) return ''
    return `<img src="${photo.image}" alt="${photo.alt ?? ''}" style="${imageObjectPosition(photo)}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />`
  }

  return `
    <div class="about-mosaic-grid">
      <div class="about-mosaic-cell about-mosaic-cell--hero">
        ${cell(hero)}
      </div>
      <div class="about-mosaic-cell about-mosaic-cell--top-right">
        ${cell(topRight)}
      </div>
      <div class="about-mosaic-cell about-mosaic-cell--bottom-right">
        ${cell(bottomRight)}
      </div>
      <div class="about-mosaic-cell about-mosaic-cell--bottom-wide">
        ${cell(bottomWide)}
      </div>
    </div>
  `
}

function renderAboutSection(): string {
  const { preview, rest, hasMore } = splitBiography(biographyMarkdown())
  const activeClass = 'text-gray-900 border-b border-gray-900'
  const inactiveClass = 'text-gray-400 hover:text-gray-600'

  return `
    <section id="about" class="px-6 py-32">
      <div class="mx-auto max-w-7xl">
        <h2 class="select-none mb-12 text-center text-3xl font-light tracking-widest text-gray-900">ABOUT</h2>

        <div class="mb-8 flex justify-end gap-6 text-sm tracking-widest">
          <button type="button" data-lang="sv" class="cursor-pointer select-none ${language === 'sv' ? activeClass : inactiveClass} transition-colors">SV</button>
          <button type="button" data-lang="en" class="cursor-pointer select-none ${language === 'en' ? activeClass : inactiveClass} transition-colors">EN</button>
        </div>

        <div id="about-bio" class="about-bio" data-expanded="${aboutExpanded}">
          <div class="about-body">
            <div class="about-text-flow ${BIOGRAPHY_PROSE}">
              <div class="about-mosaic">${renderMosaic()}</div>
              <div class="about-copy">
                ${preview}
                ${hasMore ? `<div class="about-rest"><div class="about-rest-inner">${rest}</div></div>` : ''}
                ${
                  hasMore && !aboutExpanded
                    ? `
                  <button
                    type="button"
                    data-read-more
                    class="cursor-pointer select-none about-read-more mt-8 text-sm tracking-widest text-sand-700 underline decoration-sand-300 underline-offset-4 transition-colors hover:text-gray-900"
                    aria-expanded="false"
                  >
                    ${readMoreLabel()}
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

function updateAboutBiography(): void {
  const section = document.querySelector('#about')
  if (!section) return

  section.outerHTML = renderAboutSection()
  bindAboutSection()
}

function applyProgrammeTab(root: HTMLElement, tab: ProgrammeTab): void {
  root.dataset.activeTab = tab

  root.querySelectorAll<HTMLButtonElement>('[data-programme-tab]').forEach((button) => {
    const id = button.dataset.programmeTab as ProgrammeTab | undefined
    if (!id) return
    button.className = programmeTabButtonClass(id, tab)
    button.setAttribute('aria-selected', String(id === tab))
  })

  root.querySelectorAll<HTMLElement>('[data-programme-panel]').forEach((panel) => {
    const id = panel.dataset.programmePanel as ProgrammeTab | undefined
    if (id === tab) panel.removeAttribute('hidden')
    else panel.setAttribute('hidden', '')
  })

}

function showProgrammeCarouselSlide(carousel: HTMLElement, index: number): void {
  const slides = [...carousel.querySelectorAll<HTMLImageElement>('[data-carousel-slide]')]
  if (!slides.length) return

  const count = slides.length
  const next = ((index % count) + count) % count

  carousel.dataset.slideIndex = String(next)
  slides.forEach((slide, i) => {
    if (i === next) slide.removeAttribute('hidden')
    else slide.setAttribute('hidden', '')
  })

  carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]').forEach((dot) => {
    const i = Number(dot.dataset.carouselDot)
    const active = i === next
    const marker = dot.querySelector<HTMLElement>('[data-carousel-dot-marker]')
    dot.setAttribute('aria-current', String(active))
    if (marker) {
      marker.classList.toggle('bg-gray-900', active)
      marker.classList.toggle('bg-gray-400/55', !active)
    }
  })
}

function bindProgrammeCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-programme-carousel]').forEach((carousel) => {
    const count = Number(carousel.dataset.slideCount ?? 0)
    if (count <= 1) return

    carousel.querySelector<HTMLButtonElement>('[data-carousel-prev]')?.addEventListener('click', () => {
      const current = Number(carousel.dataset.slideIndex ?? 0)
      showProgrammeCarouselSlide(carousel, current - 1)
    })

    carousel.querySelector<HTMLButtonElement>('[data-carousel-next]')?.addEventListener('click', () => {
      const current = Number(carousel.dataset.slideIndex ?? 0)
      showProgrammeCarouselSlide(carousel, current + 1)
    })

    carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]').forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = Number(dot.dataset.carouselDot)
        if (!Number.isNaN(index)) showProgrammeCarouselSlide(carousel, index)
      })
    })
  })
}

function bindProgrammeTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-programme-root]').forEach((root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-programme-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.programmeTab as ProgrammeTab | undefined
        if (!tab || root.dataset.activeTab === tab) return
        applyProgrammeTab(root, tab)
      })
    })
  })
}

function bindAboutSection(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.lang as Language | undefined
      if (!next || next === language) return
      language = next
      aboutExpanded = false
      updateAboutBiography()
    })
  })

  document.querySelector<HTMLButtonElement>('[data-read-more]')?.addEventListener('click', () => {
    if (aboutExpanded) return

    const root = document.querySelector<HTMLElement>('#about-bio')
    if (!root) return

    const btn = document.querySelector<HTMLButtonElement>('[data-read-more]')
    aboutExpanded = true

    const apply = () => {
      root.setAttribute('data-expanded', 'true')
      btn?.remove()
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) apply()
    else void animateAboutLayout(root, apply)
  })
}

function renderApp(): void {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header class="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-sm transition-all duration-300 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center">
        <a href="#" class="text-white text-2xl tracking-[0.2em] font-light hover:text-sand-200 transition-colors">
          LOVISA HULEDAL
        </a>
        <nav class="mt-4 md:mt-0 flex gap-8 text-sm tracking-widest text-gray-200">
          <a href="#about" class="hover:text-white transition-colors">ABOUT</a>
          <a href="#programmes" class="hover:text-white transition-colors">PROGRAMMES</a>
          <a href="#schedule" class="hover:text-white transition-colors">SCHEDULE</a>
          <a href="#listen" class="hover:text-white transition-colors">LISTEN</a>
          <a href="#pictures" class="hover:text-white transition-colors">PICTURES</a>
          <a href="#contact" class="hover:text-white transition-colors">CONTACT</a>
        </nav>
      </div>
    </header>

    <main>
      <section id="home" class="relative h-screen w-full hero-image flex items-center justify-center">
        <div class="absolute inset-0 bg-black/20"></div>
      </section>

      ${renderAboutSection()}

      ${renderProgrammesSection()}

      <section id="schedule" class="px-6 py-32">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-3xl tracking-widest font-light mb-8 text-gray-900">SCHEDULE</h2>
          <p class="text-lg text-gray-600 leading-relaxed font-light">
            Upcoming performances will be listed here.
          </p>
        </div>
      </section>
    </main>
  `
}

renderApp()
bindAboutSection()
bindProgrammeTabs()
bindProgrammeCarousels()
