import { defineComponent } from 'vue'
import { mapActions, mapMutations } from 'vuex'
import FtFlexBox from './components/ft-flex-box/ft-flex-box.vue'
import TopNav from './components/TopNav/TopNav.vue'
import SideNav from './components/SideNav/SideNav.vue'
import FtNotificationBanner from './components/FtNotificationBanner/FtNotificationBanner.vue'
import FtUpdateNotification from './components/FtUpdateNotification/FtUpdateNotification.vue'
import FtPrompt from './components/FtPrompt/FtPrompt.vue'
import FtButton from './components/FtButton/FtButton.vue'
import FtToast from './components/ft-toast/ft-toast.vue'
import FtProgressBar from './components/FtProgressBar/FtProgressBar.vue'
import FtPlaylistAddVideoPrompt from './components/ft-playlist-add-video-prompt/ft-playlist-add-video-prompt.vue'
import FtCreatePlaylistPrompt from './components/ft-create-playlist-prompt/ft-create-playlist-prompt.vue'
import FtKeyboardShortcutPrompt from './components/FtKeyboardShortcutPrompt/FtKeyboardShortcutPrompt.vue'
import FtSearchFilters from './components/FtSearchFilters/FtSearchFilters.vue'
import { marked } from 'marked'
import { IpcChannels } from '../constants'
import packageDetails from '../../package.json'
import { openExternalLink, openInternalPath, showToast } from './helpers/utils'
import { translateWindowTitle } from './helpers/strings'

let ipcRenderer = null

