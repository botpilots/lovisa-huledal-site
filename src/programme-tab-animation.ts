const FADE_OUT_MS = 520
const FADE_IN_MS = 820
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function resetMotionStyles(el: HTMLElement) {
  el.style.opacity = ''
  el.style.transition = ''
  el.style.willChange = ''
}

function fadeOut(el: HTMLElement) {
  el.style.willChange = 'opacity'
  el.style.transition = `opacity ${FADE_OUT_MS}ms ${EASE}`
  el.style.opacity = '0'
}

function fadeIn(el: HTMLElement) {
  el.style.transition = 'none'
  el.style.opacity = '0'
  void el.offsetHeight
  el.style.willChange = 'opacity'
  el.style.transition = `opacity ${FADE_IN_MS}ms ${EASE}`
  el.style.opacity = '1'
}

export async function animateProgrammeTabFade(panelArea: HTMLElement, apply: () => void) {
  try {
    fadeOut(panelArea)
    await wait(FADE_OUT_MS + 80)
    apply()
    fadeIn(panelArea)
    await wait(FADE_IN_MS + 80)
  } finally {
    resetMotionStyles(panelArea)
  }
}
