import './style.css'
import { animateAboutLayout } from './about-layout-animation'
import { syncSiteIcon, type SiteIconSettings } from './site-icon'
import { syncSiteFonts, type SiteTypography } from './site-fonts'
import { marked } from 'marked'
import home from '../content/home.json'
import contactData from '../content/contact.json'
import photosContent from '../content/photos.json'

type Language = 'sv' | 'en'

interface MosaicImage {
  image: string
  offsetX?: number
  offsetY?: number
  alt?: string
}

interface HeroTextBlock {
  text?: string
  offsetX?: number
  offsetY?: number
  offsetXMobile?: number
  offsetYMobile?: number
}

interface HomeContent {
  typography?: SiteTypography
  heroTitle?: HeroTextBlock
  heroSubtitle?: HeroTextBlock
  heroImage?: MosaicImage
  siteIcon?: SiteIconSettings
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
  /** Programme accent (banner, panel tint, carousel). Prefer `color`; `headerColor` is legacy. */
  color?: string
  /** @deprecated Use `color` */
  headerColor?: string
  description: string
  images?: (string | ProgrammeImage)[]
  /** @deprecated Legacy single image — use `images` list */
  image?: ProgrammeImage
  repertoire?: ProgrammeRepertoireEntry[]
}

/** Scandinavian accent bands for programmes without a CMS colour. */
const PROGRAMME_HEADER_PALETTE = [
  '#2d5046', // dark green
  '#944648', // muted red
  '#345a75', // Scandinavian blue
  '#6e5e2a', // muted Nordic gold (readable with white text)
  '#1e3f5c', // deep fjord blue
  '#3a5f52', // pine green
] as const

interface ProgrammeEntry {
  path: string
  programme: Programme
}

interface Event {
  date: string
  time?: string
  name?: string
  location?: string
  description?: string
  link?: string
  programme?: string
}

interface EventEntry {
  /** Derived from the event filename without `.json`, e.g. `2026-07-30-la-liberazione`. */
  id: string
  path: string
  event: Event
}

interface Video {
  youtubeLink: string
  title: string
  description: string
}

interface VideoEntry {
  id: string
  path: string
  video: Video
}

interface PhotoItem {
  image?: string
  caption?: string
}

interface PhotosContent {
  portraits?: PhotoItem[]
  onStage?: PhotoItem[]
}

type PhotoCategory = 'portraits' | 'onStage'

interface PhotoEntry {
  id: string
  category: PhotoCategory
  photo: { image: string; caption?: string }
}

interface ContactPerson {
  name?: string
  email?: string
  phone?: string
}

interface ContactContent {
  agency: ContactPerson
  lovisa: ContactPerson
  socialMedia?: {
    facebook?: string
    instagram?: string
    youtube?: string
  }
}

const DEFAULT_HERO_IMAGE = '/media/6-lovisa-huledal-med-inlevelse-framfor-orkester.jpeg'

const CONTACT_IMAGE_SRC = '/media/jolo-mb-4244.jpeg'

const SOCIAL_ICON_SRC = {
  facebook: '/media/facebook.svg',
  youtube: '/media/youtube.svg',
  instagram: '/media/instagram.svg',
} as const

/** Resolve CMS / public paths for the current deploy base (e.g. GitHub Pages /repo/). */
function assetUrl(path: string): string {
  const trimmed = path.trim()
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed
  const base = import.meta.env.BASE_URL
  const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  return `${base}${relative}`
}

const contact = contactData as ContactContent

function cmsPathFromGlob(filePath: string): string {
  return filePath.replace(/^\.\.\//, '')
}

function eventIdFromGlob(filePath: string): string {
  const base = filePath.split('/').pop() ?? filePath
  return base.replace(/\.json$/i, '')
}

function videoIdFromGlob(filePath: string): string {
  return eventIdFromGlob(filePath)
}

function calendarEventDomId(eventId: string): string {
  return `calendar-event-${eventId}`
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

const programmeHeaderColors = assignProgrammeHeaderColors(programmeEntries)

const eventModules = import.meta.glob<Event>('../content/events/*.json', {
  eager: true,
  import: 'default',
})

const videoModules = import.meta.glob<Video>('../content/videos/*.json', {
  eager: true,
  import: 'default',
})

const videoEntries: VideoEntry[] = Object.entries(videoModules)
  .map(([filePath, video]) => ({
    id: videoIdFromGlob(filePath),
    path: cmsPathFromGlob(filePath),
    video,
  }))
  .sort((a, b) => a.video.title.trim().localeCompare(b.video.title.trim(), 'sv'))

const PHOTO_CATEGORIES: PhotoCategory[] = ['portraits', 'onStage']

const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  portraits: 'PORTRAIT',
  onStage: 'ON STAGE',
}

function buildPhotoEntries(content: PhotosContent): PhotoEntry[] {
  const entries: PhotoEntry[] = []
  for (const category of PHOTO_CATEGORIES) {
    for (const [index, item] of (content[category] ?? []).entries()) {
      const image = item.image?.trim()
      if (!image) continue
      const caption = item.caption?.trim()
      entries.push({
        id: `${category}-${index}`,
        category,
        photo: caption ? { image, caption } : { image },
      })
    }
  }
  return entries
}

const photoEntries = buildPhotoEntries(photosContent as PhotosContent)

const eventEntries: EventEntry[] = Object.entries(eventModules)
  .map(([filePath, event]) => {
    const id = eventIdFromGlob(filePath)
    return {
      id,
      path: cmsPathFromGlob(filePath),
      event,
    }
  })
  .sort(
    (a, b) =>
      a.event.date.localeCompare(b.event.date) ||
      (a.event.time ?? '').localeCompare(b.event.time ?? ''),
  )

const BIOGRAPHY_PROSE =
  'biography-prose text-lg font-light leading-relaxed text-gray-600 [&_h5]:text-lg [&_h5]:font-normal [&_h5]:text-gray-900 [&_h5]:mb-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_em]:italic [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2'

/** Same as biography prose, but lists align flush with paragraphs (no hanging bullets). */
const PROGRAMME_DESCRIPTION_PROSE =
  'biography-prose text-lg font-light leading-relaxed text-gray-600 [&_h5]:text-lg [&_h5]:font-normal [&_h5]:text-gray-900 [&_h5]:mb-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_em]:italic [&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:pl-0 [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-0 [&_li]:mb-2'

/** Desktop: extra section padding; top −10% vs even 5.25rem, title gap +10% vs 3.25rem */
const SECTION_PADDING_Y = 'py-16 md:pt-[4.725rem] md:pb-[5.25rem]'
const SECTION_TITLE_MARGIN = 'mb-8 md:mb-[3.575rem]'
const SECTION_TITLE_BASE = 'select-none text-3xl font-light tracking-widest text-gray-900'
const ABOUT_SECTION_PADDING = 'pt-12 pb-16 md:pt-[3.825rem] md:pb-[5.25rem]'
const ABOUT_SECTION_TITLE_MARGIN = 'mb-12 md:mb-[4.675rem]'
const SECTION_TAB_BASE =
  'cursor-pointer select-none border-0 bg-transparent p-0 text-sm tracking-[0.25em] transition-colors'
const SECTION_TAB_ACTIVE = 'text-sand-800'
const SECTION_TAB_INACTIVE = 'text-gray-400 hover:text-gray-600'
const LISTEN_DETAIL_LAYOUT = 'grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start lg:gap-10'
const SCHEDULE_HIGHLIGHT_MS = 3200
const EVENT_DATE_FORMAT = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const content = home as HomeContent

function syncHeroBackground(): void {
  const hero = content.heroImage
  const image = hero?.image?.trim() || DEFAULT_HERO_IMAGE
  const x = hero?.offsetX ?? 50
  const y = hero?.offsetY ?? 20
  document.documentElement.style.setProperty(
    '--hero-background-image',
    `url(${assetUrl(image)})`,
  )
  document.documentElement.style.setProperty('--hero-background-position', `${x}% ${y}%`)
}

let language: Language = 'sv'
let aboutExpanded = false
let listenSelectedVideoId: string | null = null
let picturesSelectedPhotoId: string | null = null
let programmeSelectedPath: string | null = null

const PROGRAMME_DETAIL_AUTOPLAY_MS = 8000
let programmeDetailAutoplayTimer: ReturnType<typeof setInterval> | null = null
let programmeDetailAutoplayCarousel: HTMLElement | null = null

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0]
      return id || null
    }
    const fromQuery = parsed.searchParams.get('v')
    if (fromQuery) return fromQuery
    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/)
    if (embedMatch?.[1]) return embedMatch[1]
  } catch {
    return null
  }
  return null
}

