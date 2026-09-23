/**
 * AI-powered search autocomplete service for Kid Safe Browser
 * Uses parent-chosen search assistant prompts to generate contextually appropriate search suggestions
 * Integrates with the existing Gemini Flash setup
 */

import store from '../store/index'
import { getRuntimeConfig } from './runtime-config'
import { SEARCH_ASSISTANT_TEMPLATES } from './search-assistant-templates'
import { GoogleGenAI } from '@google/genai'
import tokenUsageService from './token-usage-service'

/**
 * Generates AI-powered search autocomplete suggestions based on the parent's chosen search assistant prompt
 * @param {string} partialQuery - The partial search term entered by the user
 * @param {string} context - Context of the search ('search' or 'suggestions')
 * @returns {Promise<string[]>} - Array of suggested search completions
 */
export async function getAISearchSuggestions(partialQuery, context = 'search') {
  // Get the current search assistant prompt setting
  const searchAssistantPrompt = store.getters.getSearchAssistantPrompt
  const customSearchAssistantPrompt = store.getters.getCustomSearchAssistantPrompt
  
  if (!partialQuery || partialQuery.trim().length < 2) {
    return []
  }

  try {
    // Use the same API key as the existing Gemini service
    const { apiKey, model: modelName } = getRuntimeConfig()
    
    if (!apiKey || apiKey === 'INSERT_YOUR_API_KEY') {
      throw new Error('Gemini API key not configured')
    }

    // Build the search assistant guidance
    const searchGuidance = getSearchGuidanceFromTemplate(searchAssistantPrompt, customSearchAssistantPrompt)
    
    // Create the complete prompt for Gemini
    const prompt = buildSearchAutocompletePrompt(partialQuery, searchGuidance, context)
    
    console.log('AI Search Autocomplete: Calling Gemini for query:', partialQuery)
    
    // Initialize the Google GenAI client (same as gemini-service.js)
    const ai = new GoogleGenAI({ apiKey })
    
    // Use the same model as the filtering service
    if (!modelName) throw new Error('Choose SCOUT_GEMINI_MODEL before enabling suggestions')
    
    // Generate content with the model
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    })

    // Track token usage from Gemini API response
    if (response && response.usageMetadata) {
      try {
        console.log('📊 AI Search Autocomplete - Found usageMetadata:', response.usageMetadata)
        tokenUsageService.recordUsage(response.usageMetadata, 'search-autocomplete')
      } catch (tokenError) {
        console.warn('Error recording token usage in AI search autocomplete:', tokenError)
      }
    } else {
      console.warn('⚠️ AI Search Autocomplete - No usageMetadata found in response:', Object.keys(response || {}))
    }

    // Extract the response text (same extraction logic as gemini-service.js)
    let responseText = ''
    if (response && response.candidates && response.candidates[0] && 
        response.candidates[0].content && response.candidates[0].content.parts && 
        response.candidates[0].content.parts[0]) {
      responseText = response.candidates[0].content.parts[0].text
    } else if (response && response.response) {
      responseText = response.response
    } else {
      throw new Error('Unexpected response structure from Gemini')
    }

    if (!responseText) {
      throw new Error('No valid response from Gemini API')
    }

    console.log('AI Search Autocomplete: Raw Gemini response:', responseText)

    // Parse the response into individual suggestions
    const suggestions = parseGeminiSuggestions(responseText)
    
    console.log('AI Search Autocomplete: Parsed suggestions:', suggestions)
    
    return suggestions

  } catch (error) {
    console.error('AI search autocomplete error:', error)
    throw new Error(`Search assistant is temporarily unavailable: ${error.message}`)
  }
}

/**
 * Get search guidance from the selected template
 * @param {string} templateId - Template ID (e.g., 'educational-focus', 'creative-explorer', 'custom')
 * @param {string} customPrompt - Custom prompt if template is 'custom'
 * @returns {string} - Search guidance text
 */
function getSearchGuidanceFromTemplate(templateId, customPrompt) {
  const template = SEARCH_ASSISTANT_TEMPLATES[templateId]
  
  if (templateId === 'custom' && customPrompt) {
    return customPrompt
  } else if (template && template.basePrompt) {
    return template.basePrompt
  } else {
    // Fallback to educational focus
    return SEARCH_ASSISTANT_TEMPLATES['educational-focus'].basePrompt
  }
}

/**
 * Build the complete prompt for Gemini Flash
 * @param {string} partialQuery - User's partial search term
 * @param {string} searchGuidance - Search assistant guidance
 * @param {string} context - Search context
 * @returns {string} - Complete prompt for AI
 */
