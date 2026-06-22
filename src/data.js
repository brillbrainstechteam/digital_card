export const defaultProfile = {
  brandName: 'Northstar',
  handle: 'northstar',
  tagline: 'Everything important, in one place',
  about:
    'Discover our latest work, useful links and the best ways to connect with our team.',
  email: 'hello@northstar.co',
  phone: '+91 98765 43210',
  website: 'northstar.co',
  whatsapp: '+919876543210',
  location: 'India',
  logo: '/sample-logo.svg',
  logoSource: '/sample-logo.svg',
  logoSettings: {
    width: 108,
    offsetX: 0,
    offsetY: 0,
    removal: 38,
  },
  coverImage: '/sample-cover.svg',
  coverSettings: {
    height: 325,
    zoom: 100,
    positionX: 50,
    positionY: 35,
    fade: 62,
    shade: 24,
  },
  palette: {
    primary: '#155e75',
    accent: '#e2a454',
    surface: '#f7f1e9',
    ink: '#102c34',
  },
  links: [
    {
      id: 'portfolio',
      label: 'Explore what we do',
      subtitle: 'Products, services and featured work',
      url: 'https://example.com/portfolio',
      enabled: true,
    },
    {
      id: 'consultation',
      label: 'Book a conversation',
      subtitle: 'Find a time that suits you',
      url: 'https://example.com/consultation',
      enabled: true,
    },
    {
      id: 'catalogue',
      label: 'Download our introduction',
      subtitle: 'Learn more about our brand',
      url: 'https://example.com/catalogue',
      enabled: true,
    },
  ],
  socials: {
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    youtube: 'https://youtube.com',
  },
}

export const blankLink = () => ({
  id: `link-${Date.now()}`,
  label: 'New link',
  subtitle: 'Add a helpful description',
  url: 'https://',
  enabled: true,
})
