import { filterVideosWithGemini, analyzeCurrentVideoTranscript, analyzeVideoFrames } from '../src/renderer/services/gemini-service'
import { filterVideosWithBackend } from '../src/renderer/services/backend-filter-service'
import { getAISearchSuggestions } from '../src/renderer/services/ai-search-autocomplete'
import { validateFilterResponse } from '../src/renderer/services/filter-outcomes'
import { getRuntimeConfig } from '../src/renderer/services/runtime-config'
import axios from 'axios'
import { GoogleGenAI } from '@google/genai'

jest.mock('axios')
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }))
jest.mock('../src/renderer/store/index', () => ({ getters: {} }))
jest.mock('../src/renderer/services/token-usage-service', () => ({ recordUsage: jest.fn() }))

const videos = [{ videoId: 'a', title: 'Fictional lesson' }, { videoId: 'b', title: 'Fictional story' }]
let generate
beforeEach(() => {
  jest.clearAllMocks()
  process.env.IS_ELECTRON = 'true'
  global.window = { require: () => ({ env: { SCOUT_GEMINI_API_KEY: 'fictional-test-key', SCOUT_GEMINI_MODEL: 'test-model', SCOUT_FILTER_BACKEND_URL: 'https://backend.example' } }) }
  generate = jest.fn()
  GoogleGenAI.mockImplementation(() => ({ models: { generateContent: generate } }))
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks(); delete global.window; delete process.env.IS_ELECTRON })

test('missing runtime key withholds candidates without calling the model', async () => {
  delete global.window
  const result = await filterVideosWithGemini(videos)
  expect(result.filteredVideos).toEqual([])
  expect(result.decisionMap.a.decision).toBe('UNKNOWN')
  expect(GoogleGenAI).not.toHaveBeenCalled()
})
test.each([null, {}, { text: '' }, { text: 'not json' }, { text: '{"allowedIds":"a"}' }])('invalid model response hides candidates: %p', async response => {
  generate.mockResolvedValue(response)
  expect((await filterVideosWithGemini(videos)).filteredVideos).toEqual([])
})
test('provider outage hides candidates', async () => {
  generate.mockRejectedValue(new Error('unavailable'))
  expect((await filterVideosWithGemini(videos)).serviceUnavailable).toBe(true)
})
test('valid response admits only requested allowed IDs; explicit block wins', async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ allowedIds: ['a', 'b', 'foreign'], decisions: [{ videoId: 'b', decision: 'BLOCK' }] }) })
  expect((await filterVideosWithGemini(videos)).filteredVideos).toEqual([videos[0]])
})
test('duplicate conflicting decisions cannot overwrite a block', () => {
  const result = validateFilterResponse(videos, { allowedIds: ['a'], decisions: [{ videoId: 'a', decision: 'BLOCK' }, { videoId: 'a', decision: 'ALLOW' }] })
  expect(result.filteredVideos).toEqual([])
})
test('backend requires an explicit positive assessment, not an empty object', async () => {
  axios.post.mockResolvedValue({ data: { analysis: {} } })
  const result = await filterVideosWithBackend(videos)
  expect(result.filteredVideos).toEqual([])
  expect(result.decisionMap.a.decision).toBe('UNKNOWN')
})
test('backend rejects transport errors and respects explicit blocks', async () => {
  axios.post.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { analysis: { appropriate: true, recommendation: 'block' } } })
  expect((await filterVideosWithBackend(videos)).filteredVideos).toEqual([])
})
test('backend accepts an explicit positive result', async () => {
  axios.post.mockResolvedValue({ data: { analysis: { appropriate: true, recommendation: 'allow' } } })
  expect((await filterVideosWithBackend(videos)).filteredVideos).toEqual(videos)
})
test('unconfigured backend performs no requests', async () => {
  delete global.window
  expect((await filterVideosWithBackend(videos)).serviceUnavailable).toBe(true)
  expect(axios.post).not.toHaveBeenCalled()
})
test.each(['http://remote.example', 'https://user:pass@example.com', 'https://example.com?key=x', 'https://example.com#secret'])('rejects unsafe backend URL: %s', url => {
  global.window = { require: () => ({ env: { SCOUT_FILTER_BACKEND_URL: url } }) }
  expect(getRuntimeConfig().backendUrl).toBe('')
})
test('missing playback evidence remains unknown', async () => {
  expect((await analyzeCurrentVideoTranscript({ title: 'Test' }, [])).decision).toBe('UNKNOWN')
  expect((await analyzeVideoFrames({ title: 'Test' }, null)).decision).toBe('UNKNOWN')
})
test('autocomplete fails explicitly when unconfigured, permitting the UI fallback', async () => {
  delete global.window
  jest.spyOn(console, 'error').mockImplementation(() => {})
  await expect(getAISearchSuggestions('science')).rejects.toThrow('unavailable')
  expect(GoogleGenAI).not.toHaveBeenCalled()
})
