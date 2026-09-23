/** AI-assisted metadata, transcript and sampled-frame review. */
import { GoogleGenAI } from '@google/genai'
import { buildPrompt } from './prompt-templates'
import store from '../store/index'
import tokenUsageService from './token-usage-service'
import { getRuntimeConfig } from './runtime-config'
import { unavailableFilter, validateFilterResponse, normalizeDecision } from './filter-outcomes'

export async function filterVideosWithGemini(videos, apiKey = null, context = 'recommendations') {
  if (!videos?.length) return { filteredVideos: [], decisionMap: {} }
  const config = getRuntimeConfig()
  apiKey = apiKey || config.apiKey
  if (!apiKey || !config.model) return unavailableFilter(videos, 'Configure an analysis key and model. Unchecked videos are hidden.')
  try {
    const ai = new GoogleGenAI({ apiKey })
    const prompt = buildPrompt(store.getters.getContentFilterPrompt || 'child-safe', 'metadata',
      store.getters.getCustomFilterPrompt || '', videos.map(video => ({
        videoId: video.videoId, title: video.title, author: video.author
      })))
    const response = await ai.models.generateContent({ model: config.model, contents: prompt })
    if (response?.usageMetadata) {
      try { tokenUsageService.recordUsage(response.usageMetadata, `${context}-filtering`) } catch (_) { /* Accounting must not change decisions. */ }
    }
    const text = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || response?.response
    if (typeof text !== 'string' || !text.trim()) return unavailableFilter(videos)
    return validateFilterResponse(videos, JSON.parse(text.replace(/```json|```/g, '').trim()))
  } catch (_) {
    return unavailableFilter(videos)
  }
}

// Caption previews were never implemented for lists. Playback has its own transcript check.
export async function filterVideosWithGeminiEnhanced(videos, apiKey = null, context = 'recommendations', includeCaptions = false) {
  return filterVideosWithGemini(videos, apiKey, context)
}

/**
 * Analyzes the transcript of the currently playing video for inappropriate content
 * @param {Object} videoInfo - Video information object containing title, author, videoId
 * @param {Array} captions - Array of caption objects with url, label, language, mimeType
 * @param {string} apiKey - API key for Gemini
 * @returns {Promise<Object>} - Analysis result with decision and detailed reasoning
 */
