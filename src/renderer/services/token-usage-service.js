/**
 * Simple token usage tracking service for Gemini API calls
 */

const STORAGE_KEY = 'gemini_token_usage'

/**
 * Simple token usage data structure:
 * {
 *   totalInputTokens: number,
 *   totalOutputTokens: number,
 *   totalTokens: number,
 *   totalCost: number,
 *   apiCallsCount: number,
 *   lastUpdated: timestamp
 * }
 */

class TokenUsageService {
  constructor() {
    this.usage = this.loadUsage()
  }

  /**
   * Load token usage data from localStorage
   */
  loadUsage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Error loading token usage data:', error)
    }
    
    // Return default structure
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      apiCallsCount: 0,
      lastUpdated: Date.now()
    }
  }

  /**
   * Save token usage data to localStorage
   */
  saveUsage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usage))
    } catch (error) {
      console.warn('Error saving token usage data:', error)
    }
  }

  /**
   * Record token usage from a Gemini API response
   * @param {Object} usageMetadata - The usage metadata from Gemini API response
   * @param {string} operation - Type of operation (e.g., 'video-filtering', 'transcript-analysis', 'frame-analysis')
   */
  recordUsage(usageMetadata, operation = 'unknown') {
    if (!usageMetadata) {
      console.warn('No usage metadata provided to recordUsage')
      return
    }

    const inputTokens = usageMetadata.promptTokenCount || 0
    const outputTokens = usageMetadata.candidatesTokenCount || 0
    const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens)

    // Calculate costs (Gemini 2.0 Flash pricing)
    const inputCost = inputTokens * 0.000001875  // $1.875 per 1M tokens
    const outputCost = outputTokens * 0.0000075  // $7.50 per 1M tokens
    const callCost = inputCost + outputCost

    // Update totals
    this.usage.totalInputTokens += inputTokens
    this.usage.totalOutputTokens += outputTokens
    this.usage.totalTokens += totalTokens
    this.usage.totalCost += callCost
    this.usage.apiCallsCount += 1
    this.usage.lastUpdated = Date.now()

    // Save to localStorage
    this.saveUsage()

    console.log(`📊 Token usage recorded: ${totalTokens} tokens (${inputTokens} input + ${outputTokens} output) = $${callCost.toFixed(6)} for ${operation}`)
  }

  /**
   * Get current usage statistics (for Vue component)
   */
  getUsage() {
    return {
      totalTokens: this.usage.totalTokens,
      totalInputTokens: this.usage.totalInputTokens,
      totalOutputTokens: this.usage.totalOutputTokens,
      totalCost: this.usage.totalCost,
      apiCallsCount: this.usage.apiCallsCount,
      lastUpdated: this.usage.lastUpdated
    }
  }

  /**
   * Format a number with commas for display
   */
  formatNumber(num) {
    if (typeof num !== 'number') return '0'
    return num.toLocaleString()
  }

  /**
   * Format cost as currency
   */
  formatCost(cost) {
    if (typeof cost !== 'number') return '$0.0000'
    return `$${cost.toFixed(4)}`
  }

  /**
   * Reset all usage statistics
   */
  resetUsage() {
    this.usage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      apiCallsCount: 0,
      lastUpdated: Date.now()
    }
    this.saveUsage()
    console.log('📊 Token usage statistics reset')
  }

  /**
   * Test function to manually add token usage (for debugging)
   */
  addTestTokens() {
    const testUsage = {
      promptTokenCount: 100,
      candidatesTokenCount: 50, 
      totalTokenCount: 150
    }
    
    console.log('🧪 Testing token usage recording...')
    this.recordUsage(testUsage, 'test')
    console.log('🧪 Test complete. Check settings page for updated numbers.')
    
    return this.getUsage()
  }
}

// Create and export a singleton instance
const tokenUsageService = new TokenUsageService()
export default tokenUsageService 