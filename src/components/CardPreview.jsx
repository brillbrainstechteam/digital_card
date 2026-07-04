import { useState } from 'react'
import { createPortal } from 'react-dom'
import { paletteVariables } from '../theme'
import { trackButtonClick, submitCardLead, submitSubscriber } from '../api'
import { BUTTON_LABEL_DEFAULTS } from '../data'

function ActionIcon({ type }) {
  const paths = {
    call: <path d="M6.6 3.4c.5-.5 1.3-.4 1.7.2l2 3c.3.5.3 1.1-.1 1.5L8.8 9.5a11.2 11.2 0 0 0 5.7 5.7l1.4-1.4c.4-.4 1-.4 1.5-.1l3 2c.6.4.7 1.2.2 1.7l-1.7 1.8c-.7.7-1.8 1-2.8.7C9.9 18.3 5.7 14.1 4.1 7.9c-.3-1 .1-2.1.8-2.8l1.7-1.7Z" />,
    email: <path d="M4 6.8C4 5.8 4.8 5 5.8 5h12.4c1 0 1.8.8 1.8 1.8v10.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V6.8Zm1.8-.1L12 11.1l6.2-4.4H5.8Zm12.4 10.6V8.8l-5.7 4a.9.9 0 0 1-1 0l-5.7-4v8.5h12.4Z" />,
    whatsapp: <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.05 21.95l4.878-1.372A9.95 9.95 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm0 18a7.95 7.95 0 0 1-4.032-1.098l-.29-.174-2.894.814.826-2.822-.19-.298A7.958 7.958 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8Zm4.406-5.845c-.242-.121-1.432-.707-1.654-.788-.222-.08-.383-.12-.544.121-.16.242-.623.788-.764.95-.14.16-.282.18-.524.06-.242-.12-1.02-.376-1.943-1.198-.718-.641-1.203-1.432-1.344-1.674-.14-.242-.015-.373.106-.493.108-.108.242-.282.363-.423.12-.14.16-.242.242-.403.08-.16.04-.302-.02-.423-.06-.12-.544-1.313-.746-1.797-.196-.472-.396-.408-.544-.415l-.463-.008a.888.888 0 0 0-.644.302c-.222.242-.845.826-.845 2.014s.865 2.335.985 2.496c.12.16 1.701 2.597 4.122 3.643.576.249 1.025.397 1.375.508.578.184 1.104.158 1.52.096.463-.069 1.432-.585 1.634-1.15.2-.564.2-1.047.14-1.148-.06-.1-.222-.16-.463-.282Z" />,
    save: <path d="M12 3a1 1 0 0 1 1 1v8.2l2.4-2.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0l-4.1-4.1a1 1 0 0 1 1.4-1.4l2.4 2.4V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />,
  }

  return (
    <svg aria-hidden="true" className="action-icon" viewBox="0 0 24 24" fill="currentColor">
      {paths[type]}
    </svg>
  )
}