export async function analyzeCurrentVideoTranscript(videoInfo, captions, apiKey = null) {
  console.log(`🤖 GEMINI CALL: analyzeCurrentVideoTranscript() - video: "${videoInfo?.title}", captions: ${captions?.length || 0}`)
  
  if (!videoInfo || !captions || captions.length === 0) {
    return { 
      decision: 'UNKNOWN', 
      reason: 'No transcript available for analysis',
      hasTranscript: false 
    }
  }

  // Credentials come from the desktop launch environment.
  if (!apiKey) {
    apiKey = getRuntimeConfig().apiKey // Replace with actual key from environment or settings
    
    if (!apiKey || apiKey === 'INSERT_YOUR_API_KEY') {
      console.warn('No Gemini API key provided, skipping transcript analysis')
      return { 
        decision: 'UNKNOWN', 
        reason: 'No API key available for analysis',
        hasTranscript: false 
      }
    }
  }

  try {
    console.log(`\n🔍 ===== STARTING TRANSCRIPT ANALYSIS =====`)
    console.log(`📺 Video: "${videoInfo.title}"`)
    console.log(`👤 Channel: ${videoInfo.author}`)
    console.log(`🆔 Video ID: ${videoInfo.videoId}`)
    console.log(`===============================================\n`)
    
    // Debug: Show available captions
    console.log(`📋 STEP 1: Checking Available Captions`)
    console.log(`📋 Found ${captions.length} caption track(s):`)
    captions.forEach((caption, index) => {
      const autoLabel = caption.isAutotranslated ? ' [AUTO-GENERATED]' : ' [MANUAL]'
      const statusLabel = caption.url ? '✅ Available' : '❌ Missing URL'
      console.log(`   ${index + 1}. ${caption.label} (${caption.language})${autoLabel} - ${statusLabel}`)
    })
    
    // Find the best caption track (prefer English, then auto-generated, then any available)
    let selectedCaption = null
    
    console.log(`\n🎯 STEP 2: Selecting Best Caption Track`)
    
    // Priority 1: English captions (user uploaded)
    selectedCaption = captions.find(caption => 
      (caption.language === 'en' || caption.language === 'en-US') && 
      !caption.isAutotranslated
    )
    if (selectedCaption) {
      console.log(`✅ Found manual English captions: ${selectedCaption.label}`)
    }
    
    // Priority 2: English auto-generated
    if (!selectedCaption) {
      selectedCaption = captions.find(caption => 
        (caption.language === 'en' || caption.language === 'en-US') && 
        caption.isAutotranslated
      )
      if (selectedCaption) {
        console.log(`✅ Found auto-generated English captions: ${selectedCaption.label}`)
      }
    }
    
    // Priority 3: Any English caption
    if (!selectedCaption) {
      selectedCaption = captions.find(caption => 
        caption.language.startsWith('en')
      )
      if (selectedCaption) {
        console.log(`✅ Found English variant captions: ${selectedCaption.label}`)
      }
    }
    
    // Priority 4: Auto-generated in any language
    if (!selectedCaption) {
      selectedCaption = captions.find(caption => caption.isAutotranslated)
      if (selectedCaption) {
        console.log(`⚠️ Using auto-generated captions in ${selectedCaption.language}: ${selectedCaption.label}`)
      }
    }
    
    // Priority 5: Any available caption
    if (!selectedCaption) {
      selectedCaption = captions[0]
      if (selectedCaption) {
        console.log(`⚠️ Using fallback captions in ${selectedCaption.language}: ${selectedCaption.label}`)
      }
    }

    if (!selectedCaption) {
      console.log(`❌ RESULT: No suitable captions found`)
      console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)
      return { 
        decision: 'UNKNOWN', 
        reason: 'No suitable captions found for analysis',
        hasTranscript: false 
      }
    }

    console.log(`\n📥 STEP 3: Downloading Caption File`)
    console.log(`📁 Selected: ${selectedCaption.label} (${selectedCaption.language})`)

    // Fetch the VTT caption file
    const transcript = await fetchAndParseVTT(selectedCaption.url)
    
    if (!transcript || transcript.length < 50) {
      console.log(`❌ RESULT: Transcript too short for analysis`)
      console.log(`📏 Length: ${transcript ? transcript.length : 0} characters (minimum: 50)`)
      console.log(`📄 Content preview: "${transcript ? transcript.substring(0, 100) : 'null'}"`)
      console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)
      return { 
        decision: 'UNKNOWN', 
        reason: 'Transcript too short or empty for meaningful analysis',
        hasTranscript: false 
      }
    }

    console.log(`✅ STEP 3 SUCCESS: Caption file processed`)
    console.log(`📏 Transcript length: ${transcript.length} characters`)
    console.log(`📝 Preview: "${transcript.substring(0, 150)}..."`)

    console.log(`\n🤖 STEP 4: Sending to Gemini AI for Analysis`)
    
    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({ apiKey })
    const modelName = getRuntimeConfig().model
    if (!modelName) throw new Error('Choose SCOUT_GEMINI_MODEL before enabling analysis')

    // Get current prompt settings
    const selectedPrompt = store.getters.getContentFilterPrompt || 'child-safe'
    const customPrompt = store.getters.getCustomFilterPrompt || ''

    // Create a simplified video info for transcript analysis
    const videosInfo = [{
      videoId: videoInfo.videoId,
      title: videoInfo.title,
      author: videoInfo.author,
      transcript: transcript
    }]

    // Build the analysis prompt using the template system
    const prompt = buildPrompt(selectedPrompt, 'transcript', customPrompt, videosInfo)

    console.log(`🧠 Using AI model: ${modelName}`)
    console.log(`📋 Using prompt template: ${selectedPrompt}`)

    // Generate content with the model
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    })

    // Track token usage from Gemini API response
    // Debug: Response received successfully
    
    if (response && response.usageMetadata) {
      try {
        console.log('📊 Gemini Token Usage:', response.usageMetadata)
        tokenUsageService.recordUsage(response.usageMetadata, 'transcript-analysis')
      } catch (tokenError) {
        console.warn('Error recording token usage:', tokenError)
      }
    } else {
      console.warn('⚠️ No usageMetadata found in Gemini response')
    }

    // Extract the response text
    let responseText = ''
    if (response && response.candidates && response.candidates[0] && 
        response.candidates[0].content && response.candidates[0].content.parts && 
        response.candidates[0].content.parts[0]) {
      responseText = response.candidates[0].content.parts[0].text
    } else {
      console.error('❌ Unexpected response structure:', response)
      console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)
      return { 
        decision: 'UNKNOWN', 
        reason: 'Error in AI response structure',
        hasTranscript: true 
      }
    }

    if (!responseText) {
      console.error('❌ No valid response from Gemini API')
      console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)
      return { 
        decision: 'UNKNOWN', 
        reason: 'No response from AI analysis',
        hasTranscript: true 
      }
    }

    console.log(`✅ STEP 4 SUCCESS: Received AI analysis`)
    console.log(`📝 Raw AI response: ${responseText.substring(0, 200)}...`)

    console.log(`\n🔄 STEP 5: Processing AI Response`)

    // Parse the response JSON
    let analysisResult = {}
    try {
      const cleanText = responseText.replace(/```json|```/g, '').trim()
      console.log(`🧹 Cleaned response: ${cleanText.substring(0, 200)}...`)
      
      analysisResult = JSON.parse(cleanText)
      console.log(`✅ Successfully parsed AI response`)
      console.log(`📊 Response fields: ${Object.keys(analysisResult).join(', ')}`)
    } catch (error) {
      console.error('❌ Error parsing Gemini transcript analysis response:', error)
      console.error('🔍 Failed to parse this text:', responseText)
      console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)
      return { 
        decision: 'UNKNOWN', 
        reason: 'Error parsing AI analysis response',
        hasTranscript: true 
      }
    }

    // Log detailed analysis results
    console.log(`\n🎯 ===== FINAL TRANSCRIPT ANALYSIS RESULTS =====`)
    console.log(`📺 Video: "${videoInfo.title}"`)
    console.log(`👤 Channel: ${videoInfo.author}`)
    console.log(`📋 Caption Source: ${selectedCaption.label} (${selectedCaption.language})`)
    console.log(`📏 Transcript Length: ${transcript.length} characters`)
    console.log(``)
    console.log(`🤖 AI DECISION: ${normalizeDecision(analysisResult.decision)}`)
    console.log(`📊 AI CONFIDENCE: ${analysisResult.confidence || 'MEDIUM'}`)
    console.log(`💭 AI REASONING: ${analysisResult.reason || 'Analysis completed'}`)
    if (analysisResult.concerns && analysisResult.concerns.length > 0) {
      console.log(`⚠️ AI CONCERNS: ${analysisResult.concerns.join(', ')}`)
    }
    console.log(`===============================================`)
    
    if (analysisResult.decision === 'BLOCK') {
      console.log(`🚫 ACTION: VIDEO WILL BE BLOCKED`)
    } else {
      console.log(`✅ ACTION: VIDEO ALLOWED TO PLAY`)
    }
    console.log(`🔚 ===== TRANSCRIPT ANALYSIS COMPLETE =====\n`)

    return {
      decision: normalizeDecision(analysisResult.decision),
      reason: analysisResult.reason || 'Analysis completed',
      confidence: analysisResult.confidence || 'MEDIUM',
      concerns: analysisResult.concerns || [],
      hasTranscript: true,
      captionLanguage: selectedCaption.language,
      captionLabel: selectedCaption.label
    }

  } catch (error) {
    console.error('Error in transcript analysis:', error)
    return { 
      decision: 'UNKNOWN', 
      reason: 'Error during transcript analysis',
      hasTranscript: true,
      error: error.message 
    }
  }
}

