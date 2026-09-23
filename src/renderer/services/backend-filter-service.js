/** Optional separately deployed metadata analysis API. */
import axios from 'axios'
import { getRuntimeConfig } from './runtime-config'
import { unavailableFilter } from './filter-outcomes'

export async function filterVideosWithBackend(videos, context = 'recommendations') {
  if (!videos?.length) return { filteredVideos: [], decisionMap: {} }
  const { backendUrl } = getRuntimeConfig()
  if (!backendUrl) return unavailableFilter(videos, 'Configure the analysis backend. Unchecked videos are hidden.')
  const filteredVideos = []
  const decisionMap = {}
  let unavailable = false
  for (const video of videos) {
    try {
      const response = await axios.post(`${backendUrl}/api/content-analysis/analyze-metadata`, {
        title: video.title,
        channel_name: video.author || 'Unknown Channel',
        video_id: video.videoId,
        child_age: 11,
        model_type: 'gemini',
        lds_filter: false,
        high_agency_filter: true
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 })
      const analysis = response.data?.analysis
      if (!analysis || typeof analysis.appropriate !== 'boolean') throw new Error('Incomplete analysis')
      const allowed = analysis.appropriate === true && analysis.recommendation !== 'block'
      decisionMap[video.videoId] = { decision: allowed ? 'ALLOW' : 'BLOCK', reason: analysis.reasoning || 'Metadata analysis completed' }
      if (allowed) filteredVideos.push(video)
    } catch {
      unavailable = true
      decisionMap[video.videoId] = { decision: 'UNKNOWN', reason: 'Analysis unavailable; this video is hidden' }
    }
  }
  return {
    filteredVideos,
    decisionMap,
    serviceUnavailable: unavailable,
    ...(unavailable ? { errorMessage: 'Some content could not be analyzed. Unchecked videos are hidden.' } : {})
  }
}

export async function testBackendConnection() {
  const status = await getBackendStatus()
  return status.available === true
}

export async function getBackendStatus() {
  const { backendUrl } = getRuntimeConfig()
  if (!backendUrl) return { available: false, error: 'Backend not configured' }
  try {
    const response = await axios.get(`${backendUrl}/health`, { timeout: 10000 })
    return { ...response.data, available: response.status === 200 }
  } catch { return { available: false, error: 'Backend unavailable' } }
}