function SocialIcon({ platform }) {
  const paths = {
    instagram: (
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3a5 5 0 1 1 0 10A5 5 0 0 1 12 7Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    ),
    facebook: (
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
    linkedin: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
    twitter: (
      <path d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z" />
    ),
    youtube: (
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    ),
    telegram: (
      <path d="M21.2 2.1 1.1 9.9c-1.4.5-1.3 1.3-.2 1.6l5 1.6 11.5-7.3c.5-.3 1 .1.6.5l-9.3 8.4h-.1l.3 5.2c.5 0 .7-.2 1-.5l2.4-2.3 5 3.7c.9.5 1.5.2 1.8-.8L23 3.3c.4-1.3-.5-1.8-1.8-1.2z" />
    ),
    tiktok: (
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    ),
    threads: (
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.186v-.007c.024-3.581 1.205-6.334 3.51-8.184C7.059 2.35 9.913 1.5 13.312 1.5h.007c3.581.024 6.334 1.205 8.184 3.51C23.15 7.059 24 9.913 24 13.312v.007c-.024 3.58-1.205 6.333-3.51 8.183C18.44 23.15 15.586 24 12.186 24Zm1.124-17.02c-2.715 0-4.352 1.38-4.352 3.796 0 1.147.456 2.016 1.367 2.68.912.664 2.13.996 3.655.996.432 0 .84-.028 1.224-.086a4.89 4.89 0 0 0 1.02-.294c.012.16.02.322.02.486 0 1.658-1.066 2.573-3 2.573-1.282 0-2.21-.392-2.782-1.176l-2.212 1.44c.912 1.304 2.51 1.964 4.794 1.964 3.31 0 5.256-1.68 5.256-4.617V7.52h-2.928v.842c-.684-.672-1.68-1.02-2.978-1.02l-.084.638Zm.168 2.22c1.368 0 2.232.888 2.232 2.304 0 1.392-.864 2.256-2.232 2.256-1.392 0-2.268-.864-2.268-2.256 0-1.416.876-2.304 2.268-2.304Z" />
    ),
    soundcloud: (
      <path d="M1.175 12.225c-.047 0-.094.008-.133.024a.24.24 0 0 0-.1.067.266.266 0 0 0-.063.1A.27.27 0 0 0 .86 12.5c0 .047.008.09.02.129.012.039.03.074.055.104.026.03.056.055.093.072.037.018.08.027.126.027.047 0 .09-.009.126-.027.037-.017.067-.042.093-.072.025-.03.043-.065.055-.104.012-.039.02-.082.02-.129 0-.047-.008-.09-.02-.133a.31.31 0 0 0-.055-.1.274.274 0 0 0-.093-.067.283.283 0 0 0-.126-.025zm1.555-.17c-.09 0-.173.017-.248.05a.574.574 0 0 0-.195.142.665.665 0 0 0-.129.216.783.783 0 0 0-.047.275v3.64c0 .1.016.19.047.273a.652.652 0 0 0 .13.212c.055.059.122.105.195.138.073.033.158.05.248.05.09 0 .175-.017.248-.05a.574.574 0 0 0 .195-.138.645.645 0 0 0 .129-.212.783.783 0 0 0 .047-.274v-3.64a.8.8 0 0 0-.047-.274.645.645 0 0 0-.13-.216.574.574 0 0 0-.194-.143.628.628 0 0 0-.249-.049zm3.41-2.56c-.152 0-.289.03-.41.088a.94.94 0 0 0-.311.244 1.12 1.12 0 0 0-.2.364 1.368 1.368 0 0 0-.069.436v5.6c0 .156.023.3.069.432.046.13.112.243.2.338a.94.94 0 0 0 .311.22c.121.054.258.08.41.08.152 0 .288-.026.41-.08a.94.94 0 0 0 .31-.22c.089-.095.155-.208.201-.338.046-.13.069-.276.069-.431v-5.601c0-.158-.023-.304-.069-.436a1.098 1.098 0 0 0-.2-.364.94.94 0 0 0-.311-.244 1.028 1.028 0 0 0-.41-.088zm14.862.025c-1.768 0-3.218 1.334-3.388 3.056-.278-.117-.58-.18-.895-.18-1.31 0-2.37 1.063-2.37 2.374s1.06 2.374 2.37 2.374h4.283c1.31 0 2.37-1.063 2.37-2.374s-1.06-2.374-2.37-2.374zm-8.23-2.895a1.7 1.7 0 0 0-.643.123 1.663 1.663 0 0 0-.536.358 1.69 1.69 0 0 0-.366.54 1.71 1.71 0 0 0-.133.676v7.076c0 .237.045.46.133.667.088.207.213.39.366.545.153.155.334.278.536.368.202.09.418.135.643.135.225 0 .441-.045.643-.135.202-.09.383-.213.536-.368a1.7 1.7 0 0 0 .366-.545c.088-.207.133-.43.133-.667V8.322a1.71 1.71 0 0 0-.133-.676 1.69 1.69 0 0 0-.366-.54 1.663 1.663 0 0 0-.536-.358 1.7 1.7 0 0 0-.643-.123zm-3.104.756a1.32 1.32 0 0 0-.49.093 1.275 1.275 0 0 0-.403.268 1.281 1.281 0 0 0-.274.407 1.315 1.315 0 0 0-.1.508v6.984c0 .183.034.354.1.508.067.154.16.288.274.4.114.111.249.2.403.262.154.062.315.093.49.093.175 0 .336-.031.49-.093a1.23 1.23 0 0 0 .403-.261 1.24 1.24 0 0 0 .274-.401c.067-.154.1-.325.1-.508V8.76c0-.183-.033-.354-.1-.508a1.253 1.253 0 0 0-.274-.407 1.275 1.275 0 0 0-.403-.268 1.32 1.32 0 0 0-.49-.093z" />
    ),
    pinterest: (
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    ),
    patreon: (
      <path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.445-5.94-3.843-.46-5.901 1.033-8.162 2.356C7.623 4.858 5.832 5.9 4.07 5.9H1.043v15.99H4.07v-5.59c1.11.362 2.23.54 3.4.54 1.71 0 3.43-.471 5.063-.928 1.703-.477 3.46-.965 5.04-.947 2.797.03 5.388-2.261 5.384-7.755z" />
    ),
    twitch: (
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    ),
    applemusic: (
      <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.1.958 1.31 1.88.825 3.136a7.494 7.494 0 0 0-.397 1.9C.389 5.28.365 5.526.352 5.774c0 .05-.007.1-.01.15v12.012c.003.05.01.099.012.148.01.39.04.776.096 1.162.198 1.258.795 2.277 1.81 3.053.61.47 1.308.756 2.068.927.567.124 1.14.166 1.72.166.188.005.375.014.564.014H18.89c.29-.01.578-.018.867-.036.41-.03.815-.096 1.21-.22 1.268-.4 2.15-1.22 2.7-2.432.345-.76.487-1.566.523-2.394.01-.19.01-.38.01-.57V6.76c0-.21-.003-.42-.006-.636zm-1.657 14.157c-.012.264-.03.528-.074.79-.158.898-.593 1.61-1.374 2.09a3.74 3.74 0 0 1-1.235.438c-.417.072-.84.095-1.262.097H5.61c-.33-.003-.66-.014-.99-.05a3.917 3.917 0 0 1-1.126-.317c-.77-.354-1.26-.95-1.545-1.745-.15-.415-.21-.845-.23-1.28-.008-.148-.01-.296-.01-.444V6.14c.003-.156.01-.313.023-.468.055-.658.217-1.277.604-1.82.535-.745 1.264-1.158 2.15-1.32.354-.065.713-.09 1.075-.092H18.4c.326.01.65.03.973.078.575.086 1.082.31 1.504.713.563.533.843 1.208.946 1.964.038.283.054.57.057.855.004.243.002.484.002.727v9.505l-.001.218zM12 4.78c-3.98 0-7.2 3.22-7.2 7.2 0 3.98 3.22 7.2 7.2 7.2 3.98 0 7.2-3.22 7.2-7.2 0-3.98-3.22-7.2-7.2-7.2zm0 12.787c-3.08 0-5.587-2.507-5.587-5.587 0-3.08 2.507-5.587 5.587-5.587 3.08 0 5.587 2.507 5.587 5.587 0 3.08-2.507 5.587-5.587 5.587zm0-9.613c-2.218 0-4.026 1.808-4.026 4.026 0 2.218 1.808 4.026 4.026 4.026 2.218 0 4.026-1.808 4.026-4.026 0-2.218-1.808-4.026-4.026-4.026zm0 6.44c-1.33 0-2.413-1.083-2.413-2.414 0-1.33 1.083-2.414 2.413-2.414 1.33 0 2.414 1.083 2.414 2.414 0 1.33-1.084 2.413-2.414 2.413zm0-3.22c-.442 0-.806.364-.806.806 0 .443.364.807.806.807.443 0 .807-.364.807-.807 0-.442-.364-.806-.807-.806z" />
    ),
    reddit: (
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    ),
    github: (
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    ),
  }

  return (
    <svg aria-hidden="true" className="social-icon" viewBox="0 0 24 24" fill="currentColor">
      {paths[platform] ?? null}
    </svg>
  )
}

function safeLink(value, fallback = '#') {
  if (!value) return fallback
  const destination = value.match(/^(https?:|mailto:|tel:)/i) ? value : `https://${value}`
  try {
    const protocol = new URL(destination).protocol
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(protocol) ? destination : fallback
  } catch {
    return fallback
  }
}

function buildContactFile(profile) {
  const displayName = profile.personName || profile.brandName || profile.companyName
  const companyName = profile.companyName || profile.brandName || displayName
  const content = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${displayName}`,
    `ORG:${companyName}`,
    `TEL:${profile.phone}`,
    `EMAIL:${profile.email}`,
    `URL:${safeLink(profile.website)}`,
    'END:VCARD',
  ].join('\n')
  const blob = new Blob([content], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${profile.handle || 'contact'}.vcf`
  anchor.click()
  URL.revokeObjectURL(url)
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SaveContactModal({ profile, onClose, trackingSlug }) {
  const [form, setForm] = useState({ visitorName: '', businessName: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const nextErrors = {}
    if (!form.visitorName.trim()) nextErrors.visitorName = 'Full name is required'
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required'
    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) nextErrors.email = 'Enter a valid email address'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setStatus('saving')
    buildContactFile(profile)
    if (trackingSlug) {
      trackButtonClick(trackingSlug, 'save_contact')
      try {
        await submitCardLead(trackingSlug, form)
      } catch {
        // lead capture failures should not block the visitor's download
      }
    }
    setStatus('sent')
    setTimeout(onClose, 1500)
  }

  return createPortal(
    <div className="save-modal-overlay" onClick={onClose}>
      <div className="save-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Save Contact</h3>
        <p className="save-modal-hint">Enter your details to save this contact.</p>
        {status === 'sent' ? (
          <p className="save-modal-success">Contact saved! &#10003;</p>
        ) : (
        <form onSubmit={handleSubmit} noValidate>
          <label className="save-modal-field">
            <input
              type="text"
              placeholder="Full Name *"
              value={form.visitorName}
              onChange={(e) => updateField('visitorName', e.target.value)}
            />
            {errors.visitorName && <span className="save-modal-error">{errors.visitorName}</span>}
          </label>
          <label className="save-modal-field">
            <input
              type="text"
              placeholder="Business Name (optional)"
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
            />
          </label>
          <label className="save-modal-field">
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            {errors.email && <span className="save-modal-error">{errors.email}</span>}
          </label>
          <label className="save-modal-field">
            <input
              type="tel"
              placeholder="Phone Number *"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            {errors.phone && <span className="save-modal-error">{errors.phone}</span>}
          </label>
          <div className="save-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>,
    document.body
  )
}

function SubscribeModal({ onClose, trackingSlug }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setStatus('saving')
    try {
      if (trackingSlug) await submitSubscriber(trackingSlug, email.trim())
      setStatus('sent')
      setTimeout(onClose, 1500)
    } catch (err) {
      setStatus('idle')
      setError(err.message || 'Something went wrong')
    }
  }

  return createPortal(
    <div className="save-modal-overlay" onClick={onClose}>
      <div className="save-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Subscribe</h3>
        <p className="save-modal-hint">Enter your email to receive future updates.</p>
        {status === 'sent' ? (
          <p className="save-modal-success">Subscribed! &#10003;</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="save-modal-field">
              <input
                type="email"
                placeholder="Email Address *"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
              />
              {error && <span className="save-modal-error">{error}</span>}
            </label>
            <div className="save-modal-actions">
              <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-button" disabled={status === 'saving'}>
                {status === 'saving' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

export function CardPreview({ profile, immersive = false, trackingSlug = null }) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)

  function track(buttonType) {
    if (trackingSlug) trackButtonClick(trackingSlug, buttonType)
  }
  const typography = profile.typography || {}
  const defaultFont = profile.fontFamily || 'Inter, system-ui, sans-serif'
  const displayName = profile.personName || profile.brandName || profile.companyName
  const companyName = profile.companyName || (profile.personName ? profile.brandName : '')
  const contactActionCount = [
    profile.showCallButton !== false && profile.phone,
    profile.showEmailButton !== false && profile.email,
    profile.showWhatsappButton !== false && profile.whatsapp,
  ].filter(Boolean).length || 1
  const hasAnyQuickAction = (profile.showCallButton !== false && profile.phone)
    || (profile.showEmailButton !== false && profile.email)
    || (profile.showWhatsappButton !== false && profile.whatsapp)
    || profile.showSaveContactButton !== false
  const buttonLabels = { ...BUTTON_LABEL_DEFAULTS, ...(profile.buttonLabels || {}) }
  const visibleSocials = (profile.socials || []).filter((s) => s.enabled !== false)
  const logoSettings = profile.logoSettings ?? {
    width: 108,
    offsetX: 0,
    offsetY: 0,
  }
  const coverSettings = profile.coverSettings ?? {
    height: 325,
    zoom: 100,
    positionX: 50,
    positionY: 35,
    fade: 62,
    shade: 24,
  }

  return (
    <article
      className={`profile-card ${immersive ? 'profile-card--immersive' : ''}`}
      data-card-type={profile.cardType || 'professional'}
      style={{
        ...paletteVariables(profile.palette, profile.theme),
        '--card-font-family': defaultFont,
        '--font-person-name': typography.personName || typography.companyName || defaultFont,
        '--font-designation': typography.designation || defaultFont,
        '--font-company-name': typography.companyName || defaultFont,
        '--font-tagline': typography.tagline || defaultFont,
        '--font-location': typography.location || defaultFont,
        '--font-about': typography.about || defaultFont,
        '--font-button-labels': typography.buttonLabels || defaultFont,
        '--font-footer-text': typography.footerText || defaultFont,
        '--font-website': typography.website || defaultFont,
      }}
    >
      {profile.showLogo !== false && (
        <div
          className="card-top-band"
          style={{
            height: `${logoSettings.bandHeight ?? 130}px`,
            backgroundColor: profile.logoBg || 'transparent',
          }}
        >
          <img
            className="brand-logo"
            src={profile.logo}
            alt={`${profile.brandName} logo`}
            style={{
              maxWidth: `${logoSettings.width ?? 100}%`,
              maxHeight: `${logoSettings.width ?? 100}%`,
              transform: `translateY(${logoSettings.offsetY}px)`,
            }}
          />
        </div>
      )}
      <header className="card-header">
        {profile.showProfilePhoto !== false && (
          <div className="profile-photo-ring" style={{ transform: `translateY(${coverSettings.offsetY ?? 0}px)` }}>
            <div
              className="profile-photo"
              style={{
                backgroundImage: `url(${profile.coverImage})`,
                backgroundSize: coverSettings.bgSize ? `${coverSettings.bgSize}%` : 'cover',
                backgroundPosition: `${coverSettings.positionX ?? 50}% ${coverSettings.positionY ?? 50}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>
        )}
        {profile.showPersonName !== false && displayName && <h2>{displayName}</h2>}
        {profile.showDesignation !== false && profile.designation && <p className="designation">{profile.designation}</p>}
        {profile.showCompanyName !== false && companyName && <p className="company-name">{companyName}</p>}
        {profile.showTagline !== false && profile.tagline && <p className="tagline">{profile.tagline}</p>}
        {profile.showLocation !== false && profile.location && <p className="card-location">{profile.location}</p>}
      </header>

      {profile.showContactButtons !== false && hasAnyQuickAction && (
        <div
          className="quick-actions"
          aria-label="Contact actions"
          style={{ gridTemplateColumns: `repeat(${contactActionCount}, minmax(0, 1fr))` }}
        >
          {profile.showCallButton !== false && profile.phone && <a className="quick-action-call" href={`tel:${profile.phone.replaceAll(' ', '')}`} aria-label="Call" onClick={() => track('call')}>
            <ActionIcon type="call" />
            <span>{buttonLabels.call}</span>
          </a>}
          {profile.showEmailButton !== false && profile.email && <a className="quick-action-email" href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(profile.email)}`} target="_blank" rel="noreferrer" aria-label="Email" onClick={() => track('email')}>
            <ActionIcon type="email" />
            <span>{buttonLabels.email}</span>
          </a>}
          {profile.showWhatsappButton !== false && profile.whatsapp && <a
            className="quick-action-whatsapp"
            href={`https://wa.me/${profile.whatsapp.replaceAll('+', '')}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            onClick={() => track('whatsapp')}
          >
            <ActionIcon type="whatsapp" />
            <span>{buttonLabels.whatsapp}</span>
          </a>}
          {profile.showSaveContactButton !== false && (
            <button className="save-contact" type="button" onClick={() => setShowSaveModal(true)}>
              <ActionIcon type="save" />
              {buttonLabels.saveContact}
            </button>
          )}
        </div>
      )}

      {profile.showAbout !== false && profile.about && <p className="card-about">{profile.about}</p>}

      <footer className="card-footer">
        {profile.showSocialLinks !== false && visibleSocials.length > 0 && (
          <div className="socials">
            {visibleSocials.map(({ platform, url }) => (
              <a key={platform} className={`social-${platform}`} href={safeLink(url)} target="_blank" rel="noreferrer" aria-label={platform} onClick={() => track(platform)}>
                <SocialIcon platform={platform} />
              </a>
            ))}
          </div>
        )}

        {(profile.showSubscribe || (profile.showWebsite !== false && profile.website)) && (
          <div className="footer-cta-group">
            {profile.showSubscribe && (
              <button type="button" className="footer-cta-btn subscribe-btn" onClick={() => setShowSubscribeModal(true)}>
                {buttonLabels.subscribe}
              </button>
            )}
            {profile.showWebsite !== false && profile.website && (
              <a className="footer-cta-btn website-btn" href={safeLink(profile.website)} target="_blank" rel="noreferrer" onClick={() => track('website')}>
                {buttonLabels.website}
              </a>
            )}
          </div>
        )}

        {profile.branding?.poweredBy !== false && (
          <a
            className="powered-by"
            href={profile.branding?.url || 'https://brillbrainsconsultants.com'}
            target="_blank"
            rel="noreferrer"
          >
            {profile.branding?.label || 'Powered by Brillbrains Consultants'}
          </a>
        )}
      </footer>
      {showSaveModal && <SaveContactModal profile={profile} trackingSlug={trackingSlug} onClose={() => setShowSaveModal(false)} />}
      {showSubscribeModal && <SubscribeModal trackingSlug={trackingSlug} onClose={() => setShowSubscribeModal(false)} />}
    </article>
  )
}
