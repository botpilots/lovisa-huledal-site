import './style.css'
import { animateAboutLayout } from './about-layout-animation'
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

type HeroTitlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface HomeContent {
  title?: string
  titlePosition?: string
  biography: string
  biographyEn: string
  aboutMosaic: MosaicImage[]
}

const HERO_TITLE_POSITION_CLASS: Record<HeroTitlePosition, string> = {
  'top-left': 'hero-title--top left-0 text-left',
  'top-right': 'hero-title--top right-0 text-right',
  'bottom-left': 'bottom-0 left-0 text-left',
  'bottom-right': 'bottom-0 right-0 text-right',
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
  /** Optional stable id for schedule anchors; defaults to the event filename (without .json). */
  id?: string
  date: string
  time?: string
  name?: string
  location?: string
  description?: string
  link?: string
  programme?: string
}

interface EventEntry {
  /** Same as `id` on the JSON file, or derived from filename e.g. `2026-07-30-la-liberazione`. */
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

const HERO_BACKGROUND_IMAGE = '/media/6-lovisa-huledal-med-inlevelse-framfor-orkester.jpeg'

const AGENCY_LOGO_SRC = '/media/c50241_ff6d03952d35443998f5dca8861f44e6~mv2.avif'

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

document.documentElement.style.setProperty(
  '--hero-background-image',
  `url(${assetUrl(HERO_BACKGROUND_IMAGE)})`,
)

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

function scheduleEventDomId(eventId: string): string {
  return `schedule-event-${eventId}`
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
  portraits: 'PORTRAITS',
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
    const id = event.id?.trim() || eventIdFromGlob(filePath)
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

const SECTION_PADDING_Y = 'py-16'
const SECTION_TITLE_MARGIN = 'mb-8'
const PROGRAMME_TABS_CLASS =
  'programme-tabs mb-4 grid w-full shrink-0 py-2 lg:mb-8 lg:py-4'

const PROGRAMME_LAYOUT = 'programme-grid grid min-w-0 gap-5 md:grid-cols-5 md:items-start md:gap-10'
const PROGRAMME_MEDIA_STACK = 'programme-media-stack'
const PROGRAMME_MEDIA_STACK_WITH_IMAGE = 'programme-media-stack programme-media-stack--with-carousel'
const PROGRAMME_TAB_BASE =
  'justify-self-center w-fit cursor-pointer select-none text-sm tracking-widest transition-colors'
const PROGRAMME_TAB_ACTIVE = 'text-gray-900 border-b border-gray-900'
const PROGRAMME_TAB_INACTIVE = 'text-gray-400 hover:text-gray-600'

type ProgrammeTab = 'description' | 'repertoire'

const SCHEDULE_SCROLL_OFFSET_PX = 96
const SCHEDULE_HIGHLIGHT_MS = 3200
const EVENT_DATE_FORMAT = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const content = home as HomeContent

let language: Language = 'sv'
let aboutExpanded = false
let listenSelectedVideoId: string | null = null
let picturesSelectedPhotoId: string | null = null

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

function parseHeroTitlePosition(raw: string | undefined): HeroTitlePosition {
  const value = raw?.trim() as HeroTitlePosition | undefined
  if (value && value in HERO_TITLE_POSITION_CLASS) return value
  return 'bottom-left'
}

function renderHeroTitle(): string {
  const title = content.title?.trim()
  if (!title) return ''

  const position = parseHeroTitlePosition(content.titlePosition)

  return `
    <p class="hero-title absolute z-10 p-6 text-xl font-light italic tracking-[0.2em] text-white/95 md:p-10 md:text-2xl ${HERO_TITLE_POSITION_CLASS[position]}">
      ${escapeHtml(title)}
    </p>
  `
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

function isPriorEvent(event: Event): boolean {
  return !isUpcomingEvent(event)
}

function upcomingEvents(): EventEntry[] {
  return eventEntries.filter((entry) => isUpcomingEvent(entry.event))
}

function priorEvents(): EventEntry[] {
  return eventEntries
    .filter((entry) => isPriorEvent(entry.event))
    .sort(
      (a, b) =>
        b.event.date.localeCompare(a.event.date) ||
        (b.event.time ?? '').localeCompare(a.event.time ?? ''),
    )
}

function eventsForProgramme(programmePath: string): EventEntry[] {
  return upcomingEvents().filter((entry) => entry.event.programme === programmePath)
}

function programmeTitleForPath(programmePath: string): string | undefined {
  return programmeEntries.find((entry) => entry.path === programmePath)?.programme.title
}

/** Name, or programme title; with programme in parentheses when both are set. */
function scheduleEventDisplayTitle(event: Event): string {
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

function renderProgrammeCarouselFrame(images: ProgrammeImage[]): string {
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

  const multi = images.length > 1
  const controls = multi
    ? `${renderProgrammeCarouselChevron('prev')}${renderProgrammeCarouselChevron('next')}`
    : ''

  return `
    <div class="programme-media-frame relative min-h-0 overflow-hidden bg-sand-200">
      <div class="absolute inset-0">${slides}</div>
      ${controls}
    </div>
  `
}

function renderProgrammeCarouselDotsBar(count: number): string {
  return `
    <div class="programme-carousel-dots" data-carousel-dots>
      ${renderProgrammeCarouselDots(count)}
    </div>
  `
}

function programmeAvailableTabs(programme: Programme): ProgrammeTab[] {
  const tabs: ProgrammeTab[] = ['description']
  if (programme.repertoire?.length) tabs.push('repertoire')
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
      aria-label="Tickets for ${scheduleEventDisplayTitle(event)} (opens in new tab)"
    >
      TICKETS
      ${renderExternalLinkIcon(14)}
    </a>
  `
}

function renderScheduleEventDetails(event: Event): string {
  const title = `<span class="text-gray-900">${scheduleEventDisplayTitle(event)}</span>`
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

function renderScheduleEventRow(entry: EventEntry): string {
  const { event, id } = entry
  const programmePath = event.programme ?? ''
  const tickets = renderEventTicketsLink(event)

  return `
    <li
      id="${scheduleEventDomId(id)}"
      data-schedule-event
      data-event-id="${id}"
      data-programme-path="${programmePath}"
      class="schedule-event rounded-sm py-4 md:py-5"
    >
      <div class="schedule-event-row mx-auto grid max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-x-5 text-lg font-light leading-relaxed md:gap-x-10">
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

function renderScheduleEventList(entries: EventEntry[], emptyMessage: string): string {
  if (!entries.length) {
    return `<p class="py-8 text-center text-base font-light text-gray-500">${emptyMessage}</p>`
  }

  return `<ul class="schedule-list divide-y divide-sand-200/80">${entries.map((entry) => renderScheduleEventRow(entry)).join('')}</ul>`
}

function renderScheduleTabs(active: ScheduleTab): string {
  const tabs: ScheduleTab[] = ['upcoming', 'prior']
  return tabs
    .map(
      (id) => `
        <button
          type="button"
          data-schedule-tab="${id}"
          class="${scheduleTabButtonClass(id, active)}"
          role="tab"
          aria-selected="${id === active}"
        >
          ${SCHEDULE_TAB_LABELS[id]}
        </button>
      `,
    )
    .join('')
}

function renderScheduleSection(): string {
  const upcoming = upcomingEvents()
  const prior = priorEvents()
  const hasAny = upcoming.length > 0 || prior.length > 0
  const active: ScheduleTab = 'upcoming'

  if (!hasAny) {
    return `
      <section id="schedule" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="${SECTION_TITLE_MARGIN} text-3xl font-light tracking-widest text-gray-900">SCHEDULE</h2>
          <p class="text-lg font-light leading-relaxed text-gray-600">
            No performances listed at the moment.
          </p>
        </div>
      </section>
    `
  }

  return `
    <section id="schedule" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-5xl">
        <h2 class="${SECTION_TITLE_MARGIN} text-center text-3xl font-light tracking-widest text-gray-900">SCHEDULE</h2>
        <div data-schedule-root data-active-tab="${active}">
          <div
            class="${PROGRAMME_TABS_CLASS} mx-auto max-w-md"
            role="tablist"
            style="grid-template-columns: repeat(2, minmax(0, 1fr))"
          >
            ${renderScheduleTabs(active)}
          </div>
          <div data-schedule-panel="upcoming" class="schedule-panel">
            ${renderScheduleEventList(upcoming, 'No upcoming performances.')}
          </div>
          <div data-schedule-panel="prior" class="schedule-panel" hidden>
            ${renderScheduleEventList(prior, 'No prior performances.')}
          </div>
        </div>
      </div>
    </section>
  `
}

function programmeUpcomingBannerCorner(index: number): 'left' | 'right' {
  // Odd index: media column on the right — place banner top-left (incl. title-only blocks).
  return programmeColumnOrders(index).titleAlign === 'text-right' ? 'left' : 'right'
}

function renderProgrammeUpcomingBanner(
  programmePath: string,
  count: number,
  corner: 'left' | 'right',
): string {
  if (count <= 0) return ''

const label = count === 1 ? '1 upcoming event!' : `${count} upcoming events!`
  const positionClass =
    corner === 'left'
      ? 'left-3 top-2.5 text-left md:left-5 md:top-5'
      : 'right-3 top-2.5 text-right md:right-5 md:top-5'

  return `
    <a
      href="#schedule"
      data-programme-schedule-link
      data-programme-path="${programmePath}"
      class="absolute z-10 max-w-xs cursor-pointer text-xs italic tracking-wide text-white/95 transition-colors hover:underline hover:text-white ${positionClass}"
 
 
    >
      ${label}
    </a>
  `
}

function renderProgrammeTitleBlock(title: string): string {
  return `
    <p class="programme-media-title-label">PROGRAMME</p>
    <h3 class="programme-media-title-heading">${title}</h3>
  `
}

function renderProgrammeMediaHeader(
  programmeTitle: string,
  programmePath: string,
  titleAlign: string,
  bgStyle: string,
  options: { centered?: boolean; index?: number } = {},
): string {
  const { centered = false, index = 0 } = options
  const upcomingCount = eventsForProgramme(programmePath).length
  const corner = programmeUpcomingBannerCorner(index)
  const banner = renderProgrammeUpcomingBanner(programmePath, upcomingCount, corner)
  const align = centered ? 'text-center' : titleAlign

  return `
    <header
      class="programme-media-header relative shrink-0 border-b-2 border-white"
      style="${bgStyle}"
    >
      ${banner}
      <div class="${align}">
        ${renderProgrammeTitleBlock(programmeTitle)}
      </div>
    </header>
  `
}

function tabButtonClass(isActive: boolean): string {
  return `${PROGRAMME_TAB_BASE} ${isActive ? PROGRAMME_TAB_ACTIVE : PROGRAMME_TAB_INACTIVE}`
}

function programmeTabButtonClass(tab: ProgrammeTab, active: ProgrammeTab): string {
  return tabButtonClass(tab === active)
}

type ScheduleTab = 'upcoming' | 'prior'

const SCHEDULE_TAB_LABELS: Record<ScheduleTab, string> = {
  upcoming: 'UPCOMING',
  prior: 'PRIOR',
}

function scheduleTabButtonClass(tab: ScheduleTab, active: ScheduleTab): string {
  return tabButtonClass(tab === active)
}

const PROGRAMME_TAB_LABELS: Record<ProgrammeTab, string> = {
  description: 'DESCRIPTION',
  repertoire: 'REPERTOIRE',
}

function renderProgrammeTabs(available: ProgrammeTab[], active: ProgrammeTab): string {
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
          ${PROGRAMME_TAB_LABELS[id]}
        </button>
      `,
    )
    .join('')
}

function renderProgrammeCopyColumn(programme: Programme, copyOrder: string): string {
  const available = programmeAvailableTabs(programme)
  const active: ProgrammeTab = 'description'
  const showTabs = available.length > 1

  const tabsMarkup = showTabs
    ? `
        <div
          class="${PROGRAMME_TABS_CLASS}"
          role="tablist"
          style="grid-template-columns: repeat(${available.length}, minmax(0, 1fr))"
        >
          ${renderProgrammeTabs(available, active)}
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

  return `
    <div data-programme-copy class="min-w-0 ${copyOrder}">
      <div data-programme-root data-active-tab="${active}">
        ${tabsMarkup}
        <div class="programme-panels">
          <div data-programme-panel="description" class="programme-panel">
            <div class="${BIOGRAPHY_PROSE}">${renderMarkdown(programme.description)}</div>
          </div>
          ${repertoirePanel}
        </div>
      </div>
    </div>
  `
}

/** Copy 3/5, media 2/5 from md up; single column below md. Alternates left / right on md+. */
function programmeColumnOrders(index: number): { copy: string; media: string; titleAlign: string } {
  const mediaOnRight = index % 2 === 1
  return {
    copy: mediaOnRight
      ? 'order-2 md:order-1 md:col-span-3'
      : 'order-2 md:order-2 md:col-span-3 md:col-start-3',
    media: mediaOnRight
      ? 'order-1 md:order-2 md:col-span-2 md:col-start-4'
      : 'order-1 md:order-1 md:col-span-2',
    titleAlign: mediaOnRight ? 'text-right' : 'text-left',
  }
}

function renderProgrammeMedia(
  programme: Programme,
  index: number,
  headerColor: string,
  programmePath: string,
): string {
  const { media, titleAlign } = programmeColumnOrders(index)
  const bgStyle = `background-color: ${headerColor}`
  const images = getProgrammeImages(programme)

  if (!images.length) {
    return `
      <div data-programme-media class="min-w-0 ${media}">
        <div class="${PROGRAMME_MEDIA_STACK} programme-media-stack--title-only relative w-full" style="${bgStyle}">
          ${renderProgrammeMediaHeader(programme.title, programmePath, titleAlign, bgStyle, {
            centered: true,
            index,
          })}
        </div>
      </div>
    `
  }

  const multi = images.length > 1

  return `
    <div data-programme-media class="min-w-0 ${media}">
      <div
        class="programme-media-group"
        data-programme-carousel
        data-slide-index="0"
        data-slide-count="${images.length}"
      >
        <div class="${PROGRAMME_MEDIA_STACK_WITH_IMAGE}">
          ${renderProgrammeMediaHeader(programme.title, programmePath, titleAlign, bgStyle, {
            index,
          })}
          ${renderProgrammeCarouselFrame(images)}
        </div>
        ${multi ? renderProgrammeCarouselDotsBar(images.length) : ''}
      </div>
    </div>
  `
}

function renderProgramme(entry: ProgrammeEntry, index: number, headerColor: string): string {
  const { programme, path } = entry
  const { copy } = programmeColumnOrders(index)
  const divider = index > 0 ? 'border-t border-sand-300/60 pt-12' : ''

  return `
    <article class="${divider}">
      <div class="${PROGRAMME_LAYOUT}">
        ${renderProgrammeCopyColumn(programme, copy)}
        ${renderProgrammeMedia(programme, index, headerColor, path)}
      </div>
    </article>
  `
}

function renderProgrammesSection(): string {
  if (!programmeEntries.length) return ''

  const headerColors = assignProgrammeHeaderColors(programmeEntries)

  return `
    <section id="programmes" class="bg-sand-100 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        <h2 class="select-none ${SECTION_TITLE_MARGIN} text-center text-3xl font-light tracking-widest text-gray-900">PROGRAMMES</h2>
        <div class="space-y-12">
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
      <span class="listen-thumb-media relative block aspect-video overflow-hidden bg-sand-200">
        <img
          src="${youtubeThumbnailUrl(ytId)}"
          alt=""
          class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

function renderListenGallery(): string {
  const items = videoEntries.map((entry) => renderListenThumbnail(entry)).filter(Boolean)

  if (!items.length) {
    return `
      <p class="text-center text-lg font-light leading-relaxed text-gray-600">
        No videos listed at the moment.
      </p>
    `
  }

  return `<div class="listen-gallery">${items.join('')}</div>`
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
        <div class="${PROGRAMME_LAYOUT}">
          <div class="listen-embed min-w-0 overflow-hidden bg-sand-200">
            <iframe
              data-listen-iframe
              class="listen-embed-frame h-full w-full"
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
        <h2 class="select-none ${SECTION_TITLE_MARGIN} text-center text-3xl font-light tracking-widest text-gray-900">LISTEN</h2>
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
  if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' })
}

function photoEntryById(id: string): PhotoEntry | undefined {
  return photoEntries.find((entry) => entry.id === id)
}

function renderPictureThumbnail(entry: PhotoEntry): string {
  const { photo, id } = entry
  const caption = photo.caption

  const captionMarkup = caption
    ? `<p class="mt-4 text-sm font-light tracking-wide text-gray-500">${escapeHtml(caption)}</p>`
    : ''

  return `
    <button
      type="button"
      data-pictures-photo="${id}"
      class="pictures-thumb group flex min-w-0 cursor-pointer flex-col text-left"
    >
      <span class="block overflow-hidden bg-sand-200">
        <img
          src="${assetUrl(photo.image)}"
          alt="${caption ? escapeHtml(caption) : ''}"
          class="pictures-thumb-image w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
      </span>
      ${captionMarkup}
    </button>
  `
}

function renderPicturesCategory(category: PhotoCategory): string {
  const items = photoEntries.filter((entry) => entry.category === category)
  if (!items.length) return ''

  return `
    <div class="pictures-category">
      <h3 class="mb-10 text-center text-sm font-normal tracking-[0.25em] text-sand-800">${PHOTO_CATEGORY_LABELS[category]}</h3>
      <div class="pictures-grid">
        ${items.map((entry) => renderPictureThumbnail(entry)).join('')}
      </div>
    </div>
  `
}

function renderPicturesGallery(): string {
  const blocks = PHOTO_CATEGORIES.map((category) => renderPicturesCategory(category)).filter(Boolean)

  if (!blocks.length) {
    return `
      <p class="text-center text-lg font-light leading-relaxed text-gray-600">
        No photos listed at the moment.
      </p>
    `
  }

  return `<div class="space-y-20">${blocks.join('')}</div>`
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
  return `
    <section id="pictures" class="bg-sand-50 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        <h2 class="select-none ${SECTION_TITLE_MARGIN} text-center text-3xl font-light tracking-widest text-gray-900">PICTURES</h2>
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
  if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' })
}

function onMediaOverlayEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (listenSelectedVideoId) {
    event.preventDefault()
    closeListenVideo()
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
}

const CONTACT_LINK_CLASS =
  'text-sand-800 underline decoration-sand-300 underline-offset-4 transition-colors hover:text-gray-900'

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

  return `<div class="mt-10 flex flex-wrap gap-3">${links.join('')}</div>`
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
    <section id="contact" class="bg-sand-100 px-6 ${SECTION_PADDING_Y}">
      <div class="mx-auto max-w-7xl">
        <h2 class="select-none ${SECTION_TITLE_MARGIN} text-center text-3xl font-light tracking-widest text-gray-900">CONTACT</h2>
        <div class="contact-layout mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-start lg:gap-16">
          <div class="flex justify-center lg:justify-start">
            <img
              src="${assetUrl(AGENCY_LOGO_SRC)}"
              alt="Eliasson Artists Stockholm"
              class="contact-agency-logo w-full max-w-[16rem] object-contain"
              loading="lazy"
            />
          </div>
          <div class="min-w-0 text-lg font-light leading-relaxed text-gray-600">
            <p>
              Lovisa Huledal is represented by
              <span class="text-gray-900">${escapeHtml(agencyName)}</span>
              at Eliasson Artists Stockholm:
            </p>
            ${agencyLines ? `<p class="mt-4">${agencyLines}</p>` : ''}
            <p class="mt-8">
              If you wish to come in contact with Lovisa herself, please use the information below:
            </p>
            ${lovisaEmail ? `<p class="mt-4">${lovisaEmail}</p>` : ''}
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
    <section id="about" class="px-6 pt-12 pb-16">
      <div class="relative mx-auto max-w-7xl">
        <div class="about-lang absolute right-0 top-0 z-10 flex gap-6 text-sm tracking-widest">
          <button type="button" data-lang="sv" class="cursor-pointer select-none ${language === 'sv' ? activeClass : inactiveClass} transition-colors">SV</button>
          <button type="button" data-lang="en" class="cursor-pointer select-none ${language === 'en' ? activeClass : inactiveClass} transition-colors">EN</button>
        </div>

        <h2 class="select-none mb-12 text-center text-3xl font-light tracking-widest text-gray-900">ABOUT</h2>

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

function clearScheduleHighlights(): void {
  document.querySelectorAll('.schedule-event--highlight').forEach((el) => {
    el.classList.remove('schedule-event--highlight')
  })
}

function highlightScheduleEventsForProgramme(programmePath: string): void {
  clearScheduleHighlights()
  const rows = document.querySelectorAll<HTMLElement>(
    `[data-schedule-event][data-programme-path="${programmePath}"]`,
  )
  rows.forEach((row) => row.classList.add('schedule-event--highlight'))
  if (rows.length) {
    window.setTimeout(clearScheduleHighlights, SCHEDULE_HIGHLIGHT_MS)
  }
}

function scrollToScheduleTarget(element: HTMLElement, smooth: boolean): void {
  const y = element.getBoundingClientRect().top + window.scrollY - SCHEDULE_SCROLL_OFFSET_PX
  window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'instant' })
}

function applyScheduleTab(root: HTMLElement, tab: ScheduleTab): void {
  root.dataset.activeTab = tab

  root.querySelectorAll<HTMLButtonElement>('[data-schedule-tab]').forEach((button) => {
    const id = button.dataset.scheduleTab as ScheduleTab | undefined
    if (!id) return
    button.className = scheduleTabButtonClass(id, tab)
    button.setAttribute('aria-selected', String(id === tab))
  })

  root.querySelectorAll<HTMLElement>('[data-schedule-panel]').forEach((panel) => {
    const id = panel.dataset.schedulePanel as ScheduleTab | undefined
    if (id === tab) panel.removeAttribute('hidden')
    else panel.setAttribute('hidden', '')
  })
}

function showScheduleTabForEvent(eventId: string): void {
  const row = document.getElementById(scheduleEventDomId(eventId))
  const root = document.querySelector<HTMLElement>('[data-schedule-root]')
  if (!row || !root) return

  const panel = row.closest<HTMLElement>('[data-schedule-panel]')
  const tab = panel?.dataset.schedulePanel as ScheduleTab | undefined
  if (tab) applyScheduleTab(root, tab)
}

function navigateToProgrammeSchedule(programmePath: string): void {
  const schedule = document.getElementById('schedule')
  if (!schedule) return

  const root = document.querySelector<HTMLElement>('[data-schedule-root]')
  if (root) applyScheduleTab(root, 'upcoming')

  const programmeEvents = eventsForProgramme(programmePath)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const smooth = !reducedMotion

  const firstId = programmeEvents[0]?.id
  const firstRow = firstId ? document.getElementById(scheduleEventDomId(firstId)) : null
  const target = firstRow ?? schedule

  scrollToScheduleTarget(target, smooth)

  if (reducedMotion) highlightScheduleEventsForProgramme(programmePath)
  else window.setTimeout(() => highlightScheduleEventsForProgramme(programmePath), 450)
}

function bindScheduleTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-schedule-root]').forEach((root) => {
    root.querySelectorAll<HTMLButtonElement>('[data-schedule-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.scheduleTab as ScheduleTab | undefined
        if (!tab || root.dataset.activeTab === tab) return
        applyScheduleTab(root, tab)
      })
    })
  })
}