function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
}

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

function clampHeroOffset(value: number | undefined, fallback: number): number {
  const n = value ?? fallback
  return Math.min(100, Math.max(0, n))
}

type HeroTextDefaults = {
  offsetX: number
  offsetY: number
  offsetXMobile?: number
  offsetYMobile?: number
}

function heroTextPositionStyle(
  block: HeroTextBlock | undefined,
  defaults: HeroTextDefaults,
): string {
  const xDesktop = clampHeroOffset(block?.offsetX, defaults.offsetX)
  const yDesktop = clampHeroOffset(block?.offsetY, defaults.offsetY)
  const xMobile = clampHeroOffset(
    block?.offsetXMobile ?? block?.offsetX,
    defaults.offsetXMobile ?? defaults.offsetX,
  )
  const yMobile = clampHeroOffset(
    block?.offsetYMobile ?? block?.offsetY,
    defaults.offsetYMobile ?? defaults.offsetY,
  )
  return `--hero-offset-x:${xMobile};--hero-offset-y:${yMobile};--hero-offset-x-desktop:${xDesktop};--hero-offset-y-desktop:${yDesktop}`
}

function renderHeroHeading(
  block: HeroTextBlock | undefined,
  defaults: HeroTextDefaults,
  className: string,
): string {
  const text = block?.text?.trim()
  if (!text) return ''

  return `
    <p class="hero-heading ${className}" style="${heroTextPositionStyle(block, defaults)}">
      ${escapeHtml(text)}
    </p>
  `
}

