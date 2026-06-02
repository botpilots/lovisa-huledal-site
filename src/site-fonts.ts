import fontIndex from './google-fonts-index.json'

export interface FontRoleSettings {
  /** Google Font family name, e.g. Playfair Display */
  family?: string
  /** CSS font-weight (100–900). Omit to use the role default. */
  weight?: number
  /** Font size in rem — used on all viewports when mobile/desktop sizes are omitted. */
  fontSize?: number
  /** Font size in rem below 768px. Hero title and subtitle only. */
  fontSizeMobile?: number
  /** Font size in rem at 768px and wider. Hero title and subtitle only. */
  fontSizeDesktop?: number
}

/** CMS value: family string or { family, weight? } */
export type FontRoleChoice = string | FontRoleSettings

export interface SiteTypography {
  body?: FontRoleChoice
  heroTitle?: FontRoleChoice
  heroSubtitle?: FontRoleChoice
  siteNav?: FontRoleChoice
}

type TypographyRole = keyof SiteTypography

interface ResolvedFontRole {
  family?: string
  weight: number
  italic: boolean
  fontSize?: string
  fontSizeMobile?: string
  fontSizeDesktop?: string
}

interface FamilyRequirement {
  weights: Set<number>
  italic: boolean
}

interface GoogleFontAxis {
  tag: string
  min: number
  max: number
  defaultValue?: number
}

interface GoogleFontFamilyMeta {
  family: string
  variants?: string[]
  axes?: GoogleFontAxis[]
}

const DEFAULT_BODY_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif"

/** Weights used across the site when a family is the body font. */
const BODY_FONT_WEIGHTS = [300, 400, 500] as const

const ROLE_DEFAULTS: Record<TypographyRole, { weight: number; italic: boolean }> = {
  body: { weight: 400, italic: false },
  heroTitle: { weight: 300, italic: false },
  heroSubtitle: { weight: 300, italic: true },
  siteNav: { weight: 400, italic: false },
}

const ROLE_WEIGHT_VAR: Record<TypographyRole, string> = {
  body: '--font-body-weight',
  heroTitle: '--font-hero-title-weight',
  heroSubtitle: '--font-hero-subtitle-weight',
  siteNav: '--font-site-nav-weight',
}

const ROLE_FAMILY_VAR: Record<TypographyRole, string> = {
  body: '--font-body',
  heroTitle: '--font-hero-title',
  heroSubtitle: '--font-hero-subtitle',
  siteNav: '--font-site-nav',
}

const ROLE_SIZE_VAR: Partial<Record<TypographyRole, string>> = {
  body: '--font-body-size',
  heroTitle: '--font-hero-title-size',
  heroSubtitle: '--font-hero-subtitle-size',
  siteNav: '--font-site-nav-size',
}

const ROLE_SIZE_MOBILE_VAR: Partial<Record<TypographyRole, string>> = {
  heroTitle: '--font-hero-title-size-mobile',
  heroSubtitle: '--font-hero-subtitle-size-mobile',
}

const ROLE_SIZE_DESKTOP_VAR: Partial<Record<TypographyRole, string>> = {
  heroTitle: '--font-hero-title-size-desktop',
  heroSubtitle: '--font-hero-subtitle-size-desktop',
}

let metadataPromise: Promise<Map<string, GoogleFontFamilyMeta>> | null = null

function loadMetadata(): Promise<Map<string, GoogleFontFamilyMeta>> {
  if (!metadataPromise) {
    metadataPromise = Promise.resolve(
      new Map(Object.entries(fontIndex as Record<string, GoogleFontFamilyMeta>)),
    )
  }
  return metadataPromise
}

function parseFontRole(
  choice: FontRoleChoice | undefined,
  role: TypographyRole,
): ResolvedFontRole {
  const defaults = ROLE_DEFAULTS[role]
  if (typeof choice === 'string') {
    const family = choice.trim() || undefined
    return { family, weight: defaults.weight, italic: defaults.italic }
  }

  const family = choice?.family?.trim() || undefined
  const weight = normalizeWeight(choice?.weight, defaults.weight)
  return { family, weight, italic: defaults.italic, ...resolveFontSizes(choice) }
}

function normalizeWeight(value: number | undefined, fallback: number): number {
  if (value == null || Number.isNaN(value)) return fallback
  return Math.min(900, Math.max(100, Math.round(value / 100) * 100))
}

function parseFontSize(value: number | undefined): string | undefined {
  if (value == null || Number.isNaN(value) || value <= 0) return undefined
  return `${value}rem`
}

function resolveFontSizes(
  choice: FontRoleSettings | undefined,
): Pick<ResolvedFontRole, 'fontSize' | 'fontSizeMobile' | 'fontSizeDesktop'> {
  const base = parseFontSize(choice?.fontSize)
  const mobile = parseFontSize(choice?.fontSizeMobile) ?? base
  const desktop = parseFontSize(choice?.fontSizeDesktop) ?? base
  return {
    fontSize: base,
    fontSizeMobile: mobile,
    fontSizeDesktop: desktop,
  }
}