function buildSearchAutocompletePrompt(partialQuery, searchGuidance, context) {
  return `${searchGuidance}

You are helping with search autocomplete. The user has started typing "${partialQuery}" in a YouTube search box.

Your task: Suggest 4-5 search completions that would help them find great educational content.

Important rules:
1. Each suggestion should start with or contain "${partialQuery}"
2. Make suggestions that would lead to actual YouTube videos/channels
3. Focus on educational, skill-building, or creative content
4. Keep suggestions natural and searchable
5. Vary the topics to give different options

Examples of good completions for "how to":
- "how to draw animals for beginners"
- "how to code in Python tutorial"
- "how to grow plants at home"

Examples of good completions for "science":
- "science experiments for kids"
- "science documentary animals"  
- "science facts space"

Current user input: "${partialQuery}"

Please provide 4-5 search suggestions, one per line, no numbers or bullets:`
}

/**
 * Parse Gemini's response into individual suggestions
 * @param {string} text - Raw response from Gemini
 * @returns {string[]} - Array of parsed suggestions
 */
function parseGeminiSuggestions(text) {
  if (!text) return []
  
  // Split by lines and clean up
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.match(/^[\d\-\*\•]/)) // Remove numbered/bulleted lines
    .filter(line => !line.toLowerCase().includes('here are') && !line.toLowerCase().includes('suggestions:'))
    .slice(0, 5) // Max 5 suggestions
  
  // Clean up any remaining formatting
  return lines.map(line => {
    // Remove quotes, bullets, numbers, etc.
    return line.replace(/^["'\-\*\•\d\.]+\s*/, '')
              .replace(/["']+$/, '')
              .replace(/^-\s*/, '') // Remove leading dashes
              .trim()
  }).filter(suggestion => suggestion.length > 2 && suggestion.length < 100)
}

/**
 * Combines AI suggestions with traditional search suggestions
 * @param {string} query - The search query
 * @param {string[]} traditionalSuggestions - Suggestions from YouTube/Invidious
 * @returns {Promise<string[]>} - Combined suggestions with AI suggestions prioritized
 */
export async function getCombinedSearchSuggestions(query, traditionalSuggestions = []) {
  try {
    // Get AI-powered suggestions
    const aiSuggestions = await getAISearchSuggestions(query)
    
    // Start with AI suggestions
    const combined = [...aiSuggestions]
    
    // Add traditional suggestions that don't conflict with AI ones, with filtering
    const traditionalFiltered = traditionalSuggestions.filter(trad => {
      const tradLower = trad.toLowerCase()
      
      // Don't include if too similar to AI suggestions
      const tooSimilar = aiSuggestions.some(ai => 
        ai.toLowerCase().includes(tradLower) || tradLower.includes(ai.toLowerCase())
      )
      
      if (tooSimilar) return false
      
      // Apply basic appropriateness filter for traditional suggestions
      const inappropriateTerms = [
        'drama', 'gossip', 'prank', 'viral', 'famous', 'reaction', 'react to',
        'roast', 'diss', 'beef', 'exposed', 'clickbait', 'cringe', 'shocking',
        'vs', 'fight', 'destroy', 'epic fail', 'gone wrong', 'gone sexual'
      ]
      
      return !inappropriateTerms.some(term => tradLower.includes(term))
    })
    
    // Add filtered traditional suggestions up to total limit
    const maxTotal = 8
    const remainingSlots = maxTotal - combined.length
    combined.push(...traditionalFiltered.slice(0, remainingSlots))
    
    return combined
  } catch (error) {
    console.error('Error getting AI search suggestions:', error)
    
    // If AI fails, return filtered traditional suggestions
    const filtered = traditionalSuggestions.filter(trad => {
      const tradLower = trad.toLowerCase()
      const inappropriateTerms = [
        'drama', 'gossip', 'prank', 'viral', 'famous', 'reaction', 'react to',
        'roast', 'diss', 'beef', 'exposed', 'clickbait', 'cringe', 'shocking',
        'vs', 'fight', 'destroy', 'epic fail', 'gone wrong', 'gone sexual'
      ]
      return !inappropriateTerms.some(term => tradLower.includes(term))
    }).slice(0, 8)
    
    return filtered
  }
}

/**
 * Gets enhanced search suggestions with parent context
 * @param {string} query - The search query  
 * @param {string[]} fallbackSuggestions - Fallback suggestions if AI fails
 * @returns {Promise<string[]>} - Enhanced suggestions
 */
export async function getEnhancedSearchSuggestions(query, fallbackSuggestions = []) {
  // Check if AI suggestions are enabled in settings
  const enableAISuggestions = store.getters.getEnableSearchSuggestions
  
  if (!enableAISuggestions) {
    return fallbackSuggestions.slice(0, 8)
  }
  
  try {
    return await getCombinedSearchSuggestions(query, fallbackSuggestions)
  } catch (error) {
    console.error('Enhanced search suggestions failed:', error)
    return fallbackSuggestions.slice(0, 8)
  }
} 