/**
 * Fetches and parses a VTT (WebVTT) caption file to extract text content
 * @param {string} vttUrl - URL of the VTT caption file
 * @returns {Promise<string>} - Extracted text content from the captions
 */
async function fetchAndParseVTT(vttUrl) {
  try {
    console.log(`📥 STEP 3A: Fetching VTT Caption File`)
    console.log(`🔗 URL: ${vttUrl}`)
    
    // Check if this is an Invidious URL or direct YouTube URL
    const isInvidiousUrl = vttUrl.includes('/api/v1/captions/')
    const isYouTubeUrl = vttUrl.includes('youtube.com') || vttUrl.includes('googlevideo.com')
    
    console.log(`🔍 URL type: ${isInvidiousUrl ? 'Invidious API' : isYouTubeUrl ? 'YouTube Direct' : 'Unknown'}`)
    
    // Set appropriate headers for the request
    const fetchOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }
    
    // For YouTube URLs, add referer
    if (isYouTubeUrl) {
      fetchOptions.headers['Referer'] = 'https://www.youtube.com/'
    }
    
    console.log(`📡 Making HTTP request...`)
    const response = await fetch(vttUrl, fetchOptions)
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      console.error(`❌ HTTP error fetching VTT! Status: ${response.status}`)
      
      // Try to get more details about the error
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`❌ Error details: ${errorText.substring(0, 200)}...`)
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`)
    }
    
    console.log(`✅ STEP 3A SUCCESS: Caption file downloaded`)
    
    const vttContent = await response.text()
    console.log(`📄 VTT file size: ${vttContent.length} characters`)
    
    // Check if the response is actually VTT content
    if (!vttContent.includes('WEBVTT') && !vttContent.includes('-->')) {
      console.warn(`⚠️ Response doesn't appear to be VTT format`)
      console.warn(`📄 Content preview: ${vttContent.substring(0, 200)}...`)
      
      // If it's an error page or redirect, log it
      if (vttContent.includes('<html>') || vttContent.includes('<!DOCTYPE')) {
        console.error(`❌ Received HTML page instead of VTT captions`)
        throw new Error('Received HTML page instead of VTT captions')
      }
    }
    
    console.log(`📄 STEP 3B: Parsing VTT Content`)
    
    // Parse VTT content to extract just the text
    const lines = vttContent.split('\n')
    const textLines = []
    let inCueBlock = false
    let processedCues = 0
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip VTT header
      if (trimmedLine === 'WEBVTT' || trimmedLine.startsWith('Kind:') || trimmedLine.startsWith('Language:')) {
        continue
      }
      
      // Skip empty lines
      if (trimmedLine === '') {
        inCueBlock = false
        continue
      }
      
      // Skip timestamp lines (format: 00:00:00.000 --> 00:00:00.000)
      if (trimmedLine.includes(' --> ')) {
        inCueBlock = true
        processedCues++
        continue
      }
      
      // Skip cue settings lines (contain position, align, etc.)
      if (inCueBlock && (trimmedLine.includes('position:') || trimmedLine.includes('align:') || trimmedLine.includes('line:'))) {
        continue
      }
      
      // This should be caption text
      if (inCueBlock && trimmedLine !== '') {
        // Clean up VTT formatting tags
        let cleanText = trimmedLine
          .replace(/<[^>]*>/g, '') // Remove HTML/VTT tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
        
        if (cleanText && cleanText !== '') {
          textLines.push(cleanText)
        }
      }
    }
    
    const transcript = textLines.join(' ')
    console.log(`✅ STEP 3B SUCCESS: VTT content parsed`)
    console.log(`📊 Processed ${processedCues} caption cues`)
    console.log(`📝 Extracted ${textLines.length} text lines`)
    console.log(`📏 Total transcript length: ${transcript.length} characters`)
    
    return transcript
    
  } catch (error) {
    console.error(`❌ Error in VTT processing:`, error.message)
    
    // Log additional debugging info
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`❌ Network error - this might be a CORS issue or unreachable URL`)
    }
    
    throw error
  }
}