function renderHeroHeadings(): string {
  return [
    renderHeroHeading(
      content.heroTitle,
      { offsetX: 6, offsetY: 10, offsetXMobile: 50, offsetYMobile: 12 },
      'hero-heading--title',
    ),
    renderHeroHeading(
      content.heroSubtitle,
      { offsetX: 94, offsetY: 10, offsetXMobile: 50, offsetYMobile: 22 },
      'hero-heading--subtitle',
    ),
  ]
    .filter(Boolean)
    .join('')
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

function parseEventTime(time?: string): { hours: number; minutes: number } | null {
  if (!time?.trim()) return null
  const normalized = time.trim().replace('.', ':')
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}

/** When `time` is omitted, the event counts as upcoming until the end of that calendar day. */
function eventStartsAt(event: Event): Date {
  const start = new Date(`${event.date}T00:00:00`)
  const parsed = parseEventTime(event.time)
  if (parsed) {
    start.setHours(parsed.hours, parsed.minutes, 0, 0)
    return start
  }
  start.setHours(23, 59, 59, 999)
  return start
}

function isUpcomingEvent(event: Event): boolean {
  return eventStartsAt(event) >= new Date()
}

function isPastEvent(event: Event): boolean {
  return !isUpcomingEvent(event)
}

const CALENDAR_MAX_EVENTS = 20
const CALENDAR_INITIAL_VISIBLE = 5

function upcomingEvents(): EventEntry[] {
  return eventEntries
    .filter((entry) => isUpcomingEvent(entry.event))
    .slice(0, CALENDAR_MAX_EVENTS)
}

function pastEvents(): EventEntry[] {
  return eventEntries
    .filter((entry) => isPastEvent(entry.event))
    .sort(
      (a, b) =>
        b.event.date.localeCompare(a.event.date) ||
        (b.event.time ?? '').localeCompare(a.event.time ?? ''),
    )
    .slice(0, CALENDAR_MAX_EVENTS)
}

/** Only events that appear in the calendar upcoming list (max {@link CALENDAR_MAX_EVENTS}). */
function eventsForProgramme(programmePath: string): EventEntry[] {
  return upcomingEvents().filter((entry) => entry.event.programme === programmePath)
}

function programmeTitleForPath(programmePath: string): string | undefined {
  return programmeEntries.find((entry) => entry.path === programmePath)?.programme.title
}

/** Name, or programme title; with programme in parentheses when both are set. */
function calendarEventDisplayTitle(event: Event): string {
  const name = event.name?.trim()
  const programmeTitle = event.programme ? programmeTitleForPath(event.programme) : undefined

  if (name && programmeTitle) return `${name} (${programmeTitle})`
  if (name) return name
  if (programmeTitle) return programmeTitle
  return 'Performance'
}

function formatEventWhen(event: Event): string {
  const date = EVENT_DATE_FORMAT.format(new Date(`${event.date}T12:00:00`))
  return event.time ? `${date}, ${event.time}` : date
}

function getProgrammeColor(programme: Programme): string | undefined {
  return (
    parseProgrammeHeaderColor(programme.color) ?? parseProgrammeHeaderColor(programme.headerColor)
  )
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
    const custom = getProgrammeColor(entries[i].programme)
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
        class="programme-carousel-dot"
      >
        <span class="programme-carousel-dot__marker" data-carousel-dot-marker aria-hidden="true"></span>
      </button>
    `
  }).join('')
}

function renderProgrammeCarouselDotsBar(count: number): string {
  return `
    <div class="programme-carousel-dots" data-carousel-dots>
      ${renderProgrammeCarouselDots(count)}
    </div>
  `
}

function renderProgrammeRepertoireList(entries: ProgrammeRepertoireEntry[]): string {
  const items = entries
    .map(
      (entry) => `
        <li class="break-inside-avoid text-left">
          <span class="text-gray-900">${entry.composer}</span>
          <span class="text-gray-600"> — <span class="italic">${entry.piece}</span></span>
        </li>
      `,
    )
    .join('')

  return `<ul class="programme-accordion-repertoire__list">${items}</ul>`
}

function renderProgrammeRepertoireSection(
  entries: ProgrammeRepertoireEntry[],
  headingId: string,
): string {
  if (!entries.length) return ''

  return `
    <section class="programme-accordion-repertoire" aria-labelledby="${headingId}">
      <h3 id="${headingId}" class="programme-accordion-repertoire__title">Repertoire</h3>
      ${renderProgrammeRepertoireList(entries)}
    </section>
  `
}

function renderExternalLinkIcon(size = 16): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  `
}

function renderEventTicketsLink(event: Event): string {
  if (!event.link) return ''

  return `
    <a
      href="${event.link}"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sand-400/90 bg-sand-100/90 px-3 py-1 text-xs tracking-widest text-sand-800 transition-colors hover:border-sand-600 hover:bg-sand-200 hover:text-gray-900"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tickets for ${calendarEventDisplayTitle(event)} (opens in new tab)"
    >
      TICKETS
      ${renderExternalLinkIcon(14)}
    </a>
  `
}

function renderScheduleEventDetails(event: Event): string {
  const title = `<span class="text-gray-900">${calendarEventDisplayTitle(event)}</span>`
  const locationText = event.location?.trim()

  const locationRow = locationText
    ? `<span class="mt-1 block text-base text-gray-500">${locationText}</span>`
    : ''

  return `
    <span class="block min-w-0">
      ${title}
      ${locationRow}
    </span>
  `
}

function renderScheduleEventRow(entry: EventEntry, options?: { collapsed?: boolean }): string {
  const { event, id } = entry
  const programmePath = event.programme ?? ''
  const tickets = renderEventTicketsLink(event)
  const collapsedAttrs = options?.collapsed ? ' hidden data-calendar-extra' : ''

  return `
    <li
      id="${calendarEventDomId(id)}"
      data-calendar-event
      data-event-id="${id}"
      data-programme-path="${programmePath}"
      class="calendar-event rounded-sm py-4 md:py-5"${collapsedAttrs}
    >
      <div class="calendar-event-row mx-auto grid max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-x-5 text-lg font-light leading-relaxed md:gap-x-10">
        <div class="flex flex-col items-end gap-y-2">
          <time datetime="${event.date}" class="text-right tracking-wide text-sand-800">${formatEventWhen(event)}</time>
          ${tickets ? `<span class="flex justify-end">${tickets}</span>` : ''}
        </div>
        <span class="self-center text-sand-400" aria-hidden="true">—</span>
        <span class="min-w-0 text-left">
          ${renderScheduleEventDetails(event)}
        </span>
      </div>
    </li>
  `
}

function renderCalendarShowMoreButton(): string {
  return `
    <div class="calendar-show-more mt-6 text-center">
      <button
        type="button"
        data-calendar-show-more
        class="cursor-pointer select-none text-sm tracking-widest text-sand-700 underline decoration-sand-300 underline-offset-4 transition-colors hover:text-gray-900"
        aria-expanded="false"
      >
        SHOW MORE
      </button>
    </div>
  `
}

function renderScheduleEventList(
  entries: EventEntry[],
  emptyMessage: string,
  options?: { initialVisible?: number },
): string {
  if (!entries.length) {
    return `<p class="py-8 text-center text-base font-light text-gray-500">${emptyMessage}</p>`
  }

  const initialVisible = options?.initialVisible
  const rows = entries
    .map((entry, index) => {
      const collapsed = initialVisible !== undefined && index >= initialVisible
      return renderScheduleEventRow(entry, collapsed ? { collapsed: true } : undefined)
    })
    .join('')

  const hasShowMore = initialVisible !== undefined && entries.length > initialVisible

  return `
    <ul class="calendar-list divide-y divide-sand-200/80">${rows}</ul>
    ${hasShowMore ? renderCalendarShowMoreButton() : ''}
  `
}

function renderScheduleTabs(active: ScheduleTab): string {
  const tabs: ScheduleTab[] = ['upcoming', 'past']
  const buttons = tabs
    .map(
      (id) => `
        <button
          type="button"
          data-calendar-tab="${id}"
          class="${calendarTabButtonClass(id, active)}"
          role="tab"
          aria-selected="${id === active}"
        >
          ${SCHEDULE_TAB_LABELS[id]}
        </button>
      `,
    )
    .join('<span class="section-tabs__sep" aria-hidden="true">|</span>')

  return `
    <div class="section-tabs" role="tablist">
      ${buttons}
    </div>
  `
}

function renderScheduleSection(): string {
  const upcoming = upcomingEvents()
  const past = pastEvents()
  const hasAny = upcoming.length > 0 || past.length > 0
  const active: ScheduleTab = 'upcoming'

  if (!hasAny) {
    return `
      <section id="calendar" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="${SECTION_TITLE_MARGIN} ${SECTION_TITLE_BASE}">CALENDAR</h2>
          <p class="text-lg font-light leading-relaxed text-gray-600">
            No performances listed at the moment.
          </p>
        </div>
      </section>
    `
  }

  return `
    <section id="calendar" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-5xl">
        <div data-calendar-root data-active-tab="${active}">
          <div class="section-intro">
            <h2 class="section-intro__title text-center ${SECTION_TITLE_BASE}">CALENDAR</h2>
            ${renderScheduleTabs(active)}
          </div>
          <div data-calendar-panel="upcoming" class="calendar-panel" role="tabpanel">
            ${renderScheduleEventList(upcoming, 'No upcoming performances.', {
              initialVisible: CALENDAR_INITIAL_VISIBLE,
            })}
          </div>
          <div data-calendar-panel="past" class="calendar-panel" role="tabpanel" hidden>
            ${renderScheduleEventList(past, 'No past performances.', {
              initialVisible: CALENDAR_INITIAL_VISIBLE,
            })}
          </div>
        </div>
      </div>
    </section>
  `
}

function renderProgrammeUpcomingSubBanner(programmePath: string): string {
  const count = eventsForProgramme(programmePath).length
  if (count <= 0) return ''

  const eventsWord = count === 1 ? 'event' : 'events'
  const label = `See ${count} ${eventsWord} upcoming!`

  return `
    <a
      href="#calendar"
      data-programme-calendar-link
      data-programme-path="${programmePath}"
      class="programme-accordion-events-banner"
    >
      ${label}
    </a>
  `
}

type ScheduleTab = 'upcoming' | 'past'

const SCHEDULE_TAB_LABELS: Record<ScheduleTab, string> = {
  upcoming: 'UPCOMING',
  past: 'PAST',
}

function sectionTabButtonClass(isActive: boolean): string {
  return `${SECTION_TAB_BASE} ${isActive ? SECTION_TAB_ACTIVE : SECTION_TAB_INACTIVE}`
}

function calendarTabButtonClass(tab: ScheduleTab, active: ScheduleTab): string {
  return sectionTabButtonClass(tab === active)
}

function programmeHasMedia(programme: Programme): boolean {
  return getProgrammeImages(programme).length > 0
}

function renderProgrammeCarouselMedia(
  programme: Programme,
  options?: { frameClass?: string; carouselClass?: string; showDots?: boolean },
): string {
  const images = getProgrammeImages(programme)
  if (!images.length) return ''

  const frameClass = options?.frameClass ?? 'programme-media-frame relative overflow-hidden bg-sand-200'
  const carouselClass = options?.carouselClass ?? 'programme-carousel'
  const showDots = options?.showDots ?? true
  const multi = images.length > 1
  const slides = images
    .map(
      (img, i) => `
        <img
          data-carousel-slide="${i}"
          src="${assetUrl(img.image!)}"
          alt=""
          style="${imageObjectPosition(img)}"
          class="programme-carousel-slide absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          ${i === 0 ? '' : 'hidden'}
        />
      `,
    )
    .join('')

  const controls = multi
    ? `${renderProgrammeCarouselChevron('prev')}${renderProgrammeCarouselChevron('next')}`
    : ''

  return `
    <div
      class="${carouselClass}"
      data-programme-carousel
      data-slide-index="0"
      data-slide-count="${images.length}"
      tabindex="0"
      aria-label="Programme images"
    >
      <div class="${frameClass}">
        <div class="absolute inset-0">${slides}</div>
        ${controls}
      </div>
      ${multi && showDots ? renderProgrammeCarouselDotsBar(images.length) : ''}
    </div>
  `
}

function renderProgrammeThumbnail(entry: ProgrammeEntry, headerColor: string): string {
  const { programme, path } = entry
  const title = escapeHtml(programme.title)
  const firstImage = getProgrammeImages(programme)[0]
  const imageMarkup = firstImage
    ? `
        <img
          src="${assetUrl(firstImage.image!)}"
          alt=""
          style="${imageObjectPosition(firstImage)}"
          class="programme-thumb-image absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      `
    : ''

  return `
    <button
      type="button"
      data-programme-card="${escapeHtml(path)}"
      class="programme-thumb group flex min-w-0 cursor-pointer flex-col text-left"
      style="--programme-banner: ${headerColor}"
    >
      <span class="programme-thumb-media relative block aspect-square overflow-hidden bg-sand-200">
        ${imageMarkup}
        <span class="programme-thumb-banner">
          <span class="programme-thumb-banner__label">PROGRAMME</span>
          <span class="programme-thumb-banner__title">${title}</span>
        </span>
      </span>
    </button>
  `
}

function renderProgrammesGallery(): string {
  if (!programmeEntries.length) {
    return `
      <p class="text-center text-lg font-light leading-relaxed text-gray-600">
        No programmes listed at the moment.
      </p>
    `
  }

  const items = programmeEntries
    .map((entry, index) => renderProgrammeThumbnail(entry, programmeHeaderColors[index]!))
    .join('')

  return renderMediaStrip(items, 1, 'media-strip--programmes')
}

function renderProgrammeDetailShell(): string {
  return `
    <div
      data-programme-detail
      class="programme-detail fixed inset-0 z-[60] overflow-y-auto bg-sand-100"
      hidden
    >
      ${renderMediaCloseButton('data-programme-close', 'Close programme')}
      <div class="mx-auto flex min-h-full max-w-7xl flex-col justify-center px-6 py-24 md:py-32">
        <div class="${LISTEN_DETAIL_LAYOUT}">
          <div data-programme-detail-media class="programme-detail-media min-w-0"></div>
          <div class="min-w-0">
            <p class="mb-2 text-xs font-normal tracking-[0.25em] text-sand-700">PROGRAMME</p>
            <h3 data-programme-detail-title class="mb-6 text-2xl font-light leading-tight tracking-wide text-gray-900 md:text-3xl"></h3>
            <div data-programme-detail-upcoming class="mb-6"></div>
            <div data-programme-detail-description class="${PROGRAMME_DESCRIPTION_PROSE}"></div>
            <div data-programme-detail-repertoire class="mt-8"></div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderProgrammesSection(): string {
  if (!programmeEntries.length) return ''

  return `
    <section id="programmes" class="bg-sand-100 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        <h2 class="${SECTION_TITLE_MARGIN} text-center ${SECTION_TITLE_BASE}">PROGRAMMES</h2>
        <div data-programmes-gallery-root>
          ${renderProgrammesGallery()}
        </div>
      </div>
      ${renderProgrammeDetailShell()}
    </section>
  `
}

function programmeEntryByPath(path: string): ProgrammeEntry | undefined {
  return programmeEntries.find((entry) => entry.path === path)
}

function programmeHeaderColorForEntry(entry: ProgrammeEntry): string {
  const index = programmeEntries.indexOf(entry)
  if (index < 0) return PROGRAMME_HEADER_PALETTE[0]
  return programmeHeaderColors[index]!
}

function populateProgrammeDetail(entry: ProgrammeEntry): void {
  const detail = document.querySelector<HTMLElement>('[data-programme-detail]')
  const mediaEl = document.querySelector<HTMLElement>('[data-programme-detail-media]')
  const titleEl = document.querySelector<HTMLElement>('[data-programme-detail-title]')
  const upcomingEl = document.querySelector<HTMLElement>('[data-programme-detail-upcoming]')
  const descriptionEl = document.querySelector<HTMLElement>('[data-programme-detail-description]')
  const repertoireEl = document.querySelector<HTMLElement>('[data-programme-detail-repertoire]')
  if (!detail || !mediaEl || !titleEl || !upcomingEl || !descriptionEl || !repertoireEl) return

  const { programme, path } = entry
  const headerColor = programmeHeaderColorForEntry(entry)
  detail.style.setProperty('--programme-banner', headerColor)

  const mediaMarkup = programmeHasMedia(programme)
    ? renderProgrammeCarouselMedia(programme, {
        frameClass: 'programme-detail-media__frame programme-media-frame relative overflow-hidden bg-sand-200',
        carouselClass: 'programme-detail-media__carousel',
        showDots: true,
      })
    : `<div class="programme-detail-media__frame programme-detail-media__frame--empty bg-sand-200" aria-hidden="true"></div>`

  mediaEl.innerHTML = mediaMarkup
  mediaEl.querySelectorAll<HTMLElement>('[data-programme-carousel]').forEach((carousel) => {
    bindProgrammeCarousel(carousel, { autoplay: true })
  })

  titleEl.textContent = programme.title.trim()
  upcomingEl.innerHTML = renderProgrammeUpcomingSubBanner(path)
  descriptionEl.innerHTML = renderMarkdown(programme.description)

  const repertoireIndex = programmeEntries.indexOf(entry)
  repertoireEl.innerHTML = programme.repertoire?.length
    ? renderProgrammeRepertoireSection(
        programme.repertoire,
        `programme-detail-repertoire-${repertoireIndex}`,
      )
    : ''
}

function clearProgrammeDetail(): void {
  stopProgrammeDetailAutoplay()
  const detail = document.querySelector<HTMLElement>('[data-programme-detail]')
  const mediaEl = document.querySelector<HTMLElement>('[data-programme-detail-media]')
  const titleEl = document.querySelector<HTMLElement>('[data-programme-detail-title]')
  const upcomingEl = document.querySelector<HTMLElement>('[data-programme-detail-upcoming]')
  const descriptionEl = document.querySelector<HTMLElement>('[data-programme-detail-description]')
  const repertoireEl = document.querySelector<HTMLElement>('[data-programme-detail-repertoire]')
  detail?.style.removeProperty('--programme-banner')
  if (mediaEl) mediaEl.innerHTML = ''
  if (titleEl) titleEl.textContent = ''
  if (upcomingEl) upcomingEl.innerHTML = ''
  if (descriptionEl) descriptionEl.innerHTML = ''
  if (repertoireEl) repertoireEl.innerHTML = ''
}

function openProgramme(path: string): void {
  const entry = programmeEntryByPath(path)
  if (!entry) return

  programmeSelectedPath = path
  populateProgrammeDetail(entry)

  const gallery = document.querySelector<HTMLElement>('[data-programmes-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-programme-detail]')
  gallery?.setAttribute('hidden', '')
  detail?.removeAttribute('hidden')
  setMediaOverlayOpen(true)
}

function closeProgramme(): void {
  if (!programmeSelectedPath) return

  programmeSelectedPath = null
  clearProgrammeDetail()

  const gallery = document.querySelector<HTMLElement>('[data-programmes-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-programme-detail]')
  gallery?.removeAttribute('hidden')
  detail?.setAttribute('hidden', '')
  setMediaOverlayOpen(false)

  const section = document.getElementById('programmes')
  if (section) scrollBelowSiteHeader(section, false)
}

function renderMosaic(): string {
  const [hero, topRight, bottomRight, bottomWide] = getMosaicImages()

  const cell = (photo: MosaicImage | undefined) => {
    if (!photo?.image) return ''
    return `<img src="${assetUrl(photo.image)}" alt="${photo.alt ?? ''}" style="${imageObjectPosition(photo)}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />`
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

function videoEntryById(id: string): VideoEntry | undefined {
  return videoEntries.find((entry) => entry.id === id)
}

function renderMediaCloseButton(closeSelector: string, ariaLabel: string): string {
  return `
    <button
      type="button"
      ${closeSelector}
      class="media-close absolute right-6 top-6 z-10 flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-sand-200/80 hover:text-gray-900"
      aria-label="${ariaLabel}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  `
}

function setMediaOverlayOpen(open: boolean): void {
  document.body.classList.toggle('media-overlay-open', open)
}

function renderListenThumbnail(entry: VideoEntry): string {
  const { video, id } = entry
  const ytId = youtubeVideoId(video.youtubeLink)
  if (!ytId) return ''

  const title = video.title.trim()

  return `
    <button
      type="button"
      data-listen-video="${id}"
      class="listen-thumb group flex min-w-0 cursor-pointer flex-col text-left transition-opacity hover:opacity-90"
    >
      <span class="listen-thumb-media">
        <img
          src="${youtubeThumbnailUrl(ytId)}"
          alt=""
          class="listen-thumb-image transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span class="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25" aria-hidden="true">
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </span>
      <span class="mt-3 text-base font-light leading-snug text-gray-900">${escapeHtml(title)}</span>
    </button>
  `
}

function renderMediaStripChevron(direction: 'prev' | 'next'): string {
  const isPrev = direction === 'prev'
  const control = isPrev ? 'data-media-strip-prev' : 'data-media-strip-next'
  const label = isPrev ? 'Scroll left' : 'Scroll right'
  const path = isPrev ? 'M14 6 L8 12 L14 18' : 'M10 6 L16 12 L10 18'

  return `
    <button
      type="button"
      ${control}
      aria-label="${label}"
      class="media-strip__nav media-strip__nav--${direction}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${path}" />
      </svg>
    </button>
  `
}

function renderMediaStrip(itemsMarkup: string, rows: 1 | 2 = 2, modifierClass = ''): string {
  const rowClass = rows === 1 ? 'media-strip--1-row' : 'media-strip--2-rows'
  const extraClass = modifierClass ? ` ${modifierClass}` : ''

  return `
    <div class="media-strip ${rowClass}${extraClass}" data-media-strip>
      <div class="media-strip__viewport" data-media-strip-viewport tabindex="0">
        <div class="media-strip__grid">
          ${itemsMarkup}
        </div>
      </div>
      ${renderMediaStripChevron('prev')}
      ${renderMediaStripChevron('next')}
    </div>
  `
}

function renderListenGallery(): string {
  const items = videoEntries.map((entry) => renderListenThumbnail(entry)).filter(Boolean)

  if (!items.length) {
    return `
      <p class="text-center text-lg font-light leading-relaxed text-gray-600">
        No videos listed at the moment.
      </p>
    `
  }

  return renderMediaStrip(items.join(''), 1)
}

function renderListenDetailShell(): string {
  return `
    <div
      data-listen-detail
      class="listen-detail fixed inset-0 z-[60] overflow-y-auto bg-sand-100"
      hidden
    >
      ${renderMediaCloseButton('data-listen-close', 'Close video')}
      <div class="mx-auto flex min-h-full max-w-7xl flex-col justify-center px-6 py-24 md:py-32">
        <div class="${LISTEN_DETAIL_LAYOUT}">
          <div class="listen-embed min-w-0">
            <iframe
              data-listen-iframe
              class="listen-embed-frame"
              title=""
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>
          <div class="min-w-0">
            <p class="mb-2 text-xs font-normal tracking-[0.25em] text-sand-700">LISTEN</p>
            <h3 data-listen-detail-title class="mb-6 text-2xl font-light leading-tight tracking-wide text-gray-900 md:text-3xl"></h3>
            <div data-listen-detail-description class="${BIOGRAPHY_PROSE}"></div>
          </div>
        </div>
      </div>
    </div>
  `
}

function renderListenSection(): string {
  return `
    <section id="listen" class="bg-sand-100 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        <h2 class="${SECTION_TITLE_MARGIN} text-center ${SECTION_TITLE_BASE}">LISTEN</h2>
        <div data-listen-gallery-root>
          ${renderListenGallery()}
        </div>
      </div>
      ${renderListenDetailShell()}
    </section>
  `
}


function populateListenDetail(entry: VideoEntry): void {
  const detail = document.querySelector<HTMLElement>('[data-listen-detail]')
  const iframe = document.querySelector<HTMLIFrameElement>('[data-listen-iframe]')
  const titleEl = document.querySelector<HTMLElement>('[data-listen-detail-title]')
  const descriptionEl = document.querySelector<HTMLElement>('[data-listen-detail-description]')
  if (!detail || !iframe || !titleEl || !descriptionEl) return

  const { video } = entry
  const ytId = youtubeVideoId(video.youtubeLink)
  if (!ytId) return

  const title = video.title.trim()
  iframe.title = title
  iframe.src = youtubeEmbedUrl(ytId)
  titleEl.textContent = title
  descriptionEl.innerHTML = `<p>${escapeHtml(video.description.trim())}</p>`
}

function clearListenDetail(): void {
  const iframe = document.querySelector<HTMLIFrameElement>('[data-listen-iframe]')
  if (iframe) iframe.src = ''
}

function openListenVideo(id: string): void {
  const entry = videoEntryById(id)
  if (!entry) return

  listenSelectedVideoId = id
  populateListenDetail(entry)

  const gallery = document.querySelector<HTMLElement>('[data-listen-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-listen-detail]')
  gallery?.setAttribute('hidden', '')
  detail?.removeAttribute('hidden')
  setMediaOverlayOpen(true)
}

function closeListenVideo(): void {
  if (!listenSelectedVideoId) return

  listenSelectedVideoId = null
  clearListenDetail()

  const gallery = document.querySelector<HTMLElement>('[data-listen-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-listen-detail]')
  gallery?.removeAttribute('hidden')
  detail?.setAttribute('hidden', '')
  setMediaOverlayOpen(false)

  const section = document.getElementById('listen')
  if (section) scrollBelowSiteHeader(section, false)
}

function photoEntryById(id: string): PhotoEntry | undefined {
  return photoEntries.find((entry) => entry.id === id)
}

function renderPictureThumbnail(entry: PhotoEntry): string {
  const { photo, id } = entry
  const caption = photo.caption

  const captionMarkup = caption
    ? `<p class="mt-2 text-xs font-light leading-snug tracking-wide text-gray-500">${escapeHtml(caption)}</p>`
    : ''

  return `
    <button
      type="button"
      data-pictures-photo="${id}"
      class="pictures-thumb group flex min-w-0 cursor-pointer flex-col text-left"
    >
      <span class="pictures-thumb-media block overflow-hidden bg-sand-200">
        <img
          src="${assetUrl(photo.image)}"
          alt="${caption ? escapeHtml(caption) : ''}"
          class="pictures-thumb-image h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
      </span>
      ${captionMarkup}
    </button>
  `
}

function picturesTabButtonClass(category: PhotoCategory, active: PhotoCategory): string {
  return sectionTabButtonClass(category === active)
}

function renderPicturesTabs(active: PhotoCategory): string {
  const tabs = PHOTO_CATEGORIES.map(
    (id) => `
      <button
        type="button"
        data-pictures-tab="${id}"
        class="${picturesTabButtonClass(id, active)}"
        role="tab"
        aria-selected="${id === active}"
      >
        ${PHOTO_CATEGORY_LABELS[id]}
      </button>
    `,
  ).join('<span class="section-tabs__sep" aria-hidden="true">|</span>')

  return `
    <div class="section-tabs" role="tablist">
      ${tabs}
    </div>
  `
}

function renderPicturesPanel(category: PhotoCategory, active: PhotoCategory): string {
  const items = photoEntries.filter((entry) => entry.category === category)
  const content = items.length
    ? renderMediaStrip(items.map((entry) => renderPictureThumbnail(entry)).join(''))
    : `<p class="py-8 text-center text-base font-light text-gray-500">No photos in this category.</p>`

  return `
    <div
      data-pictures-panel="${category}"
      class="pictures-panel"
      role="tabpanel"
      ${category === active ? '' : 'hidden'}
    >
      ${content}
    </div>
  `
}

function renderPicturesGallery(): string {
  if (!photoEntries.length) {
    return `
      <p class="text-center text-lg font-light leading-relaxed text-gray-600">
        No photos listed at the moment.
      </p>
    `
  }

  const active: PhotoCategory = 'portraits'

  return `
    <div data-pictures-root data-active-tab="${active}">
      <div class="section-intro">
        <h2 class="section-intro__title text-center ${SECTION_TITLE_BASE}">PICTURES</h2>
        ${renderPicturesTabs(active)}
      </div>
      ${PHOTO_CATEGORIES.map((category) => renderPicturesPanel(category, active)).join('')}
    </div>
  `
}

function renderPicturesDetailShell(): string {
  return `
    <div
      data-pictures-detail
      class="pictures-detail fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-sand-50 px-6 py-24"
      hidden
    >
      ${renderMediaCloseButton('data-pictures-close', 'Close photo')}
      <figure class="flex w-full max-w-6xl flex-col items-center">
        <img
          data-pictures-detail-image
          alt=""
          class="pictures-detail-image max-h-[min(85vh,56rem)] w-auto max-w-full object-contain"
        />
        <figcaption
          data-pictures-detail-caption
          class="mt-6 hidden text-center text-sm font-light tracking-wide text-gray-500"
        ></figcaption>
      </figure>
    </div>
  `
}

function renderPicturesSection(): string {
  const hasPhotos = photoEntries.length > 0

  return `
    <section id="pictures" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        ${
          hasPhotos
            ? ''
            : `<h2 class="${SECTION_TITLE_MARGIN} text-center ${SECTION_TITLE_BASE}">PICTURES</h2>`
        }
        <div data-pictures-gallery-root>
          ${renderPicturesGallery()}
        </div>
      </div>
      ${renderPicturesDetailShell()}
    </section>
  `
}

function populatePicturesDetail(entry: PhotoEntry): void {
  const imageEl = document.querySelector<HTMLImageElement>('[data-pictures-detail-image]')
  const captionEl = document.querySelector<HTMLElement>('[data-pictures-detail-caption]')
  if (!imageEl || !captionEl) return

  const { photo } = entry
  imageEl.src = assetUrl(photo.image)
  const caption = photo.caption
  if (caption) {
    captionEl.textContent = caption
    captionEl.classList.remove('hidden')
    imageEl.alt = caption
  } else {
    captionEl.textContent = ''
    captionEl.classList.add('hidden')
    imageEl.alt = ''
  }
}

function clearPicturesDetail(): void {
  const imageEl = document.querySelector<HTMLImageElement>('[data-pictures-detail-image]')
  if (imageEl) {
    imageEl.removeAttribute('src')
    imageEl.alt = ''
  }
}

function openPicture(id: string): void {
  const entry = photoEntryById(id)
  if (!entry) return

  picturesSelectedPhotoId = id
  populatePicturesDetail(entry)

  const gallery = document.querySelector<HTMLElement>('[data-pictures-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-pictures-detail]')
  gallery?.setAttribute('hidden', '')
  detail?.removeAttribute('hidden')
  setMediaOverlayOpen(true)
}

function closePicture(): void {
  if (!picturesSelectedPhotoId) return

  picturesSelectedPhotoId = null
  clearPicturesDetail()

  const gallery = document.querySelector<HTMLElement>('[data-pictures-gallery-root]')
  const detail = document.querySelector<HTMLElement>('[data-pictures-detail]')
  gallery?.removeAttribute('hidden')
  detail?.setAttribute('hidden', '')
  setMediaOverlayOpen(false)

  const section = document.getElementById('pictures')
  if (section) scrollBelowSiteHeader(section, false)
}

function onMediaOverlayEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (listenSelectedVideoId) {
    event.preventDefault()
    closeListenVideo()
    return
  }
  if (programmeSelectedPath) {
    event.preventDefault()
    closeProgramme()
    return
  }
  if (picturesSelectedPhotoId) {
    event.preventDefault()
    closePicture()
  }
}

function bindListenSection(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-listen-video]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.listenVideo
      if (!id) return
      openListenVideo(id)
    })
  })

  document.querySelector<HTMLButtonElement>('[data-listen-close]')?.addEventListener('click', () => {
    closeListenVideo()
  })
}