export default defineComponent({
  name: 'App',
  components: {
    FtFlexBox,
    TopNav,
    SideNav,
    FtNotificationBanner,
    FtUpdateNotification,
    FtPrompt,
    FtButton,
    FtToast,
    FtProgressBar,
    FtPlaylistAddVideoPrompt,
    FtCreatePlaylistPrompt,
    FtSearchFilters,
    FtKeyboardShortcutPrompt,
  },
  data: function () {
    return {
      dataReady: false,
      showBlogBanner: false,
      blogBannerMessage: '',
      latestBlogUrl: '',
      isPromptOpen: false,
      lastExternalLinkToBeOpened: '',
      showExternalLinkOpeningPrompt: false,
      externalLinkOpeningPromptValues: [
        'yes',
        'no'
      ],
      // Update notification state
      showUpdateNotification: false,
      updateVersion: '',
      updateIsDownloading: false,
      updateDownloadPercent: 0,
      updateIsReady: false
    }
  },
  computed: {
    showProgressBar: function () {
      return this.$store.getters.getShowProgressBar
    },
    outlinesHidden: function () {
      return this.$store.getters.getOutlinesHidden
    },
    isLocaleRightToLeft: function () {
      return this.locale === 'ar' || this.locale === 'fa' || this.locale === 'he' ||
        this.locale === 'ur' || this.locale === 'yi' || this.locale === 'ku'
    },
    checkForUpdates: function () {
      return this.$store.getters.getCheckForUpdates
    },
    checkForBlogPosts: function () {
      return this.$store.getters.getCheckForBlogPosts
    },
    isKeyboardShortcutPromptShown: function () {
      return this.$store.getters.getIsKeyboardShortcutPromptShown
    },
    showAddToPlaylistPrompt: function () {
      return this.$store.getters.getShowAddToPlaylistPrompt
    },
    showCreatePlaylistPrompt: function () {
      return this.$store.getters.getShowCreatePlaylistPrompt
    },
    showSearchFilters: function () {
      return this.$store.getters.getShowSearchFilters
    },
    windowTitle: function () {
      const routePath = this.$route.path
      if (!routePath.startsWith('/channel/') && !routePath.startsWith('/watch/') && !routePath.startsWith('/hashtag/') && !routePath.startsWith('/playlist/') && !routePath.startsWith('/search/')) {
        let title = translateWindowTitle(this.$route.meta.title)
        if (!title) {
          title = packageDetails.productName
        } else {
          title = `${title} - ${packageDetails.productName}`
        }
        return title
      } else {
        return null
      }
    },
    externalPlayer: function () {
      return this.$store.getters.getExternalPlayer
    },

    defaultInvidiousInstance: function () {
      return this.$store.getters.getDefaultInvidiousInstance
    },

    baseTheme: function () {
      return this.$store.getters.getBaseTheme
    },

    isSideNavOpen: function () {
      return this.$store.getters.getIsSideNavOpen
    },

    hideLabelsSideBar: function () {
      return this.$store.getters.getHideLabelsSideBar
    },

    mainColor: function () {
      return this.$store.getters.getMainColor
    },

    secColor: function () {
      return this.$store.getters.getSecColor
    },

    locale: function() {
      return this.$i18n.locale
    },

    systemTheme: function () {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    },

    landingPage: function() {
      return '/' + this.$store.getters.getLandingPage
    },

    externalLinkOpeningPromptNames: function () {
      return [
        this.$t('Yes, Open Link'),
        this.$t('No')
      ]
    },

    externalLinkHandling: function () {
      return this.$store.getters.getExternalLinkHandling
    },

    appTitle: function () {
      return this.$store.getters.getAppTitle
    },

    openDeepLinksInNewWindow: function () {
      return this.$store.getters.getOpenDeepLinksInNewWindow
    }
  },
  watch: {
    windowTitle: 'setWindowTitle',

    baseTheme: 'checkThemeSettings',

    mainColor: 'checkThemeSettings',

    secColor: 'checkThemeSettings',

    locale: 'setLocale',

    appTitle: 'setDocumentTitle'
  },
  created () {
    this.checkThemeSettings()
    this.setLocale()
  },
  mounted: function () {
    // PERFORMANCE FIX: Make startup non-blocking
    // Set dataReady to true immediately so UI renders fast
    this.dataReady = true
    
    // Load critical settings first, but non-blocking
    this.loadCriticalSettingsAsync()
    
    // Load everything else in the background without blocking UI
    this.loadAppDataInBackground()
  },
  methods: {
    setDocumentTitle: function(value) {
      document.title = value
    },
    checkThemeSettings: function () {
      const theme = {
        baseTheme: this.baseTheme || 'dark',
        mainColor: this.mainColor || 'mainRed',
        secColor: this.secColor || 'secBlue'
      }

      this.updateTheme(theme)
    },

    updateTheme: function (theme) {
      document.body.className = `${theme.baseTheme} main${theme.mainColor} sec${theme.secColor}`
      document.body.dataset.systemTheme = this.systemTheme
    },

    setupUpdateListeners: function () {
      if (process.env.IS_ELECTRON) {
        const { ipcRenderer } = require('electron')
        
        // Listen for update notifications from main process
        ipcRenderer.on('show-update-notification', (_, { version }) => {
          this.updateVersion = version
          this.showUpdateNotification = true
          this.updateIsDownloading = true
          this.updateDownloadPercent = 0
        })
        
        ipcRenderer.on('update-download-progress', (_, { percent }) => {
          this.updateDownloadPercent = parseInt(percent)
        })
        
        ipcRenderer.on('update-ready-to-install', (_, { version }) => {
          this.updateVersion = version
          this.updateIsDownloading = false
          this.updateIsReady = true
        })
        
        ipcRenderer.on('update-error', (_, { error }) => {
          console.error('Update error:', error)
          this.showUpdateNotification = false
          this.updateIsDownloading = false
          this.updateIsReady = false
        })
        
        // Listen for manual update check status
        ipcRenderer.on('update-check-status', (_, { status, message }) => {
          console.log('Update check status:', status, message)
          // You can add UI feedback here if needed (e.g., toast notifications)
          if (process.env.NODE_ENV === 'development') {
            console.log('Update status:', status, '-', message)
          }
        })
        
        // Development: Add global function to trigger mock update
        if (process.env.NODE_ENV === 'development') {
          window.triggerMockUpdate = (version = '0.25.0') => {
            console.log('Triggering mock update with version:', version)
            ipcRenderer.invoke('enable-mock-update', version)
          }
          
          window.checkForUpdatesManually = () => {
            console.log('Manually checking for updates...')
            ipcRenderer.invoke('check-for-updates-manually')
          }
          
          console.log('Development mode: Use window.triggerMockUpdate() or window.checkForUpdatesManually()')
        }
      }
    },

    checkForNewBlogPosts: function () {
      // Disable blog posts for private company app
      // fetch('https://write.as/freetube/feed/')
    },

    checkExternalPlayer: async function () {
      this.getExternalPlayerCmdArgumentsData()
    },

    handleUpdateClick: function () {
      // Update button clicked - download already started automatically
      if (process.env.NODE_ENV === 'development') {
        console.log('Update download starting...')
      }
      
      // In development mode with mock updates, trigger the download simulation
      if (process.env.IS_ELECTRON && process.env.NODE_ENV === 'development') {
        const { ipcRenderer } = require('electron')
        ipcRenderer.invoke('simulate-mock-update-download')
      }
    },

    handleInstallClick: function () {
      if (process.env.IS_ELECTRON) {
        const { ipcRenderer } = require('electron')
        ipcRenderer.invoke('install-update-now')
      }
    },

    handleUpdateCloseClick: function () {
      this.showUpdateNotification = false
      this.updateIsDownloading = false
      this.updateIsReady = false
    },

    handleNewBlogBannerClick: function (response) {
      if (response) {
        openExternalLink(this.latestBlogUrl)
      }

      this.showBlogBanner = false
    },

    handlePromptPortalUpdate: function(newVal) {
      this.isPromptOpen = newVal
    },

    activateKeyboardShortcuts: function () {
      document.addEventListener('keydown', this.handleKeyboardShortcuts)
      document.addEventListener('mousedown', () => {
        this.hideOutlines()
      })
    },

    handleKeyboardShortcuts: function (event) {
      // ignore user typing in HTML `input` elements
      if (event.shiftKey && event.key === '?' && event.target.tagName !== 'INPUT') {
        this.$store.commit('setIsKeyboardShortcutPromptShown', !this.isKeyboardShortcutPromptShown)
      }

      if (event.key === 'Tab') {
        this.showOutlines()
      }
    },

    openAllLinksExternally: function () {
      const isExternalLink = (event) => event.target.tagName === 'A' && !event.target.href.startsWith(window.location.origin)

      document.addEventListener('click', (event) => {
        if (isExternalLink(event)) {
          this.handleLinkClick(event)
        }
      })

      document.addEventListener('auxclick', (event) => {
        // auxclick fires for all clicks not performed with the primary button
        // only handle the link click if it was the middle button,
        // otherwise the context menu breaks
        if (isExternalLink(event) && event.button === 1) {
          this.handleLinkClick(event)
        }
      })
    },

    handleLinkClick: function (event) {
      const el = event.target
      event.preventDefault()

      // Check if it's a YouTube link
      const youtubeUrlPattern = /^https?:\/\/((www\.)?youtube\.com(\/embed)?|youtu\.be)\/.*$/
      const isYoutubeLink = youtubeUrlPattern.test(el.href)

      if (isYoutubeLink) {
        // `auxclick` is the event type for non-left click
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/auxclick_event
        this.handleYoutubeLink(el.href, {
          doCreateNewWindow: event.type === 'auxclick'
        })
      } else if (this.externalLinkHandling === 'doNothing') {
        // Let user know opening external link is disabled via setting
        showToast(this.$t('External link opening has been disabled in the general settings'))
      } else if (this.externalLinkHandling === 'openLinkAfterPrompt') {
        // Storing the URL is necessary as
        // there is no other way to pass the URL to click callback
        this.lastExternalLinkToBeOpened = el.href
        this.showExternalLinkOpeningPrompt = true
      } else {
        // Open links externally
        openExternalLink(el.href)
      }
    },

    handleYoutubeLink: function (href, { doCreateNewWindow = false } = { }) {
      this.getYoutubeUrlInfo(href).then((result) => {
        switch (result.urlType) {
          case 'video': {
            const { videoId, timestamp, playlistId } = result

            const query = {}
            if (timestamp) {
              query.timestamp = timestamp
            }
            if (playlistId && playlistId.length > 0) {
              query.playlistId = playlistId
            }

            openInternalPath({
              path: `/watch/${videoId}`,
              query,
              doCreateNewWindow
            })
            break
          }

          case 'playlist': {
            const { playlistId, query } = result

            openInternalPath({
              path: `/playlist/${playlistId}`,
              query,
              doCreateNewWindow
            })
            break
          }

          case 'search': {
            const { searchQuery, query } = result

            openInternalPath({
              path: `/search/${encodeURIComponent(searchQuery)}`,
              query,
              doCreateNewWindow,
              searchQueryText: searchQuery
            })
            break
          }

          case 'hashtag': {
            const { hashtag } = result
            openInternalPath({
              path: `/hashtag/${encodeURIComponent(hashtag)}`,
              doCreateNewWindow
            })
            break
          }

          case 'post': {
            const { postId, query } = result

            openInternalPath({
              path: `/post/${postId}`,
              query,
              doCreateNewWindow
            })
            break
          }

          case 'channel': {
            const { channelId, subPath, url } = result

            openInternalPath({
              path: `/channel/${channelId}/${subPath}`,
              doCreateNewWindow,
              query: {
                url
              }
            })
            break
          }

          case 'invalid_url': {
            // Do nothing
            break
          }

          default: {
            // Unknown URL type
            showToast(this.$t('Unknown YouTube url type, cannot be opened in app'))
          }
        }
      })
    },

    /**
     * Linux fix for dynamically updating theme preference, this works on
     * all systems running the electron app.
     */
    watchSystemTheme: function () {
      ipcRenderer.on(IpcChannels.NATIVE_THEME_UPDATE, (event, shouldUseDarkColors) => {
        document.body.dataset.systemTheme = shouldUseDarkColors ? 'dark' : 'light'
      })
    },

    enableOpenUrl: function () {
      ipcRenderer.on(IpcChannels.OPEN_URL, (event, url, { isLaunchLink = false } = { }) => {
        if (url) {
          this.handleYoutubeLink(url, { doCreateNewWindow: this.openDeepLinksInNewWindow && !isLaunchLink })
        }
      })

      ipcRenderer.send(IpcChannels.APP_READY)
    },

    handleExternalLinkOpeningPromptAnswer: function (option) {
      this.showExternalLinkOpeningPrompt = false

      if (option === 'yes' && this.lastExternalLinkToBeOpened.length > 0) {
        // Maybe user should be notified
        // if `lastExternalLinkToBeOpened` is empty

        // Open links externally
        openExternalLink(this.lastExternalLinkToBeOpened)
      }
    },

    setWindowTitle: function() {
      if (this.windowTitle !== null) {
        this.setAppTitle(this.windowTitle)
      }
    },

    setLocale: function() {
      document.documentElement.lang = this.locale
      if (this.isLocaleRightToLeft) {
        document.body.dir = 'rtl'
      } else {
        document.body.dir = 'ltr'
      }
    },

    ...mapActions([
      'grabUserSettings',
      'grabAllProfiles',
      'grabHistory',
      'grabAllPlaylists',
      'grabAllSubscriptions',
      'grabSearchHistoryEntries',
      'getYoutubeUrlInfo',
      'getExternalPlayerCmdArgumentsData',
      'fetchInvidiousInstances',
      'fetchInvidiousInstancesFromFile',
      'setRandomCurrentInvidiousInstance',
      'setupListenersToSyncWindows',
      'hideKeyboardShortcutPrompt',
      'showKeyboardShortcutPrompt',
      'updateBaseTheme',
      'updateMainColor',
      'updateSecColor',
      'showOutlines',
      'hideOutlines',
    ]),

    ...mapMutations([
      'setAppTitle'
    ]),

    // PERFORMANCE FIX: Load only critical settings for immediate UI render
    async loadCriticalSettingsAsync() {
      try {
        // Only load theme settings immediately for proper UI rendering
        await this.grabUserSettings()
        this.checkThemeSettings()
        
        // Set window title immediately  
        this.setWindowTitle()
      } catch (error) {
        console.error('Error loading critical settings:', error)
      }
    },

    // PERFORMANCE FIX: Load all other data in background without blocking UI
    async loadAppDataInBackground() {
      try {
        // Use requestIdleCallback to run during browser idle time
        const loadWithIdleCallback = (fn) => {
          return new Promise(resolve => {
            if (window.requestIdleCallback) {
              window.requestIdleCallback(() => {
                fn().then(resolve).catch(resolve) // Don't fail the whole chain
              })
            } else {
              // Fallback for environments without requestIdleCallback
              setTimeout(() => {
                fn().then(resolve).catch(resolve)
              }, 50)
            }
          })
        }

        // Load Invidious instances first (needed for video playback)
        await loadWithIdleCallback(async () => {
          await this.fetchInvidiousInstancesFromFile()
          if (this.defaultInvidiousInstance === '') {
            await this.setRandomCurrentInvidiousInstance()
          }
          
          this.fetchInvidiousInstances().then(() => {
            if (this.defaultInvidiousInstance === '') {
              this.setRandomCurrentInvidiousInstance()
            }
          }).catch(console.error)
        })

        // Load profiles and user data
        await loadWithIdleCallback(async () => {
          await this.grabAllProfiles(this.$t('Profile.All Channels'))
        })

        // Load history and playlists in parallel
        await loadWithIdleCallback(async () => {
          // Run these in parallel to reduce load time
          await Promise.allSettled([
            this.grabHistory(),
            this.grabAllPlaylists(),
            this.grabAllSubscriptions(),
            this.grabSearchHistoryEntries()
          ])
        })

        // Setup Electron-specific features last
        if (process.env.IS_ELECTRON) {
          await loadWithIdleCallback(async () => {
            const { ipcRenderer } = require('electron')
            this.setupListenersToSyncWindows()
            this.activateKeyboardShortcuts()
            this.openAllLinksExternally()
            this.enableOpenUrl()
            this.watchSystemTheme()
            await this.checkExternalPlayer()
          })
        }

        // Setup update listeners and blog checks after everything else
        setTimeout(() => {
          this.setupUpdateListeners()
          this.checkForNewBlogPosts()
        }, 1000) // Increased delay to let app settle

        // Handle initial route after data is loaded
        this.$router.onReady(() => {
          if (this.$router.currentRoute.path === '/') {
            this.$router.replace({ path: this.landingPage })
          }
        })

      } catch (error) {
        console.error('Error loading app data in background:', error)
      }
    },
  }
})
