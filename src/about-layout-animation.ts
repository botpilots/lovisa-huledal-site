const FADE_OUT_MS = 520
const FADE_IN_MS = 820
const TEXT_DELAY_MS = 400
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function isDesktop() {
  return window.matchMedia('(min-width: 640px)').matches
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function resetMotionStyles(el: HTMLElement) {
  el.style.opacity = ''
  el.style.transform = ''
  el.style.transition = ''
  el.style.willChange = ''
}

function fadeOutElement(el: HTMLElement) {
  el.style.willChange = 'opacity'
  el.style.transition = `opacity ${FADE_OUT_MS}ms ${EASE}`
  el.style.opacity = '0'
}

function fadeOutTogether(cells: HTMLElement[]) {
  cells.forEach((cell) => {
    cell.style.willChange = 'opacity, transform'
    cell.style.transition = `opacity ${FADE_OUT_MS}ms ${EASE}, transform ${FADE_OUT_MS}ms ${EASE}`
    cell.style.opacity = '0'
    cell.style.transform = 'translate3d(0, 12px, 0)'
  })
}

function fadeInTogether(cells: HTMLElement[], durationMs = FADE_IN_MS) {
  cells.forEach((cell) => {
    cell.style.transition = 'none'
    cell.style.opacity = '0'
    cell.style.transform = 'translate3d(0, 16px, 0)'
  })
  void cells[0]?.offsetHeight

  cells.forEach((cell) => {
    cell.style.willChange = 'opacity, transform'
    cell.style.transition = `opacity ${durationMs}ms ${EASE}, transform ${durationMs}ms ${EASE}`
    cell.style.opacity = '1'
    cell.style.transform = 'translate3d(0, 0, 0)'
  })
}

async function fadeInCopy(el: HTMLElement, durationMs: number, delayMs: number) {
  el.style.willChange = 'opacity'
  el.style.transition = 'none'
  el.style.opacity = '0'
  void el.offsetHeight
  el.style.transition = `opacity ${durationMs}ms ${EASE} ${delayMs}ms`
  el.style.opacity = '1'
  await wait(durationMs + delayMs + 80)
  resetMotionStyles(el)
}

export async function animateAboutLayout(bio: HTMLElement, apply: () => void) {
  const cells = [...bio.querySelectorAll<HTMLElement>('.about-mosaic-cell')]
  const copy = bio.querySelector<HTMLElement>('.about-copy')
  const desktop = isDesktop()

  if (!cells.length) {
    apply()
    return
  }

  bio.classList.add('about-is-animating')

  try {
    if (copy) fadeOutElement(copy)
    if (desktop) fadeOutTogether(cells)

    await wait(FADE_OUT_MS + 80)
    apply()

    if (desktop) fadeInTogether(cells)

    const textDelay = desktop ? TEXT_DELAY_MS : 0
    const copyFade = copy ? fadeInCopy(copy, FADE_IN_MS, textDelay) : Promise.resolve()
    const mosaicFade = desktop ? wait(FADE_IN_MS + 80) : Promise.resolve()
    await Promise.all([copyFade, mosaicFade])
  } finally {
    cells.forEach(resetMotionStyles)
    if (copy) resetMotionStyles(copy)
    bio.classList.remove('about-is-animating')
  }
}