function mediaStripCardScrollLeft(viewport: HTMLElement, card: HTMLElement): number {
  return card.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft
}

function scrollMediaStripByCard(viewport: HTMLElement, direction: -1 | 1): void {
  const grid = viewport.firstElementChild
  if (!grid) return

  const cards = Array.from(grid.children).filter((node): node is HTMLElement => node instanceof HTMLElement)
  if (!cards.length) return

  const scrollLeft = viewport.scrollLeft
  const slop = 4

  if (direction > 0) {
    const next = cards.find((card) => mediaStripCardScrollLeft(viewport, card) > scrollLeft + slop)
    if (next) {
      viewport.scrollTo({ left: mediaStripCardScrollLeft(viewport, next), behavior: 'smooth' })
    }
    return
  }

  const prev = [...cards].reverse().find((card) => mediaStripCardScrollLeft(viewport, card) < scrollLeft - slop)
  if (prev) {
    viewport.scrollTo({ left: mediaStripCardScrollLeft(viewport, prev), behavior: 'smooth' })
  }
}

function updateMediaStripNav(strip: HTMLElement): void {
  const viewport = strip.querySelector<HTMLElement>('[data-media-strip-viewport]')
  const prev = strip.querySelector<HTMLButtonElement>('[data-media-strip-prev]')
  const next = strip.querySelector<HTMLButtonElement>('[data-media-strip-next]')
  if (!viewport || !prev || !next) return

  const maxScroll = viewport.scrollWidth - viewport.clientWidth
  const overflow = maxScroll > 1
  prev.disabled = viewport.scrollLeft <= 1
  next.disabled = viewport.scrollLeft >= maxScroll - 1
  prev.hidden = !overflow
  next.hidden = !overflow
}

