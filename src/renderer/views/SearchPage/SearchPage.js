import { defineComponent } from 'vue'
import { mapMutations } from 'vuex'
import FtLoader from '../../components/FtLoader/FtLoader.vue'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'
import FtAutoLoadNextPageWrapper from '../../components/ft-auto-load-next-page-wrapper/ft-auto-load-next-page-wrapper.vue'
import {
  copyToClipboard,
  searchFiltersMatch,
  showToast,
} from '../../helpers/utils'
import { getLocalSearchContinuation, getLocalSearchResults } from '../../helpers/api/local'
import { getInvidiousSearchResults } from '../../helpers/api/invidious'
import { filterVideosWithBackend } from '../../services/backend-filter-service'
import { filterVideosWithGemini } from '../../services/gemini-service'
import packageDetails from '../../../../package.json'
import { SEARCH_CHAR_LIMIT } from '../../../constants'

export default defineComponent({
  name: 'SearchPage',
  components: {
    'ft-loader': FtLoader,
    'ft-card': FtCard,
    'ft-element-list': FtElementList,
    'ft-auto-load-next-page-wrapper': FtAutoLoadNextPageWrapper,
  },
  data: function () {
    return {
      isLoading: false,
      geminiFilterInProgress: false,
      apiUsed: 'local',
      amountOfResults: 0,
      query: '',
      searchPage: 1,
      nextPageRef: null,
      searchSettings: {},
      shownResults: [],
      // Timer for Gemini analysis progress
      analysisStartTime: null,
      analysisTimer: null,
      estimatedAnalysisTime: 8000, // 8 seconds estimated time
      timeRemaining: 8000,
      progressPercentage: 0,
      // Flag to prevent duplicate analysis
      analysisCompleted: false
    }
  },
  computed: {
    sessionSearchHistory: function () {
      return this.$store.getters.getSessionSearchHistory
    },

    backendPreference: function () {
      return this.$store.getters.getBackendPreference
    },

    backendFallback: function () {
      return this.$store.getters.getBackendFallback
    },

    showFamilyFriendlyOnly: function() {
      return this.$store.getters.getShowFamilyFriendlyOnly
    },

    useBackendFiltering: function() {
      return this.$store.getters.getUseBackendFiltering
    },

    rememberSearchHistory: function () {
      return this.$store.getters.getRememberSearchHistory
    },

    processedQuery: function () {
      return this.query.trim()
    },
  },
  watch: {
    $route () {
      const query = this.$route.params.query.trim()
      let features = this.$route.query.features
      // if page gets refreshed and there's only one feature then it will be a string
      if (typeof features === 'string') {
        features = [features]
      }
      const searchSettings = {
        sortBy: this.$route.query.sortBy,
        time: this.$route.query.time,
        type: this.$route.query.type,
        duration: this.$route.query.duration,
        features: features ?? [],
      }

      const payload = {
        query: query,
        options: {},
        searchSettings: searchSettings
      }

      this.query = query

      this.setAppTitle(`${this.processedQuery} - ${packageDetails.productName}`)
      this.checkSearchCache(payload)
    }
  },
  mounted: function () {
    this.query = this.$route.params.query
    this.setAppTitle(`${this.processedQuery} - ${packageDetails.productName}`)

    let features = this.$route.query.features
    // if page gets refreshed and there's only one feature then it will be a string
    if (typeof features === 'string') {
      features = [features]
    }

    this.searchSettings = {
      sortBy: this.$route.query.sortBy,
      time: this.$route.query.time,
      type: this.$route.query.type,
      duration: this.$route.query.duration,
      features: features ?? [],
    }

    const payload = {
      query: this.processedQuery,
      options: {},
      searchSettings: this.searchSettings
    }

    this.checkSearchCache(payload)
  },
  methods: {
    updateSearchHistoryEntry: function () {
      const persistentSearchHistoryPayload = {
        _id: this.processedQuery,
        lastUpdatedAt: Date.now()
      }

      this.$store.dispatch('updateSearchHistoryEntry', persistentSearchHistoryPayload)
    },

    checkSearchCache: function (payload) {
      if (payload.query.length > SEARCH_CHAR_LIMIT) {
        console.warn(`Search character limit is: ${SEARCH_CHAR_LIMIT}`)
        showToast(this.$t('Search character limit', { searchCharacterLimit: SEARCH_CHAR_LIMIT }))
        return
      }

      // Reset analysis flag for new search
      this.analysisCompleted = false

      const sameSearch = this.sessionSearchHistory.filter((search) => {
        return search.query === payload.query && searchFiltersMatch(payload.searchSettings, search.searchSettings)
      })

      if (sameSearch.length > 0) {
        // No loading effect needed here, only rendered result update
        this.replaceShownResults(sameSearch[0])
      } else {
        // Show loading effect coz there will be network request(s)
        this.isLoading = true
        this.searchSettings = payload.searchSettings

        switch (this.backendPreference) {
          case 'local':
            this.performSearchLocal(payload)
            break
          case 'invidious':
            this.performSearchInvidious(payload, { resetSearchPage: true })
            break
        }
      }

      if (this.rememberSearchHistory) {
        this.updateSearchHistoryEntry()
      }
    },

    formatTimeRemaining: function(milliseconds) {
      const seconds = Math.ceil(milliseconds / 1000)
      if (seconds <= 0) return '0s'
      return `${seconds}s`
    },

    startAnalysisTimer: function() {
      this.analysisStartTime = Date.now()
      this.timeRemaining = this.estimatedAnalysisTime
      this.progressPercentage = 0
      
      // Update timer every 100ms for smooth progress
      this.analysisTimer = setInterval(() => {
        // Safety check: stop if component is being destroyed
        if (!this.$el) {
          this.stopAnalysisTimer()
          return
        }

        const elapsed = Date.now() - this.analysisStartTime
        const remaining = Math.max(0, this.estimatedAnalysisTime - elapsed)
        const progress = Math.min(100, (elapsed / this.estimatedAnalysisTime) * 100)
        
        this.timeRemaining = remaining
        this.progressPercentage = progress
        
        // If we've exceeded the estimated time, slow down the progress
        if (progress >= 100) {
          this.progressPercentage = 95 // Keep at 95% until actual completion
          this.timeRemaining = 1000 // Show "1s" remaining
        }
      }, 100)
    },

    stopAnalysisTimer: function() {
      if (this.analysisTimer) {
        clearInterval(this.analysisTimer)
        this.analysisTimer = null
      }
      // Complete the progress bar
      this.progressPercentage = 100
      this.timeRemaining = 0
    },

    performSearchLocal: async function (payload) {
      this.isLoading = true
      this.analysisCompleted = false // Reset analysis flag for new search

      try {
        const { results, continuationData } = await getLocalSearchResults(payload.query, payload.searchSettings, this.showFamilyFriendlyOnly)

        this.apiUsed = 'local'
        this.nextPageRef = continuationData
        
        // Show analysis progress immediately
        this.isLoading = false
        this.geminiFilterInProgress = true
        
        // Start the analysis timer
        this.startAnalysisTimer()
        
        // Apply Gemini filtering with the raw results
        await this.applyGeminiFiltering(results)

      } catch (err) {
        console.error(err)
        const errorMessage = this.$t('Local API Error (Click to copy)')
        showToast(`${errorMessage}: ${err}`, 10000, () => {
          copyToClipboard(err)
        })
        if (this.backendPreference === 'local' && this.backendFallback) {
          showToast(this.$t('Falling back to Invidious API'))
          this.performSearchInvidious(payload)
        } else {
          this.isLoading = false
          this.geminiFilterInProgress = false
        }
      }
    },

    applyGeminiFiltering: async function(results) {
      // Prevent duplicate analysis
      if (this.analysisCompleted) {
        console.log('⚠️ Analysis already completed, skipping duplicate run')
        return
      }

      try {
        // Filter only video results, not channels or playlists
        const videoResults = results.filter(item => item.type === 'video')
        const nonVideoResults = results.filter(item => item.type !== 'video')
        
        // Only apply filtering if there are video results
        if (videoResults.length > 0) {
          console.log(`🔍 DEBUG: About to check backend filtering`)
          console.log(`🔍 DEBUG: this.useBackendFiltering = ${this.useBackendFiltering}`)
          console.log(`🔍 DEBUG: !this.useBackendFiltering = ${!this.useBackendFiltering}`)
          
          if (!this.useBackendFiltering) {
            // Backend filtering is DISABLED - call Gemini directly
            console.log('🔄 Backend filtering is DISABLED - calling Gemini directly')
            console.log(`📋 Filtering ${videoResults.length} video results with Gemini...`)
            
            // Call Gemini API directly
            const result = await filterVideosWithGemini(videoResults, null, 'search')
            
            // Check if the service is unavailable
            if (result.serviceUnavailable) {
              console.warn('🚫 Content filtering service unavailable - showing empty search results')
              this.shownResults = []
              showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
            } else if (result.filteredVideos.length === 0) {
              console.log('⚠️ All videos were blocked by filtering - showing empty state')
              this.shownResults = []
            } else {
              // Update results with filtered videos and original non-video content
              this.shownResults = [...result.filteredVideos, ...nonVideoResults]
            }
            
            console.log('✅ Gemini filtering completed successfully')
          } else {
            // Backend filtering is ENABLED - use backend service
            console.log('🚀 Backend filtering is ENABLED - starting analysis...')
            console.log(`📋 Filtering ${videoResults.length} video results...`)
            
            // Call backend API to filter videos
            const result = await filterVideosWithBackend(videoResults, 'search')
            
            // Check if the service is unavailable
            if (result.serviceUnavailable) {
              console.warn('🚫 Content filtering service unavailable - showing empty search results')
              this.shownResults = []
              showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
            } else if (result.filteredVideos.length === 0) {
              console.log('⚠️ All videos were blocked by filtering - showing empty state')
              this.shownResults = []
            } else {
              // Update results with filtered videos and original non-video content
              this.shownResults = [...result.filteredVideos, ...nonVideoResults]
            }
            
            console.log('✅ Backend filtering completed successfully')
          }
        } else {
          console.log('⚠️ No video results to filter')
          // No videos to filter, just show all results
          this.shownResults = results
        }
      } catch (error) {
        console.error('❌ Error applying filtering:', error)
        
        // Additional check for service unavailability in the catch block
        const errorMessage = error.message?.toLowerCase() || ''
        const errorString = error.toString?.()?.toLowerCase() || ''
        
        const serviceUnavailableIndicators = [
          'status: 503',
          'status:503',
          'overloaded',
          'unavailable',
          'quota exceeded',
          'rate limit',
          'service temporarily unavailable',
          'too many requests',
          'model is overloaded',
          'please try again later'
        ]
        
        const isServiceUnavailable = serviceUnavailableIndicators.some(indicator => 
          errorMessage.includes(indicator) || errorString.includes(indicator)
        )
        
        if (isServiceUnavailable) {
          console.warn('🚫 Content filtering service unavailable (caught in error) - showing empty search results')
          this.shownResults = []
          showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
        } else {
          // Unknown errors also withhold unchecked candidates.
          showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
          this.shownResults = []
        }
      }
      
      // Mark analysis as completed
      this.analysisCompleted = true
      
      // Now it's safe to show results (or empty state)
      this.isLoading = false
      
      // Stop the timer and complete the progress
      this.stopAnalysisTimer()
      
      // Small delay to show completion before hiding
      setTimeout(() => {
        this.geminiFilterInProgress = false
      }, 500)

      // Now handle history and subscription details with the filtered results
      const historyPayload = {
        query: this.query,
        data: this.shownResults,
        searchSettings: this.searchSettings,
        nextPageRef: this.nextPageRef,
        apiUsed: this.apiUsed
      }

      this.$store.commit('addToSessionSearchHistory', historyPayload)
      this.updateSubscriptionDetails(this.shownResults)
    },

    getNextpageLocal: async function (payload) {
      try {
        const { results, continuationData } = await getLocalSearchContinuation(payload.options.nextPageRef)

        if (results.length === 0) {
          return
        }

        this.apiUsed = 'local'
        
        // Show loading indicator for additional results
        this.geminiFilterInProgress = true
        
        // Start the analysis timer for pagination
        this.startAnalysisTimer()
        
        // Apply filtering to only the new results
        const videoResults = results.filter(item => item.type === 'video')
        const nonVideoResults = results.filter(item => item.type !== 'video')
        
        if (videoResults.length > 0) {
          if (!this.useBackendFiltering) {
            console.log(`Backend filtering is disabled, calling Gemini directly on ${videoResults.length} new video results from pagination...`)
            
            const result = await filterVideosWithGemini(videoResults, null, 'search')
            
            // Check if the service is unavailable
            if (result.serviceUnavailable) {
              console.warn('🚫 Content filtering service unavailable during pagination - stopping')
              showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
              return // Stop pagination when service is unavailable
            }
            
            const filteredVideoResults = result.filteredVideos
            
            // Log statistics about pagination filtering
            const removedVideos = videoResults.length - filteredVideoResults.length
            console.log(`Pagination Gemini filtering complete: ${filteredVideoResults.length} videos kept, ${removedVideos} blocked`)
            
            // Merge filtered new results with existing results
            this.shownResults = [...this.shownResults, ...filteredVideoResults, ...nonVideoResults]
          } else {
            console.log(`Applying backend filtering to ${videoResults.length} new video results from pagination...`)
            
            const result = await filterVideosWithBackend(videoResults, 'search')
            
            // Check if the service is unavailable
            if (result.serviceUnavailable) {
              console.warn('🚫 Content filtering service unavailable during pagination - stopping')
              showToast(this.$t('Video.Content Filtering Service Unavailable'), 8000)
              return // Stop pagination when service is unavailable
            }
            
            const filteredVideoResults = result.filteredVideos
            
            // Log statistics about pagination filtering
            const removedVideos = videoResults.length - filteredVideoResults.length
            console.log(`Pagination filtering complete: ${filteredVideoResults.length} videos kept, ${removedVideos} blocked`)
            
            // Merge filtered new results with existing results
            this.shownResults = [...this.shownResults, ...filteredVideoResults, ...nonVideoResults]
          }
        } else {
          // No videos to filter, just add all new results
          this.shownResults = [...this.shownResults, ...results]
        }
        
        this.nextPageRef = continuationData
        
        // Stop the timer and complete the progress
        this.stopAnalysisTimer()
        
        // Small delay to show completion before hiding
        setTimeout(() => {
          this.geminiFilterInProgress = false
        }, 500)

        const historyPayload = {
          query: payload.query,
          data: this.shownResults,
          searchSettings: this.searchSettings,
          nextPageRef: this.nextPageRef,
          apiUsed: this.apiUsed
        }

        this.$store.commit('addToSessionSearchHistory', historyPayload)

        this.updateSubscriptionDetails(results)
      } catch (err) {
        console.error(err)
        const errorMessage = this.$t('Local API Error (Click to copy)')
        showToast(`${errorMessage}: ${err}`, 10000, () => {
          copyToClipboard(err)
        })
        this.geminiFilterInProgress = false
      }
    },

    performSearchInvidious: function (payload, options = { resetSearchPage: false }) {
      // Invidious not supported - fallback to local
      console.log('Invidious not supported, falling back to local API')
      this.performSearchLocal(payload)
    },

    getNextPageInvidious: function (payload) {
      this.searchPage++

      this.performSearchInvidious(payload)
    },

    nextPage: function () {
      // Prevent next page loading while Gemini filtering is in progress
      if (this.geminiFilterInProgress) {
        return
      }
      
      // Also check if we have a nextPageRef to continue
      if (!this.nextPageRef) {
        return
      }
      
      const payload = {
        query: this.processedQuery,
        options: {
          nextPageRef: this.nextPageRef
        },
        searchSettings: this.searchSettings
      }

      if (this.apiUsed === 'local') {
        this.getNextpageLocal(payload)
      } else {
        this.getNextPageInvidious(payload)
      }
    },

    replaceShownResults: function (search) {
      console.log('replace shown results')
      this.shownResults = search.data
      this.nextPageRef = search.nextPageRef
      this.apiUsed = search.apiUsed
    },

    // only used by html
    updateSubscriptionDetails: function (results) {
      if (results.filter(item => {
        return item.type === 'channel'
      }).length === 0) {
        return
      }

      const channelList = []

      // for (let i = 0; i < results.length; i++) {
      results.forEach((result) => {
        if (result.type === 'channel') {
          channelList.push({
            id: result.authorId,
            name: result.author,
            thumbnail: result.authorThumbnails && result.authorThumbnails[0] ? result.authorThumbnails[0].url : ''
          })
        }
      })

      this.$store.dispatch('getSubscriptionDetails', channelList)
    },

    // eslint-disable-next-line no-unused-vars
    ...mapMutations([
      'setAppTitle'
    ])
  },

  beforeUnmount: function () {
    // Clean up timer if component is destroyed
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer)
      this.analysisTimer = null
    }
  },
})
