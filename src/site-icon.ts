export interface SiteIconSettings {
  image?: string
  offsetX?: number
  offsetY?: number
  /** 100 = default cover crop; higher values zoom in. */
  zoom?: number
}

export interface SyncSiteIconOptions {
  siteIcon?: SiteIconSettings
  heroImage?: string
  defaultImage: string
  resolveAssetUrl: (path: string) => string
}

const SITE_ICON_SIZES = [32, 180] as const

function siteIconFocus(icon: SiteIconSettings | undefined): {
  offsetX: number
  offsetY: number
  zoom: number
} {
  return {
    offsetX: icon?.offsetX ?? 50,
    offsetY: icon?.offsetY ?? 50,
    zoom: icon?.zoom ?? 100,
  }
}

function siteIconImagePath(
  icon: SiteIconSettings | undefined,
  heroImage: string | undefined,
  defaultImage: string,
): string {
  const fromIcon = icon?.image?.trim()
  if (fromIcon) return fromIcon
  const fromHero = heroImage?.trim()
  if (fromHero) return fromHero
  return defaultImage
}

function drawCircularSiteIcon(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  focus: { offsetX: number; offsetY: number; zoom: number },
): void {
  const { offsetX, offsetY, zoom } = focus
  const scale =
    Math.max(size / img.naturalWidth, size / img.naturalHeight) * (zoom / 100)
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  const dx = (size - drawW) * (offsetX / 100)
  const dy = (size - drawH) * (offsetY / 100)

  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, dx, dy, drawW, drawH)
  ctx.restore()
}

function setDocumentIconLink(rel: string, href: string, sizes?: string): void {
  const selector = sizes
    ? `link[rel="${rel}"][sizes="${sizes}"]`
    : `link[rel="${rel}"]:not([sizes])`
  let link = document.head.querySelector<HTMLLinkElement>(selector)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    if (sizes) link.sizes = sizes
    document.head.appendChild(link)
  }
  link.href = href
  link.type = 'image/png'
}

/** Renders a circular favicon and apple-touch icon from CMS settings. */
export function syncSiteIcon({
  siteIcon,
  heroImage,
  defaultImage,
  resolveAssetUrl,
}: SyncSiteIconOptions): void {
  const focus = siteIconFocus(siteIcon)
  const src = resolveAssetUrl(siteIconImagePath(siteIcon, heroImage, defaultImage))
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    for (const size of SITE_ICON_SIZES) {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      drawCircularSiteIcon(ctx, img, size, focus)
      const dataUrl = canvas.toDataURL('image/png')
      if (size === 32) {
        setDocumentIconLink('icon', dataUrl)
      } else {
        setDocumentIconLink('apple-touch-icon', dataUrl, `${size}x${size}`)
      }
    }
  }
  img.onerror = () => {
    document.head
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
      .forEach((link) => link.remove())
  }
  img.src = src
}
