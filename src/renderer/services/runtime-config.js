// Read the desktop launch environment at runtime; never inject credentials into bundles.
export function getRuntimeConfig() {
  let env = {}
  try {
    if (process.env.IS_ELECTRON && typeof window !== 'undefined' && window.require) {
      env = window.require('process').env
    }
  } catch { /* A web preview has no desktop credentials. */ }
  let backendUrl = ''
  try {
    const url = new URL(env.SCOUT_FILTER_BACKEND_URL || '')
    if ((url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) &&
        !url.username && !url.password && !url.search && !url.hash) {
      backendUrl = url.href.replace(/\/$/, '')
    }
  } catch { /* An unconfigured backend is unavailable. */ }
  return {
    apiKey: env.SCOUT_GEMINI_API_KEY || '',
    model: env.SCOUT_GEMINI_MODEL || '',
    backendUrl
  }
}
