// Missing evidence is an unknown decision; it must not admit a candidate.
export function unavailableFilter(videos, reason = 'Content analysis is unavailable. Unchecked videos are hidden.') {
  return {
    filteredVideos: [],
    decisionMap: Object.fromEntries((videos || []).map(video => [video.videoId, {
      videoId: video.videoId, decision: 'UNKNOWN', reason, confidence: 'LOW'
    }])),
    serviceUnavailable: true,
    errorMessage: reason
  }
}

export function validateFilterResponse(videos, response) {
  if (!response || !Array.isArray(response.allowedIds) ||
      !response.allowedIds.every(id => typeof id === 'string')) {
    return unavailableFilter(videos, 'Content analysis returned an invalid result. Unchecked videos are hidden.')
  }
  const decisions = Array.isArray(response.decisions) ? response.decisions : []
  const decisionMap = {}
  const filteredVideos = videos.filter(video => {
    // An explicit block takes precedence over a contradictory allowedIds entry.
    const matches = decisions.filter(item => item && item.videoId === video.videoId)
    const blocked = matches.some(item => item.decision === 'BLOCK')
    const allowed = response.allowedIds.includes(video.videoId) && !blocked
    const detail = matches.find(item => item.decision === (allowed ? 'ALLOW' : 'BLOCK'))
    decisionMap[video.videoId] = {
      videoId: video.videoId,
      decision: allowed ? 'ALLOW' : 'BLOCK',
      reason: detail?.reason || (allowed ? 'Allowed by metadata analysis' : 'Not allowed by metadata analysis')
    }
    return allowed
  })
  return { filteredVideos, decisionMap }
}

export function normalizeDecision(value) {
  return value === 'ALLOW' || value === 'BLOCK' ? value : 'UNKNOWN'
}