/**
 * Analyzes a single video frame immediately for inappropriate visual content using Gemini Vision
 * Captures one frame when video is ready for immediate analysis (cost-effective approach)
 * @param {Object} videoInfo - Video information object containing title, author, videoId
 * @param {HTMLVideoElement} videoElement - The video element to capture frames from
 * @param {string} apiKey - API key for Gemini
 * @returns {Promise<Object>} - Analysis result with decision and detailed reasoning
 */
export async function analyzeVideoFrames(videoInfo, videoElement, apiKey = null) {
  console.log(`🤖 GEMINI CALL: analyzeVideoFrames() - video: "${videoInfo?.title}", element: ${!!videoElement}`)
  
  if (!videoInfo || !videoElement) {
    return { 
      decision: 'UNKNOWN', 
      reason: 'No video element available for frame analysis',
      hasFrames: false 
    }
  }

  // Credentials come from the desktop launch environment.
  if (!apiKey) {
    apiKey = getRuntimeConfig().apiKey // Replace with actual key from environment or settings
    
    if (!apiKey || apiKey === 'INSERT_YOUR_API_KEY') {
      console.warn('No Gemini API key provided, skipping frame analysis')
      return { 
        decision: 'UNKNOWN', 
        reason: 'No API key available for frame analysis',
        hasFrames: false 
      }
    }
  }

  try {
    console.log(`\n🎬 ===== STARTING VIDEO FRAME ANALYSIS =====`)
    console.log(`📺 Video: "${videoInfo.title}"`)
    console.log(`👤 Channel: ${videoInfo.author}`)
    console.log(`🆔 Video ID: ${videoInfo.videoId}`)
    console.log(`===============================================\n`)
    
    console.log(`🎥 STEP 1: Checking Video Element Status`)
    
    // Check if video is ready, if not wait a bit
    if (videoElement.readyState < 2) {
      console.log(`⏳ Video not ready (readyState: ${videoElement.readyState}/4), waiting...`)
      
      // Wait up to 10 seconds for video to be ready
      await new Promise((resolve) => {
        let attempts = 0
        const maxAttempts = 20 // 10 seconds with 500ms intervals
        
        const checkReady = () => {
          if (videoElement.readyState >= 2 || attempts >= maxAttempts) {
            resolve()
          } else {
            attempts++
            setTimeout(checkReady, 500)
          }
        }
        
        checkReady()
      })
    }
    
    console.log(`📹 Final video state: ${videoElement.readyState}/4 (2+ needed for frame capture)`)
    console.log(`📐 Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`)
    console.log(`⏱️ Video duration: ${videoElement.duration}s`)
    console.log(`⏱️ Current time: ${videoElement.currentTime}s`)
    
    if (videoElement.readyState < 2) {
      console.log(`❌ Video still not ready after waiting, cannot capture frame`)
      return {
        decision: 'UNKNOWN',
        reason: 'Video not ready for frame capture - analysis unavailable',
        confidence: 'LOW',
        hasFrames: false,
        framesAnalyzed: 0,
        captureTime: videoElement.currentTime,
        analysisType: 'skipped-not-ready'
      }
    }
    
    console.log(`✅ STEP 1 SUCCESS: Video element is ready for frame capture`)
    
    console.log(`\n🖼️ STEP 2: Capturing Video Frame`)
    
    // Create a canvas to capture the video frame
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Set canvas dimensions to match video
    const videoWidth = videoElement.videoWidth || 640
    const videoHeight = videoElement.videoHeight || 480
    canvas.width = videoWidth
    canvas.height = videoHeight
    
    console.log(`🎨 Canvas created: ${canvas.width}x${canvas.height}`)
    
    try {
      // Draw the current video frame to the canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      console.log(`🎨 Frame drawn to canvas successfully`)
    } catch (drawError) {
      console.error(`❌ Error drawing video frame to canvas:`, drawError)
      return {
        decision: 'UNKNOWN',
        reason: 'Error capturing video frame - analysis unavailable',
        confidence: 'LOW',
        hasFrames: false,
        error: drawError.message
      }
    }
    
    // Convert canvas to base64 image data
    let imageData
    try {
      imageData = canvas.toDataURL('image/jpeg', 0.8)
      console.log(`📸 Frame captured as JPEG (${Math.round(imageData.length / 1024)}KB)`)
    } catch (dataError) {
      console.error(`❌ Error converting canvas to image data:`, dataError)
      return {
        decision: 'UNKNOWN',
        reason: 'Error processing video frame - analysis unavailable',
        confidence: 'LOW',
        hasFrames: false,
        error: dataError.message
      }
    }
    
    console.log(`✅ STEP 2 SUCCESS: Video frame captured`)
    
    console.log(`\n🤖 STEP 3: Sending Frame to Gemini Vision API`)
    
    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({ apiKey })
    const modelName = getRuntimeConfig().model
    if (!modelName) throw new Error('Choose SCOUT_GEMINI_MODEL before enabling analysis')
    
    console.log(`🧠 Using AI model: ${modelName}`)
    
    // Get current prompt settings for visual analysis
    const selectedPrompt = store.getters.getContentFilterPrompt || 'child-safe'
    const customPrompt = store.getters.getCustomFilterPrompt || ''
    
    // Create prompt for frame analysis
    const frameAnalysisPrompt = buildFrameAnalysisPrompt(selectedPrompt, customPrompt, videoInfo)
    
    console.log(`📋 Using prompt template: ${selectedPrompt}`)
    console.log(`🔍 Analyzing video frame for inappropriate visual content...`)
    
    // Generate content with the model using vision
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [
          {
            text: frameAnalysisPrompt
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
            }
          }
        ]
      }]
    })
    
    console.log(`✅ STEP 3 SUCCESS: Received response from Gemini Vision`)
    
    // Track token usage from Gemini API response
    // Debug: Response received successfully
    
    if (response && response.usageMetadata) {
      try {
        console.log('📊 Gemini Token Usage:', response.usageMetadata)
        tokenUsageService.recordUsage(response.usageMetadata, 'frame-analysis')
      } catch (tokenError) {
        console.warn('Error recording token usage:', tokenError)
      }
    } else {
      console.warn('⚠️ No usageMetadata found in Gemini response')
    }

    // Extract the response text
    let responseText = ''
    if (response && response.candidates && response.candidates[0] && 
        response.candidates[0].content && response.candidates[0].content.parts && 
        response.candidates[0].content.parts[0]) {
      responseText = response.candidates[0].content.parts[0].text
    } else {
      console.error('❌ Unexpected response structure:', response)
      return { 
        decision: 'UNKNOWN', 
        reason: 'Error in AI response structure for frame analysis',
        hasFrames: true,
        framesAnalyzed: 1,
        analysisType: 'error'
      }
    }

    if (!responseText) {
      console.error('❌ No valid response from Gemini Vision API')
      return { 
        decision: 'UNKNOWN', 
        reason: 'No response from AI frame analysis',
        hasFrames: true,
        framesAnalyzed: 1,
        analysisType: 'error'
      }
    }

    console.log(`📝 Raw AI vision response: ${responseText.substring(0, 200)}...`)
    
    console.log(`\n🔄 STEP 4: Processing Frame Analysis Response`)

    // Parse the response JSON
    let analysisResult = {}
    try {
      const cleanText = responseText.replace(/```json|```/g, '').trim()
      console.log(`🧹 Cleaned response: ${cleanText.substring(0, 200)}...`)
      
      analysisResult = JSON.parse(cleanText)
      console.log(`✅ Successfully parsed frame analysis response`)
      console.log(`📊 Response fields: ${Object.keys(analysisResult).join(', ')}`)
    } catch (error) {
      console.error('❌ Error parsing Gemini frame analysis response:', error)
      console.error('🔍 Failed to parse this text:', responseText)
      return { 
        decision: 'UNKNOWN', 
        reason: 'Error parsing AI frame analysis response',
        hasFrames: true,
        framesAnalyzed: 1,
        analysisType: 'parse-error'
      }
    }

    // Log detailed frame analysis results
    console.log(`\n🎯 ===== FINAL FRAME ANALYSIS RESULTS =====`)
    console.log(`📺 Video: "${videoInfo.title}"`)
    console.log(`👤 Channel: ${videoInfo.author}`)
    console.log(`🖼️ Frame Size: ${canvas.width}x${canvas.height}`)
    console.log(`⏱️ Capture Time: ${videoElement.currentTime.toFixed(1)}s`)
    console.log(``)
    console.log(`🤖 AI DECISION: ${normalizeDecision(analysisResult.decision)}`)
    console.log(`📊 AI CONFIDENCE: ${analysisResult.confidence || 'MEDIUM'}`)
    console.log(`💭 AI REASONING: ${analysisResult.reason || 'Frame analysis completed'}`)
    if (analysisResult.concerns && analysisResult.concerns.length > 0) {
      console.log(`⚠️ VISUAL CONCERNS: ${analysisResult.concerns.join(', ')}`)
    }
    if (analysisResult.frameAnalysis) {
      console.log(`🔍 VISUAL CONTENT: ${analysisResult.frameAnalysis}`)
    }
    console.log(`===============================================`)
    
    if (analysisResult.decision === 'BLOCK') {
      console.log(`🚫 ACTION: VIDEO WILL BE BLOCKED`)
    } else {
      console.log(`✅ ACTION: VIDEO ALLOWED TO CONTINUE`)
    }
    console.log(`🔚 ===== FRAME ANALYSIS COMPLETE =====\n`)

    return {
      decision: normalizeDecision(analysisResult.decision),
      reason: analysisResult.reason || 'Frame analysis completed',
      confidence: analysisResult.confidence || 'MEDIUM',
      concerns: analysisResult.concerns || [],
      frameAnalysis: analysisResult.frameAnalysis || 'Visual content analyzed',
      hasFrames: true,
      framesAnalyzed: 1,
      captureTime: videoElement.currentTime,
      analysisType: 'gemini-vision'
    }

  } catch (error) {
    console.error('❌ Error in video frame analysis:', error)
    
    // 🚫 SAFETY FIRST: On any error, block the content
    console.error('🚫 SAFETY MODE: Blocking due to frame analysis error')
    
    return { 
      decision: 'BLOCK', 
      reason: 'Error during video frame analysis - blocking for safety',
      confidence: 'HIGH',
      concerns: ['analysis-error'],
      hasFrames: false,
      error: error.message 
    }
  }
}