function applyPicturesTab(root: HTMLElement, tab: PhotoCategory): void {
  root.dataset.activeTab = tab

  root.querySelectorAll<HTMLButtonElement>('[data-pictures-tab]').forEach((button) => {
    const id = button.dataset.picturesTab as PhotoCategory | undefined
    if (!id) return
    button.className = picturesTabButtonClass(id, tab)
    button.setAttribute('aria-selected', String(id === tab))
  })

  root.querySelectorAll<HTMLElement>('[data-pictures-panel]').forEach((panel) => {
    const id = panel.dataset.picturesPanel as PhotoCategory | undefined
    if (id === tab) panel.removeAttribute('hidden')
    else panel.setAttribute('hidden', '')
  })

  const strip = root.querySelector<HTMLElement>(`[data-pictures-panel="${tab}"] [data-media-strip]`)
  const viewport = strip?.querySelector<HTMLElement>('[data-media-strip-viewport]')
  if (viewport) viewport.scrollLeft = 0
  if (strip) updateMediaStripNav(strip)
}

function bindPicturesSection(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-pictures-photo]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.picturesPhoto
      if (!id) return
      openPicture(id)
    })
  })

  document.querySelector<HTMLButtonElement>('[data-pictures-close]')?.addEventListener('click', () => {
    closePicture()
  })

  document.querySelectorAll<HTMLElement>('[data-pictures-root]').forEach((root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-pictures-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.picturesTab as PhotoCategory | undefined
        if (!tab || root.dataset.activeTab === tab) return
        applyPicturesTab(root, tab)
      })
    })
  })
}

