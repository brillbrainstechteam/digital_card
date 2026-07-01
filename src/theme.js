const CHANNEL_MAX = 255

function clamp(value, min = 0, max = CHANNEL_MAX) {
  return Math.min(max, Math.max(min, value))
}

function toHex(value) {
  return clamp(Math.round(value)).toString(16).padStart(2, '0')
}

export function rgbToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function mix(first, second, amount) {
  return {
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
  }
}

function luminance(color) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / CHANNEL_MAX
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(first, second) {
  const light = Math.max(luminance(first), luminance(second))
  const dark = Math.min(luminance(first), luminance(second))
  return (light + 0.05) / (dark + 0.05)
}

function textColorFor(background) {
  const white = { r: 255, g: 255, b: 255 }
  const nearBlack = { r: 10, g: 21, b: 26 }
  return contrastRatio(background, white) >= contrastRatio(background, nearBlack)
    ? rgbToHex(white)
    : rgbToHex(nearBlack)
}

function saturation({ r, g, b }) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

function distance(first, second) {
  return Math.sqrt(
    (first.r - second.r) ** 2 +
      (first.g - second.g) ** 2 +
      (first.b - second.b) ** 2,
  )
}

function panelColorFor(surface) {
  const paper = { r: 255, g: 255, b: 255 }
  return luminance(surface) < 0.32 ? mix(surface, paper, 0.12) : mix(surface, paper, 0.34)
}

function derivePalette(primary, accent, detectedSurface) {
  const dark = { r: 11, g: 21, b: 25 }
  const paper = { r: 255, g: 252, b: 248 }
  const surface = detectedSurface ?? mix(primary, paper, 0.93)
  const primaryForUi = distance(primary, surface) < 46
    ? mix(primary, textColorFor(surface) === '#ffffff' ? paper : dark, 0.5)
    : primary
  const accentForUi =
    distance(primaryForUi, accent) < 48 ? mix(accent, paper, 0.44) : accent

  return {
    primary: rgbToHex(primaryForUi),
    accent: rgbToHex(accentForUi),
    surface: rgbToHex(surface),
    panel: rgbToHex(panelColorFor(surface)),
    ink: textColorFor(surface),
  }
}

export function paletteVariables(palette, theme = {}) {
  const primary = hexToRgb(palette.primary)
  const accent = hexToRgb(palette.accent)
  const surface = hexToRgb(palette.surface)
  const panel = palette.panel ? hexToRgb(palette.panel) : panelColorFor(surface)

  // Use user's ink color only when it meets WCAG AA contrast (4.5:1) against the surface.
  // Buttons always use auto-derived text so they stay legible regardless.
  const userInk = palette.ink ? hexToRgb(palette.ink) : null
  const surfaceText = userInk && contrastRatio(userInk, surface) >= 4.5
    ? palette.ink
    : textColorFor(surface)
  const panelText = userInk && contrastRatio(userInk, panel) >= 4.5
    ? palette.ink
    : textColorFor(panel)

  return {
    '--brand-primary': palette.primary,
    '--brand-accent': palette.accent,
    '--brand-surface': theme.cardBackground || palette.surface,
    '--brand-panel': rgbToHex(panel),
    '--brand-ink': surfaceText,
    '--brand-primary-rgb': `${primary.r}, ${primary.g}, ${primary.b}`,
    '--brand-accent-rgb': `${accent.r}, ${accent.g}, ${accent.b}`,
    '--brand-primary-text': textColorFor(primary),
    '--brand-accent-text': textColorFor(accent),
    '--brand-surface-text': theme.bodyText || surfaceText,
    '--brand-panel-text': panelText,
    '--theme-page-background': theme.pageBackground || palette.surface,
    '--theme-card-background': theme.cardBackground || palette.surface,
    '--theme-heading-text': theme.headingText || surfaceText,
    '--theme-tagline-text': theme.taglineText || theme.bodyText || surfaceText,
    '--theme-location-text': theme.locationText || theme.bodyText || surfaceText,
    '--theme-about-text': theme.aboutText || theme.bodyText || surfaceText,
    '--theme-body-text': theme.bodyText || surfaceText,
    '--theme-primary-button': theme.primaryButton || palette.primary,
    '--theme-secondary-button': theme.secondaryButton || palette.accent,
    '--theme-save-contact-button': theme.saveContactButton || palette.accent,
    '--theme-call-button': theme.callButton || theme.primaryButton || palette.primary,
    '--theme-whatsapp-button': theme.whatsappButton || theme.primaryButton || palette.primary,
    '--theme-email-button': theme.emailButton || theme.primaryButton || palette.primary,
    '--theme-website-button': theme.websiteButton || palette.primary,
    '--theme-linkedin-button': theme.linkedinButton || theme.primaryButton || palette.primary,
    '--theme-instagram-button': theme.instagramButton || theme.primaryButton || palette.primary,
    '--theme-facebook-button': theme.facebookButton || theme.primaryButton || palette.primary,
    '--theme-twitter-button': theme.twitterButton || theme.primaryButton || palette.primary,
    '--theme-youtube-button': theme.youtubeButton || theme.primaryButton || palette.primary,
    '--theme-telegram-button': theme.telegramButton || theme.primaryButton || palette.primary,
    '--theme-footer-background': theme.cardBackground || palette.surface,
    '--theme-footer-text': theme.footerText || surfaceText,
    '--theme-border-color': theme.borderColor || palette.accent,
    '--theme-accent-color': theme.accentColor || palette.accent,
  }
}