function bindScheduleNavigation(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-programme-schedule-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const programmePath = link.dataset.programmePath
      if (!programmePath) return
      navigateToProgrammeSchedule(programmePath)
    })
  })

  const hash = window.location.hash.slice(1)
  if (!hash.startsWith('schedule')) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (hash === 'schedule') {
    const section = document.getElementById('schedule')
    if (section) scrollToScheduleTarget(section, !reducedMotion)
    return
  }

  const row = document.getElementById(hash)
  if (!row) return

  const eventId = row.dataset.eventId
  if (eventId) showScheduleTabForEvent(eventId)

  scrollToScheduleTarget(row, !reducedMotion)
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
    <header data-site-header class="fixed top-0 left-0 w-full z-50 bg-black/40 backdrop-blur-sm transition-all duration-300 border-b border-white/10">
      <div class="mx-auto flex max-w-7xl flex-col items-center px-6 py-4 md:flex-row md:justify-between md:py-6">
        <a href="#" class="text-center text-xl tracking-[0.2em] font-light text-white transition-colors hover:text-sand-200 sm:text-2xl">
          LOVISA HULEDAL
        </a>
        <nav class="site-nav mt-3 flex w-full flex-col items-center gap-3 text-xs tracking-wide text-gray-200 sm:text-sm md:mt-0 md:w-auto md:flex-row md:justify-end md:gap-8 md:tracking-widest">
          <div class="site-nav-row flex justify-center gap-6 md:contents">
            <a href="#about" class="hover:text-white transition-colors">ABOUT</a>
            <a href="#programmes" class="hover:text-white transition-colors">PROGRAMMES</a>
            <a href="#schedule" class="hover:text-white transition-colors">SCHEDULE</a>
          </div>
          <div class="site-nav-row flex justify-center gap-6 md:contents">
            <a href="#listen" class="hover:text-white transition-colors">LISTEN</a>
            <a href="#pictures" class="hover:text-white transition-colors">PICTURES</a>
            <a href="#contact" class="hover:text-white transition-colors">CONTACT</a>
          </div>
        </nav>
      </div>
    </header>

    <main>
      <section id="home" class="relative h-screen w-full hero-image">
        <div class="absolute inset-0 bg-black/20"></div>
        ${renderHeroTitle()}
      </section>

      ${renderAboutSection()}

      ${renderProgrammesSection()}

      ${renderScheduleSection()}

      ${renderListenSection()}

      ${renderPicturesSection()}

      ${renderContactSection()}
    </main>
  `
}

function syncSiteHeaderHeight(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  if (!header) return
  document.documentElement.style.setProperty('--site-header-height', `${header.offsetHeight}px`)
}

function bindSiteHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  if (!header) return

  const update = () => syncSiteHeaderHeight()
  update()
  window.addEventListener('resize', update)

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(update).observe(header)
  }
}

renderApp()
bindSiteHeader()
bindAboutSection()
bindProgrammeTabs()
bindProgrammeCarousels()
bindScheduleTabs()
bindScheduleNavigation()
bindListenSection()
bindPicturesSection()
document.addEventListener('keydown', onMediaOverlayEscape)
