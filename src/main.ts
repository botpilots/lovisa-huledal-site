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

const BIOGRAPHY_PROSE =
  'biography-prose text-lg font-light leading-relaxed text-gray-600 [&_h5]:text-lg [&_h5]:font-normal [&_h5]:text-gray-900 [&_h5]:mb-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_em]:italic'

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

function mosaicObjectPosition(photo: MosaicImage): string {
  const x = photo.offsetX ?? 50
  const y = photo.offsetY ?? 50
  return `object-position: ${x}% ${y}%`
}

function readMoreLabel() {
  return language === 'sv' ? 'Läs mer' : 'Read more'
}

function renderMosaic(): string {
  const [hero, topRight, bottomRight, bottomWide] = getMosaicImages()

  const cell = (photo: MosaicImage | undefined) => {
    if (!photo?.image) return ''
    return `<img src="${photo.image}" alt="${photo.alt ?? ''}" style="${mosaicObjectPosition(photo)}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />`
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

      <section id="schedule" class="py-32 px-6 bg-sand-100">
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