export async function extractPaletteFromLogo(source) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const scale = Math.min(1, 140 / Math.max(image.width, image.height))
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const groups = new Map()
  const edgeGroups = new Map()
  let opaqueEdgeCount = 0
  let edgeCount = 0

  function trackColor(map, color) {
    const quantized = {
      r: Math.round(color.r / 12) * 12,
      g: Math.round(color.g / 12) * 12,
      b: Math.round(color.b / 12) * 12,
    }
    const key = `${quantized.r}-${quantized.g}-${quantized.b}`
    const current = map.get(key) ?? {
      color: quantized,
      count: 0,
      r: 0,
      g: 0,
      b: 0,
      score: 0,
    }
    current.count += 1
    current.r += color.r
    current.g += color.g
    current.b += color.b
    const sat = saturation(quantized)
    current.score = current.count * (0.2 + sat * sat * 6)
    map.set(key, current)
  }

  function averageColor(group) {
    return {
      r: group.r / group.count,
      g: group.g / group.count,
      b: group.b / group.count,
    }
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const isEdge =
        x < 3 || y < 3 || x >= canvas.width - 3 || y >= canvas.height - 3
      if (isEdge) edgeCount += 1
      if (pixels[index + 3] < 110) continue
      if (isEdge) opaqueEdgeCount += 1
      const color = {
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
      }
      trackColor(groups, color)
      if (isEdge) trackColor(edgeGroups, color)
    }
  }

  const edgeCandidates = [...edgeGroups.values()].sort((a, b) => b.count - a.count)
  const edgeWinner = edgeCandidates[0]
  const hasLogoBackground =
    edgeWinner &&
    opaqueEdgeCount / Math.max(edgeCount, 1) > 0.58 &&
    edgeWinner.count / Math.max(opaqueEdgeCount, 1) > 0.34
  const surface = hasLogoBackground ? averageColor(edgeWinner) : null

  // Separate candidates into "vibrant" (clearly chromatic) and "muted" (dark/gray)
  const all = [...groups.values()]
    .map((group) => ({ ...group, exact: averageColor(group) }))
    .filter(({ exact }) => !surface || distance(exact, surface) > 28)
    .filter(({ exact }) => surface || luminance(exact) < 0.92)

  const vibrant = all.filter(
    ({ exact, color }) =>
      saturation(color) > 0.35 &&   // clearly chromatic, not gray/brown
      luminance(exact) > 0.02 &&     // not nearly black
      luminance(exact) < 0.85,       // not nearly white
  )

  const muted = all.filter(
    ({ exact, color }) =>
      saturation(color) > 0.08 &&
      luminance(exact) > 0.01 &&
      luminance(exact) < 0.92,
  )

  // Prefer vibrant candidates; fall back to muted only if none exist
  const candidates = (vibrant.length ? vibrant : muted).sort((a, b) => b.score - a.score)

  if (!candidates.length) {
    if (surface) {
      const opposite = textColorFor(surface) === '#ffffff' ? { r: 255, g: 255, b: 255 } : { r: 11, g: 21, b: 25 }
      return derivePalette(opposite, mix(opposite, surface, 0.3), surface)
    }
    throw new Error('The logo is too light to detect brand colors.')
  }

  const primary = candidates[0].exact

  // For accent, look across ALL remaining candidates (including muted) for contrast
  const accentPool = all
    .filter(({ exact, color }) => saturation(color) > 0.08 && luminance(exact) > 0.01)
    .sort((a, b) => b.score - a.score)
  const contrasting = accentPool.find(
    ({ exact }) => distance(primary, exact) > 62 && saturation(exact) > 0.1,
  )
  const accent = contrasting?.exact ?? mix(primary, { r: 238, g: 177, b: 80 }, 0.55)
  return derivePalette(primary, accent, surface)
}

export async function prepareLogoAsset(source, removal = 38) {
  const palette = await extractPaletteFromLogo(source)
  const backdrop = await detectBackdrop(source)
  if (!backdrop || removal === 0) {
    return { palette, logo: source, hasBackdrop: Boolean(backdrop) }
  }

  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const scale = Math.min(1, 900 / Math.max(image.width, image.height))
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const color = { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] }
    const difference = distance(color, backdrop)
    if (difference <= removal) {
      pixels[index + 3] = 0
    } else if (difference <= removal + 18) {
      pixels[index + 3] = Math.round(
        pixels[index + 3] * ((difference - removal) / 18),
      )
    }
  }

  context.putImageData(imageData, 0, 0)
  return { palette, logo: canvas.toDataURL('image/png'), hasBackdrop: true }
}

export async function detectBackdrop(source) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const scale = Math.min(1, 140 / Math.max(image.width, image.height))
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const groups = new Map()
  let opaque = 0
  let total = 0

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (!(x < 3 || y < 3 || x >= canvas.width - 3 || y >= canvas.height - 3)) {
        continue
      }
      total += 1
      const index = (y * canvas.width + x) * 4
      if (pixels[index + 3] < 110) continue
      opaque += 1
      const color = {
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
      }
      const key = `${Math.round(color.r / 12)}-${Math.round(color.g / 12)}-${Math.round(color.b / 12)}`
      const group = groups.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      group.count += 1
      group.r += color.r
      group.g += color.g
      group.b += color.b
      groups.set(key, group)
    }
  }

  const winner = [...groups.values()].sort((first, second) => second.count - first.count)[0]
  if (!winner || opaque / Math.max(total, 1) <= 0.58 || winner.count / opaque <= 0.34) {
    return null
  }
  return {
    r: winner.r / winner.count,
    g: winner.g / winner.count,
    b: winner.b / winner.count,
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('We could not read this image.'))
    image.src = source
  })
}
