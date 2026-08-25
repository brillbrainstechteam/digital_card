export const THEME_FIELDS = [
  { key: 'pageBackground', label: 'Page Background' },
  { key: 'cardBackground', label: 'Card Background' },
  { key: 'headingText', label: 'Heading Text' },
  { key: 'bodyText', label: 'Body Text' },
  { key: 'primaryButton', label: 'Primary Button' },
  { key: 'secondaryButton', label: 'Secondary Button' },
  { key: 'saveContactButton', label: 'Save Contact Button' },
  { key: 'callButton', label: 'Call Button' },
  { key: 'whatsappButton', label: 'WhatsApp Button' },
  { key: 'emailButton', label: 'Email Button' },
  { key: 'websiteButton', label: 'Website Button' },
  { key: 'linkedinButton', label: 'LinkedIn Button' },
  { key: 'instagramButton', label: 'Instagram Button' },
  { key: 'facebookButton', label: 'Facebook Button' },
  { key: 'twitterButton', label: 'Twitter/X Button' },
  { key: 'footerBackground', label: 'Footer Background' },
  { key: 'footerText', label: 'Footer Text' },
  { key: 'borderColor', label: 'Border Color' },
  { key: 'accentColor', label: 'Accent Color' },
]

// Same extraction algorithm for every card type — professional/business
// derive the palette from the uploaded logo, personal derives it from the
// uploaded profile photo. Whichever asset is used, this function is the one
// place background/text/button colors are computed from it, so all types
// stay consistent in *how* auto-color works even though the resulting color
// naturally differs per uploaded image.
export function themeFromPalette(palette) {
  return {
    pageBackground: palette.surface,
    cardBackground: palette.surface,
    headingText: palette.ink,
    designationText: palette.ink,
    companyNameText: palette.ink,
    taglineText: palette.ink,
    locationText: palette.ink,
    bodyText: palette.ink,
    primaryButton: palette.primary,
    secondaryButton: palette.accent,
    saveContactButton: palette.accent,
    callButton: palette.primary,
    whatsappButton: palette.primary,
    emailButton: palette.primary,
    websiteButton: palette.primary,
    linkedinButton: palette.primary,
    instagramButton: palette.primary,
    facebookButton: palette.primary,
    twitterButton: palette.primary,
    youtubeButton: palette.primary,
    telegramButton: palette.primary,
    footerBackground: palette.surface,
    footerText: palette.ink,
    borderColor: palette.accent,
    accentColor: palette.accent,
  }
}