function bindMediaStrips(): void {
  document.querySelectorAll<HTMLElement>('[data-media-strip]').forEach((strip) => {
    const viewport = strip.querySelector<HTMLElement>('[data-media-strip-viewport]')
    const prev = strip.querySelector<HTMLButtonElement>('[data-media-strip-prev]')
    const next = strip.querySelector<HTMLButtonElement>('[data-media-strip-next]')
    if (!viewport || !prev || !next) return

    const updateNav = (): void => updateMediaStripNav(strip)

    prev.addEventListener('click', () => scrollMediaStripByCard(viewport, -1))
    next.addEventListener('click', () => scrollMediaStripByCard(viewport, 1))
    viewport.addEventListener('scroll', updateNav, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(updateNav).observe(viewport)
    } else {
      window.addEventListener('resize', updateNav)
    }
    updateNav()
  })
}

const CONTACT_LINK_CLASS =
  'underline underline-offset-4 transition-colors'

function telHref(phone: string): string {
  const normalized = phone.trim().replace(/[^\d+]/g, '')
  return normalized ? `tel:${normalized}` : '#'
}

function renderContactSocialLink(
  url: string | undefined,
  iconSrc: string,
  label: string,
): string {
  const href = url?.trim()
  if (!href) return ''

  return `
    <a
      href="${href}"
      class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand-300/90 transition-colors hover:border-sand-600 hover:bg-sand-200/60"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${label} (opens in new tab)"
    >
      <img src="${assetUrl(iconSrc)}" alt="" class="h-5 w-5" width="20" height="20" loading="lazy" />
    </a>
  `
}