function cssFontFamily(name: string | undefined, fallback: string): string {
  const trimmed = name?.trim()
  if (!trimmed) return fallback
  if (/\s/.test(trimmed)) return `"${trimmed}", ${fallback}`
  return `${trimmed}, ${fallback}`
}

function collectRequirements(
  typography: SiteTypography | undefined,
): Map<string, FamilyRequirement> {
  const requirements = new Map<string, FamilyRequirement>()
  const roles = parseAllRoles(typography)

  const addRequirement = (family: string, weight: number, italic: boolean) => {
    const existing = requirements.get(family) ?? { weights: new Set<number>(), italic: false }
    existing.weights.add(weight)
    existing.italic = existing.italic || italic
    requirements.set(family, existing)
  }

  for (const role of Object.keys(ROLE_DEFAULTS) as TypographyRole[]) {
    const resolved = roles[role]
    if (!resolved.family) continue
    addRequirement(resolved.family, resolved.weight, resolved.italic)
  }

  const bodyFamily = roles.body.family
  if (bodyFamily) {
    for (const weight of BODY_FONT_WEIGHTS) {
      addRequirement(bodyFamily, weight, false)
    }
  }

  return requirements
}

function parseAllRoles(typography: SiteTypography | undefined): Record<TypographyRole, ResolvedFontRole> {
  return {
    body: parseFontRole(typography?.body, 'body'),
    heroTitle: parseFontRole(typography?.heroTitle, 'heroTitle'),
    heroSubtitle: parseFontRole(typography?.heroSubtitle, 'heroSubtitle'),
    siteNav: parseFontRole(typography?.siteNav, 'siteNav'),
  }
}

function staticFontWeights(meta: GoogleFontFamilyMeta): { normal: number[]; italic: number[] } {
  const normal: number[] = []
  const italic: number[] = []
  for (const key of meta.variants ?? []) {
    if (key.endsWith('i')) {
      const weight = Number.parseInt(key.slice(0, -1), 10)
      if (!Number.isNaN(weight)) italic.push(weight)
    } else {
      const weight = Number.parseInt(key, 10)
      if (!Number.isNaN(weight)) normal.push(weight)
    }
  }
  return { normal, italic }
}

function clampWeightToFamily(requested: number, meta: GoogleFontFamilyMeta | undefined): number {
  if (!meta) return requested

  const wghtAxis = meta.axes?.find((axis) => axis.tag === 'wght')
  if (wghtAxis) {
    return Math.min(wghtAxis.max, Math.max(wghtAxis.min, requested))
  }

  const { normal, italic } = staticFontWeights(meta)
  const available = [...normal, ...italic]
  if (available.length === 0) return requested

  return available.reduce((closest, current) =>
    Math.abs(current - requested) < Math.abs(closest - requested) ? current : closest,
  )
}

function axisValueForRequirement(
  axis: GoogleFontAxis,
  weights: Set<number>,
): string {
  if (axis.tag !== 'wght') {
    const min = Math.round(axis.min)
    const max = Math.round(axis.max)
    return min === max ? String(min) : `${min}..${max}`
  }

  const clamped = [...weights].map((weight) =>
    Math.min(axis.max, Math.max(axis.min, weight)),
  )
  const min = Math.round(Math.min(...clamped))
  const max = Math.round(Math.max(...clamped))
  return min === max ? String(min) : `${min}..${max}`
}

function buildVariableFamilyParam(
  family: string,
  meta: GoogleFontFamilyMeta,
  requirement: FamilyRequirement,
): string {
  const encoded = family.replace(/\s+/g, '+')
  const axisTags = ['ital', ...(meta.axes ?? []).map((axis) => axis.tag)]
  const styles = requirement.italic ? [0, 1] : [0]

  const tuples = styles.map((style) => {
    const parts = [String(style)]
    for (const axis of meta.axes ?? []) {
      parts.push(axisValueForRequirement(axis, requirement.weights))
    }
    return parts.join(',')
  })

  return `family=${encoded}:${axisTags.join(',')}@${tuples.join(';')}`
}

function buildStaticFamilyParam(
  family: string,
  meta: GoogleFontFamilyMeta,
  requirement: FamilyRequirement,
): string {
  const { normal, italic } = staticFontWeights(meta)
  if (normal.length === 0) return buildFallbackFamilyParam(family, requirement)

  const encoded = family.replace(/\s+/g, '+')
  const tuples: string[] = []

  for (const weight of [...requirement.weights].sort((a, b) => a - b)) {
    const normalWeight = normal.reduce((closest, current) =>
      Math.abs(current - weight) < Math.abs(closest - weight) ? current : closest,
    )
    tuples.push(`0,${normalWeight}`)

    if (requirement.italic && italic.length > 0) {
      const italicWeight = italic.reduce((closest, current) =>
        Math.abs(current - weight) < Math.abs(closest - weight) ? current : closest,
      )
      tuples.push(`1,${italicWeight}`)
    }
  }

  return `family=${encoded}:ital,wght@${tuples.join(';')}`
}

