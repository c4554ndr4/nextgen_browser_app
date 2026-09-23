import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { createWebURL } from '../helpers/utils'
// List of locales approved for use
import activeLocales from '../../../static/locales/activeLocales.json'

Vue.use(VueI18n)

const i18n = new VueI18n({
  locale: 'en-US',
  fallbackLocale: 'en-US'
})

export async function loadLocale(locale) {
  // Only support en-US
  if (locale !== 'en-US') {
    console.warn(`Locale "${locale}" not supported, falling back to en-US`)
    locale = 'en-US'
  }

  // don't need to load it if it's already loaded
  if (i18n.availableLocales.includes(locale)) {
    return
  }

  let path

  // locales are only compressed in our production Electron builds
  if (process.env.IS_ELECTRON && process.env.NODE_ENV !== 'development') {
    path = `/static/locales/${locale}.json.br`
  } else {
    path = `/static/locales/${locale}.json`
  }

  const url = createWebURL(path)

  const response = await fetch(url)
  const data = await response.json()
  i18n.setLocaleMessage(locale, data)
}

// Set by _scripts/ProcessLocalesPlugin.js
if (process.env.HOT_RELOAD_LOCALES) {
  const websocket = new WebSocket('ws://localhost:9080/ws')

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data)

    if (message.type === 'freetube-locale-update') {
      for (const [locale, data] of message.data) {
        // Only update en-US locale data
        if (locale === 'en-US' && i18n.availableLocales.includes(locale)) {
          const localeData = JSON.parse(data)
          i18n.setLocaleMessage(locale, localeData)
        }
      }
    }
  }
}

export default i18n