function renderContactSocialLinks(): string {
  const { socialMedia } = contact
  if (!socialMedia) return ''

  const links = [
    renderContactSocialLink(socialMedia.facebook, SOCIAL_ICON_SRC.facebook, 'Facebook'),
    renderContactSocialLink(socialMedia.youtube, SOCIAL_ICON_SRC.youtube, 'YouTube'),
    renderContactSocialLink(socialMedia.instagram, SOCIAL_ICON_SRC.instagram, 'Instagram'),
  ].filter(Boolean)

  if (!links.length) return ''

  return `<div class="contact-section__social">${links.join('')}</div>`
}

function renderContactEmailLink(email: string | undefined): string {
  const value = email?.trim()
  if (!value) return ''
  return `<a href="mailto:${encodeURIComponent(value)}" class="${CONTACT_LINK_CLASS}">${escapeHtml(value)}</a>`
}

function renderContactPhoneLink(phone: string | undefined): string {
  const value = phone?.trim()
  if (!value) return ''
  return `<a href="${telHref(value)}" class="${CONTACT_LINK_CLASS}">${escapeHtml(value)}</a>`
}

function renderContactSection(): string {
  const agencyName = contact.agency?.name?.trim() || 'Göran Eliasson'
  const agencyEmail = renderContactEmailLink(contact.agency?.email)
  const agencyPhone = renderContactPhoneLink(contact.agency?.phone)
  const lovisaEmail = renderContactEmailLink(contact.lovisa?.email)

  const agencyLines = [agencyEmail, agencyPhone].filter(Boolean).join('<br />')

  return `
    <section id="contact" class="contact-section" aria-labelledby="contact-heading">
      <img
        src="${assetUrl(CONTACT_IMAGE_SRC)}"
        alt=""
        class="contact-section__image"
        loading="lazy"
        decoding="async"
      />
      <div class="contact-section__panel">
        <div class="contact-section__card">
          <h2 id="contact-heading" class="contact-section__title">CONTACT</h2>
          <p class="contact-section__intro">Lovisa Huledal is represented by</p>
          <div class="contact-section__block">
            <p class="contact-section__label">ELIASSON ARTISTS STOCKHOLM</p>
            <p class="contact-section__person">${escapeHtml(agencyName)}</p>
            ${agencyLines ? `<p class="contact-section__details">${agencyLines}</p>` : ''}
          </div>
          <div class="contact-section__block">
            <p class="contact-section__intro">
              If you wish to come in contact with Lovisa herself, please use the information below:
            </p>
            ${lovisaEmail ? `<p class="contact-section__details">${lovisaEmail}</p>` : ''}
            ${renderContactSocialLinks()}
          </div>
        </div>
      </div>
    </section>
  `
}

