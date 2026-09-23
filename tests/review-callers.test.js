import SearchPage from '../src/renderer/views/SearchPage/SearchPage'
import Watch from '../src/renderer/views/Watch/Watch'
import { filterVideosWithGemini, analyzeCurrentVideoTranscript } from '../src/renderer/services/gemini-service'
jest.mock('shaka-player', () => ({}))
jest.mock('youtubei.js', () => ({ Utils: {}, YTNodes: {} }))
jest.mock('../src/renderer/helpers/utils', () => ({ showToast: jest.fn() }))
jest.mock('../src/renderer/helpers/api/local', () => ({}))
jest.mock('../src/renderer/helpers/api/invidious', () => ({}))
jest.mock('../src/renderer/services/gemini-service', () => ({ filterVideosWithGemini: jest.fn(), analyzeCurrentVideoTranscript: jest.fn(), analyzeVideoFrames: jest.fn() }))
jest.mock('../src/renderer/services/backend-filter-service', () => ({ filterVideosWithBackend: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  for (const method of ['log', 'warn', 'error']) jest.spyOn(console, method).mockImplementation(() => {})
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

test('search caller removes unchecked results on an unexpected provider rejection', async () => {
  filterVideosWithGemini.mockRejectedValue(new Error('unexpected'))
  const viewer = { analysisCompleted: false, useBackendFiltering: false, shownResults: [{ type: 'video', videoId: 'old' }],
    $t: x => x, $store: { commit: jest.fn() }, stopAnalysisTimer: jest.fn(), updateSubscriptionDetails: jest.fn() }
  await SearchPage.methods.applyGeminiFiltering.call(viewer, [{ type: 'video', videoId: 'new' }])
  expect(viewer.shownResults).toEqual([])
  expect(viewer.analysisCompleted).toBe(true)
})
test('recommendation caller clears unchecked candidates on unexpected failure', async () => {
  filterVideosWithGemini.mockRejectedValue(new Error('unexpected'))
  const viewer = { geminiFilterInProgress: false, useBackendFiltering: false, recommendedVideos: [{ videoId: 'a' }], $t: x => x }
  await Watch.methods.geminiFilterVideos.call(viewer)
  expect(viewer.recommendedVideos).toEqual([])
  expect(viewer.geminiFilterInProgress).toBe(false)
})
test('frame aggregation never promotes missing evidence to allow', () => {
  const aggregate = Watch.methods.compileFrameAnalysisResults
  expect(aggregate.call({}, []).decision).toBe('UNKNOWN')
  expect(aggregate.call({}, [{ decision: 'ALLOW' }, { decision: 'UNKNOWN' }]).decision).toBe('UNKNOWN')
  expect(aggregate.call({}, [{ decision: 'UNKNOWN' }, { decision: 'BLOCK' }]).decision).toBe('BLOCK')
})
test('transcript result reaches the combined playback check', async () => {
  analyzeCurrentVideoTranscript.mockResolvedValue({ decision: 'ALLOW', reason: 'Fictional transcript accepted' })
  const viewer = { captionTracks: [{ language: 'en' }], videoTitle: 'Fictional clip', channelName: 'Test', videoId: 'example' }
  expect((await Watch.methods.analyzeVideoTranscriptAutomatically.call(viewer)).decision).toBe('ALLOW')
})