function buildFallbackFamilyParam(family: string, requirement: FamilyRequirement): string {
  const encoded = family.replace(/\s+/g, '+')
  const tuples: string[] = []

  for (const weight of [...requirement.weights].sort((a, b) => a - b)) {
    tuples.push(`0,${weight}`)
    if (requirement.italic) tuples.push(`1,${weight}`)
  }

  if (tuples.length === 0) {
    return `family=${encoded}:ital,wght@0,400..900;1,400..900`
  }

  return `family=${encoded}:ital,wght@${tuples.join(';')}`
}

function buildFamilyParam(
  family: string,
  requirement: FamilyRequirement,
  metadata: Map<string, GoogleFontFamilyMeta>,
): string {
  const meta = metadata.get(family.toLowerCase())
  if (!meta) return buildFallbackFamilyParam(family, requirement)
  if (meta.axes?.length) return buildVariableFamilyParam(family, meta, requirement)
  if (meta.variants?.length) return buildStaticFamilyParam(family, meta, requirement)
  return buildFallbackFamilyParam(family, requirement)
}

function ensurePreconnect(href: string, crossOrigin = false): void {
  const selector = `link[rel="preconnect"][href="${href}"]`
  if (document.head.querySelector(selector)) return
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  if (crossOrigin) link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

function applyStylesheet(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[data-site-fonts]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.siteFonts = 'true'
    document.head.appendChild(link)
  }
  link.href = href
}

async function loadGoogleFontsWithMetadata(
  requirements: Map<string, FamilyRequirement>,
  metadata: Map<string, GoogleFontFamilyMeta>,
): Promise<void> {
  if (requirements.size === 0) return

  ensurePreconnect('https://fonts.googleapis.com')
  ensurePreconnect('https://fonts.gstatic.com', true)

  const params = [...requirements.entries()].map(([family, requirement]) =>
    buildFamilyParam(family, requirement, metadata),
  )
  applyStylesheet(`https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`)
}

function setOptionalCssVar(root: CSSStyleDeclaration, name: string, value: string | undefined): void {
  if (value) root.setProperty(name, value)
  else root.removeProperty(name)
}

function applyRoleSizeVars(root: CSSStyleDeclaration, role: TypographyRole, resolved: ResolvedFontRole): void {
  const sizeVar = ROLE_SIZE_VAR[role]
  if (sizeVar) setOptionalCssVar(root, sizeVar, resolved.fontSize)

  const mobileVar = ROLE_SIZE_MOBILE_VAR[role]
  const desktopVar = ROLE_SIZE_DESKTOP_VAR[role]
  if (mobileVar) setOptionalCssVar(root, mobileVar, resolved.fontSizeMobile)
  if (desktopVar) setOptionalCssVar(root, desktopVar, resolved.fontSizeDesktop)
}

function applyTypographyCss(
  typography: SiteTypography | undefined,
  metadata: Map<string, GoogleFontFamilyMeta>,
): void {
  const roles = parseAllRoles(typography)
  const root = document.documentElement.style

  for (const role of Object.keys(ROLE_DEFAULTS) as TypographyRole[]) {
    const resolved = roles[role]
    const meta = resolved.family ? metadata.get(resolved.family.toLowerCase()) : undefined
    const effectiveWeight = resolved.family
      ? clampWeightToFamily(resolved.weight, meta)
      : resolved.weight

    const familyFallback = role === 'body' ? DEFAULT_BODY_STACK : 'var(--font-body)'
    root.setProperty(ROLE_FAMILY_VAR[role], cssFontFamily(resolved.family, familyFallback))
    root.setProperty(ROLE_WEIGHT_VAR[role], String(effectiveWeight))
    applyRoleSizeVars(root, role, resolved)
  }
}

/** Loads Google Fonts from CMS settings and exposes CSS variables for each role. */
export function syncSiteFonts(typography: SiteTypography | undefined): void {
  const requirements = collectRequirements(typography)
  const roles = parseAllRoles(typography)

  void loadMetadata().then(async (metadata) => {
    applyTypographyCss(typography, metadata)
    await loadGoogleFontsWithMetadata(requirements, metadata)
  })

  // Apply immediately with unclamped weights; metadata pass refines weight vars.
  const root = document.documentElement.style
  for (const role of Object.keys(ROLE_DEFAULTS) as TypographyRole[]) {
    const resolved = roles[role]
    const familyFallback = role === 'body' ? DEFAULT_BODY_STACK : 'var(--font-body)'
    root.setProperty(ROLE_FAMILY_VAR[role], cssFontFamily(resolved.family, familyFallback))
    root.setProperty(ROLE_WEIGHT_VAR[role], String(resolved.weight))
    applyRoleSizeVars(root, role, resolved)
  }
}