function renderAboutSection(): string {
  const { preview, rest, hasMore } = splitBiography(biographyMarkdown())
  const activeClass = 'text-gray-900 border-b border-gray-900'
  const inactiveClass = 'text-gray-400 hover:text-gray-600'

  return `
    <section id="about" class="px-6 ${ABOUT_SECTION_PADDING}">
      <div class="relative mx-auto max-w-7xl">
        <div class="about-lang absolute right-0 top-0 z-10 flex gap-6 text-sm tracking-widest">
          <button type="button" data-lang="sv" class="cursor-pointer select-none ${language === 'sv' ? activeClass : inactiveClass} transition-colors">SV</button>
          <button type="button" data-lang="en" class="cursor-pointer select-none ${language === 'en' ? activeClass : inactiveClass} transition-colors">EN</button>
        </div>

        <h2 class="${ABOUT_SECTION_TITLE_MARGIN} text-center ${SECTION_TITLE_BASE}">ABOUT</h2>

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

function stopProgrammeDetailAutoplay(): void {
  if (programmeDetailAutoplayTimer !== null) {
    clearInterval(programmeDetailAutoplayTimer)
    programmeDetailAutoplayTimer = null
  }
  programmeDetailAutoplayCarousel = null
}

function startProgrammeDetailAutoplay(carousel: HTMLElement): void {
  stopProgrammeDetailAutoplay()

  const count = Number(carousel.dataset.slideCount ?? 0)
  if (count <= 1) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  programmeDetailAutoplayCarousel = carousel
  programmeDetailAutoplayTimer = setInterval(() => {
    const current = Number(carousel.dataset.slideIndex ?? 0)
    showProgrammeCarouselSlide(carousel, current + 1)
  }, PROGRAMME_DETAIL_AUTOPLAY_MS)
}

function resetProgrammeDetailAutoplay(carousel: HTMLElement): void {
  if (programmeDetailAutoplayCarousel !== carousel) return
  startProgrammeDetailAutoplay(carousel)
}

function showProgrammeCarouselSlide(carousel: HTMLElement, index: number): void {
  const slides = [...carousel.querySelectorAll<HTMLImageElement>('[data-carousel-slide]')]
  if (!slides.length) return

  const count = slides.length
  const next = ((index % count) + count) % count

  carousel.dataset.slideIndex = String(next)
  const useFade = carousel.classList.contains('programme-detail-media__carousel')
  slides.forEach((slide, i) => {
    const active = i === next
    if (useFade) {
      slide.style.opacity = active ? '1' : '0'
      slide.style.zIndex = active ? '1' : '0'
      slide.removeAttribute('hidden')
    } else if (active) slide.removeAttribute('hidden')
    else slide.setAttribute('hidden', '')
  })

  carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]').forEach((dot) => {
    const i = Number(dot.dataset.carouselDot)
    const active = i === next
    dot.setAttribute('aria-current', String(active))
  })
}

function bindProgrammeCarousel(carousel: HTMLElement, options?: { autoplay?: boolean }): void {
  const count = Number(carousel.dataset.slideCount ?? 0)
  const autoplay = options?.autoplay ?? false

  const step = (delta: number, fromUser = false) => {
    if (count <= 1) return
    const current = Number(carousel.dataset.slideIndex ?? 0)
    showProgrammeCarouselSlide(carousel, current + delta)
    if (fromUser && autoplay) resetProgrammeDetailAutoplay(carousel)
  }

  carousel.querySelector<HTMLButtonElement>('[data-carousel-prev]')?.addEventListener('click', () => {
    step(-1, true)
  })

  carousel.querySelector<HTMLButtonElement>('[data-carousel-next]')?.addEventListener('click', () => {
    step(1, true)
  })

  carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]').forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = Number(dot.dataset.carouselDot)
      if (!Number.isNaN(index)) {
        showProgrammeCarouselSlide(carousel, index)
        if (autoplay) resetProgrammeDetailAutoplay(carousel)
      }
    })
  })

  showProgrammeCarouselSlide(carousel, Number(carousel.dataset.slideIndex ?? 0))

  if (count <= 1) return

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1, true)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1, true)
    }
  })

  if (!autoplay) return

  startProgrammeDetailAutoplay(carousel)

  carousel.addEventListener('mouseenter', stopProgrammeDetailAutoplay)
  carousel.addEventListener('mouseleave', () => startProgrammeDetailAutoplay(carousel))
  carousel.addEventListener('focusin', stopProgrammeDetailAutoplay)
  carousel.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (!next || !carousel.contains(next as Node)) startProgrammeDetailAutoplay(carousel)
  })
}

function bindProgrammeCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-programme-carousel]').forEach((carousel) => {
    bindProgrammeCarousel(carousel)
  })
}

function bindProgrammesSection(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-programme-card]').forEach((button) => {
    button.addEventListener('click', () => {
      const path = button.dataset.programmeCard
      if (!path) return
      openProgramme(path)
    })
  })

  document.querySelector<HTMLButtonElement>('[data-programme-close]')?.addEventListener('click', () => {
    closeProgramme()
  })
}

function clearScheduleHighlights(): void {
  document.querySelectorAll('.calendar-event--highlight').forEach((el) => {
    el.classList.remove('calendar-event--highlight')
  })
}

function highlightScheduleEventsForProgramme(programmePath: string): void {
  clearScheduleHighlights()
  const rows = document.querySelectorAll<HTMLElement>(
    `[data-calendar-event][data-programme-path="${programmePath}"]`,
  )
  rows.forEach((row) => row.classList.add('calendar-event--highlight'))
  if (rows.length) {
    window.setTimeout(clearScheduleHighlights, SCHEDULE_HIGHLIGHT_MS)
  }
}

function getSiteHeaderScrollOffset(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--site-header-height')
    .trim()
  const parsed = parseFloat(raw)
  if (!Number.isNaN(parsed) && parsed > 0) return parsed
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  return header?.offsetHeight ?? 112
}

function scrollBelowSiteHeader(element: HTMLElement, smooth: boolean): void {
  const y = element.getBoundingClientRect().top + window.scrollY - getSiteHeaderScrollOffset()
  window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'instant' })
}

function applyScheduleTab(root: HTMLElement, tab: ScheduleTab): void {
  root.dataset.activeTab = tab

  root.querySelectorAll<HTMLButtonElement>('[data-calendar-tab]').forEach((button) => {
    const id = button.dataset.calendarTab as ScheduleTab | undefined
    if (!id) return
    button.className = calendarTabButtonClass(id, tab)
    button.setAttribute('aria-selected', String(id === tab))
  })

  root.querySelectorAll<HTMLElement>('[data-calendar-panel]').forEach((panel) => {
    const id = panel.dataset.calendarPanel as ScheduleTab | undefined
    if (id === tab) panel.removeAttribute('hidden')
    else panel.setAttribute('hidden', '')
  })
}

function revealCalendarPanelExtras(panel: HTMLElement): void {
  panel.querySelectorAll<HTMLElement>('[data-calendar-extra]').forEach((row) => {
    row.removeAttribute('hidden')
  })
  panel.querySelector<HTMLButtonElement>('[data-calendar-show-more]')?.remove()
}

function showScheduleTabForEvent(eventId: string): void {
  const row = document.getElementById(calendarEventDomId(eventId))
  const root = document.querySelector<HTMLElement>('[data-calendar-root]')
  if (!row || !root) return

  const panel = row.closest<HTMLElement>('[data-calendar-panel]')
  const tab = panel?.dataset.calendarPanel as ScheduleTab | undefined
  if (tab) applyScheduleTab(root, tab)
  if (panel && row.hasAttribute('hidden')) revealCalendarPanelExtras(panel)
}

function navigateToProgrammeSchedule(programmePath: string): void {
  const calendar = document.getElementById('calendar')
  if (!calendar) return

  const root = document.querySelector<HTMLElement>('[data-calendar-root]')
  if (root) applyScheduleTab(root, 'upcoming')

  const programmeEvents = eventsForProgramme(programmePath)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const smooth = !reducedMotion

  const firstId = programmeEvents[0]?.id
  const firstRow = firstId ? document.getElementById(calendarEventDomId(firstId)) : null
  if (firstRow) {
    const panel = firstRow.closest<HTMLElement>('[data-calendar-panel]')
    if (panel && firstRow.hasAttribute('hidden')) revealCalendarPanelExtras(panel)
  }
  const target = firstRow ?? calendar

  scrollBelowSiteHeader(target, smooth)

  if (reducedMotion) highlightScheduleEventsForProgramme(programmePath)
  else window.setTimeout(() => highlightScheduleEventsForProgramme(programmePath), 450)
}

function bindScheduleShowMore(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-calendar-show-more]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = button.closest<HTMLElement>('[data-calendar-panel]')
      if (!panel) return
      revealCalendarPanelExtras(panel)
    })
  })
}

function bindScheduleTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-calendar-root]').forEach((root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-calendar-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.calendarTab as ScheduleTab | undefined
        if (!tab || root.dataset.activeTab === tab) return
        applyScheduleTab(root, tab)
      })
    })
  })
}

function bindScheduleNavigation(): void {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-programme-calendar-link]')
    if (!link) return
    event.preventDefault()
    const programmePath = link.dataset.programmePath
    if (!programmePath) return
    if (programmeSelectedPath) closeProgramme()
    navigateToProgrammeSchedule(programmePath)
  })

  const hash = window.location.hash.slice(1)
  if (!hash.startsWith('calendar')) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (hash === 'calendar') {
    const section = document.getElementById('calendar')
    if (section) scrollBelowSiteHeader(section, !reducedMotion)
    return
  }

  const row = document.getElementById(hash)
  if (!row) return

  const panel = row.closest<HTMLElement>('[data-calendar-panel]')
  if (panel && row.hasAttribute('hidden')) revealCalendarPanelExtras(panel)

  const eventId = row.dataset.eventId
  if (eventId) showScheduleTabForEvent(eventId)

  scrollBelowSiteHeader(row, !reducedMotion)
  const programmePath = row.dataset.programmePath
  if (programmePath) highlightScheduleEventsForProgramme(programmePath)
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
    <main>
      <section id="home" class="relative h-screen w-full hero-image md:mb-5">
        ${renderHeroHeadings()}
        <footer data-site-header class="site-header" aria-label="Site navigation">
          <div class="site-header__inner">
            <nav class="site-nav">
              <div class="site-nav-row">
                <a href="#about" class="site-nav-link">ABOUT</a>
                <a href="#calendar" class="site-nav-link">CALENDAR</a>
                <a href="#listen" class="site-nav-link">LISTEN</a>
              </div>
              <div class="site-nav-row">
                <a href="#pictures" class="site-nav-link">PICTURES</a>
                <a href="#programmes" class="site-nav-link">PROGRAMMES</a>
                <a href="#contact" class="site-nav-link">CONTACT</a>
              </div>
            </nav>
          </div>
        </footer>
      </section>

      ${renderAboutSection()}

      ${renderScheduleSection()}

      ${renderListenSection()}

      ${renderPicturesSection()}

      ${renderProgrammesSection()}

      ${renderContactSection()}
    </main>
  `
}

function syncSiteHeaderHeight(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  if (!header) return
  const stuck = header.classList.contains('site-header--stuck')
  const height = stuck ? header.offsetHeight : 0
  document.documentElement.style.setProperty('--site-header-height', `${height}px`)
}

function bindSiteHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  const hero = document.getElementById('home')
  if (!header || !hero) return

  const footerStickScrollY = () =>
    hero.offsetTop + hero.offsetHeight - header.offsetHeight

  const syncStuck = () => {
    const stuck = window.scrollY >= footerStickScrollY()
    header.classList.toggle('site-header--stuck', stuck)
    header.toggleAttribute('data-stuck', stuck)
    syncSiteHeaderHeight()
  }

  let scrollScheduled = false
  const onScroll = () => {
    if (scrollScheduled) return
    scrollScheduled = true
    requestAnimationFrame(() => {
      syncStuck()
      scrollScheduled = false
    })
  }

  const onResize = () => syncStuck()

  syncStuck()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(onResize).observe(header)
  }
}

syncHeroBackground()
syncSiteFonts(content.typography)
syncSiteIcon({
  siteIcon: content.siteIcon,
  heroImage: content.heroImage?.image,
  defaultImage: DEFAULT_HERO_IMAGE,
  resolveAssetUrl: assetUrl,
})
renderApp()
bindSiteHeader()
bindAboutSection()
bindProgrammeCarousels()
bindProgrammesSection()
bindScheduleTabs()
bindScheduleShowMore()
bindScheduleNavigation()
bindListenSection()
bindPicturesSection()
bindMediaStrips()
document.addEventListener('keydown', onMediaOverlayEscape)