/**
 * Builds a specialized prompt for frame analysis using Gemini Vision
 * @param {string} selectedPrompt - The selected prompt template ID
 * @param {string} customPrompt - Custom prompt text if using custom template
 * @param {Object} videoInfo - Video information object
 * @returns {string} - Formatted prompt for frame analysis
 */
function buildFrameAnalysisPrompt(selectedPrompt, customPrompt, videoInfo) {
  const basePrompt = `
You are analyzing a single frame from a video for inappropriate visual content.

VIDEO INFORMATION:
- Title: "${videoInfo.title}"
- Channel: ${videoInfo.author}
- Video ID: ${videoInfo.videoId}

ANALYSIS TASK:
Carefully examine this video frame for any inappropriate visual content including:
- Sexual or suggestive imagery
- Violence or graphic content  
- Inappropriate behavior or gestures
- Drug/alcohol use or paraphernalia
- Disturbing or scary imagery
- Any content inappropriate for children

RESPONSE FORMAT:
Return your analysis as JSON with this exact structure:
{
  "decision": "ALLOW" or "BLOCK",
  "confidence": "LOW", "MEDIUM", or "HIGH", 
  "reason": "Brief explanation of your decision",
  "concerns": ["list", "of", "specific", "visual", "concerns"],
  "frameAnalysis": "Description of what you see in this frame"
}

Be very careful and thorough in your analysis. If there's any doubt about appropriateness, err on the side of caution.
`

  // Add custom prompt modifications if using custom template
  if (selectedPrompt === 'custom' && customPrompt) {
    return basePrompt + '\n\nADDITIONAL GUIDELINES:\n' + customPrompt
  }
  
  return basePrompt
} 