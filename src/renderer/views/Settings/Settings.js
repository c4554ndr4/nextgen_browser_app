import { defineComponent, nextTick } from 'vue'
import { mapActions } from 'vuex'
import ThemeSettings from '../../components/ThemeSettings.vue'
import PrivacySettings from '../../components/privacy-settings/privacy-settings.vue'
import DataSettings from '../../components/DataSettings.vue'
import ParentalControlSettings from '../../components/ParentalControlSettings.vue'
import ExperimentalSettings from '../../components/ExperimentalSettings/ExperimentalSettings.vue'
import PasswordSettings from '../../components/PasswordSettings/PasswordSettings.vue'
import PasswordDialog from '../../components/PasswordDialog/PasswordDialog.vue'
import TokenUsageSettings from '../../components/TokenUsageSettings/TokenUsageSettings.vue'
import FtToggleSwitch from '../../components/ft-toggle-switch/ft-toggle-switch.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtSettingsMenu from '../../components/FtSettingsMenu/FtSettingsMenu.vue'

const ACTIVE_CLASS_NAME = 'active'
const SETTINGS_MOBILE_WIDTH_THRESHOLD = 1015

export default defineComponent({
  name: 'Settings',
  components: {
    'theme-settings': ThemeSettings,
    'privacy-settings': PrivacySettings,
    'data-settings': DataSettings,
    'parental-control-settings': ParentalControlSettings,
    'password-settings': PasswordSettings,
    'password-dialog': PasswordDialog,
    'token-usage-settings': TokenUsageSettings,
    'ft-button': FtButton,
    'ft-toggle-switch': FtToggleSwitch,
    'ft-settings-menu': FtSettingsMenu,
    ...(process.env.IS_ELECTRON
      ? {
          'experimental-settings': ExperimentalSettings
        }
      : {})
  },
  data: function () {
    return {
      usingElectron: process.env.IS_ELECTRON,
      isInDesktopView: true,
      settingsSectionTypeOpenInMobile: null,
      unlocked: false
    }
  },
  computed: {
    locale: function() {
      return this.$i18n.locale
    },

    settingsPassword: function () {
      return this.$store.getters.getSettingsPassword
    },

    settingsSectionSortEnabled: function () {
      return this.$store.getters.getSettingsSectionSortEnabled
    },

    settingsComponentsData: function () {
      const settingsComponentsData = [
        {
          type: 'parental-control-settings',
          title: this.$t('Settings.Parental Control Settings.Parental Control Settings'),
          icon: 'user-lock'
        },
        {
          type: 'password-settings',
          title: this.$t('Settings.Password Settings.Password Settings'),
          icon: 'key'
        },
        {
          type: 'token-usage-settings',
          title: this.$t('Settings.Token Usage.Token Usage'),
          icon: 'chart-bar'
        },
        {
          type: 'theme-settings',
          title: this.$t('Settings.Theme Settings.Theme Settings'),
          icon: 'display'
        },
        {
          type: 'privacy-settings',
          title: this.$t('Settings.Privacy Settings.Privacy Settings'),
          icon: 'lock'
        },
        {
          type: 'data-settings',
          title: this.$t('Settings.Data Settings.Data Settings'),
          icon: 'database'
        },
        ...(process.env.IS_ELECTRON
          ? [{
              type: 'experimental-settings',
              title: this.$t('Settings.Experimental Settings.Experimental Settings'),
              icon: 'flask'
            }]
          : []),
      ]
      return settingsComponentsData
    },

    settingsSectionComponents: function () {
      let settingsSections = this.settingsComponentsData
      if (this.settingsSectionSortEnabled) {
        settingsSections = settingsSections.toSorted((a, b) => {
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), this.locale)
        })
      }

      // Don't show general settings to users
      return settingsSections
    },
  },
  created: function () {
    if (this.settingsPassword === '') {
      this.unlocked = true
    }
  },
  mounted: function () {
    if (this.unlocked) {
      this.handleMounted()
    }
  },
  beforeDestroy: function () {
    document.removeEventListener('scroll', this.markScrolledToSectionAsActive)
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleMounted: function () {
      try {
        this.handleResize()
        window.addEventListener('resize', this.handleResize)
        document.addEventListener('scroll', this.markScrolledToSectionAsActive)

        // mark first section as active before any scrolling has taken place
        if (this.settingsSectionComponents.length > 0) {
          const firstSection = document.getElementById(this.settingsSectionComponents[0].type)
          if (firstSection) {
            firstSection.classList.add(ACTIVE_CLASS_NAME)
          }
        }
      } catch (error) {
        // Silently handle mount errors to prevent user-facing errors
        console.warn('Settings mount error (hidden from user):', error.message)
      }
    },

    handleUnlock: function () {
      this.unlocked = true

      nextTick(() => {
        this.handleMounted()
      })
    },

    navigateToSection: function(sectionType) {
      if (this.isInDesktopView) {
        nextTick(() => {
          try {
            // Check if the ref exists in the Vue instance
            if (this.$refs && this.$refs[sectionType]) {
              const sectionRef = this.$refs[sectionType]
              if (sectionRef && sectionRef[0] && sectionRef[0].$el) {
                const sectionElement = sectionRef[0].$el
                sectionElement.scrollIntoView()

                const sectionHeading = sectionElement.firstChild?.firstChild
                if (sectionHeading) {
                  sectionHeading.tabIndex = 0
                  sectionHeading.focus()
                  sectionHeading.tabIndex = -1
                }
              }
            }
          } catch (error) {
            // Silently handle navigation errors to prevent "target is missing" from showing to users
            console.warn('Navigation error (hidden from user):', error.message)
          }
        })
      } else {
        this.settingsSectionTypeOpenInMobile = sectionType
      }
    },

    returnToSettingsMenu: function () {
      const openSection = this.settingsSectionTypeOpenInMobile
      this.settingsSectionTypeOpenInMobile = null

      // focus the corresponding Settings Menu title
      nextTick(() => document.getElementById(openSection)?.focus())
    },

    /* Set the current section to be shown as active in the Settings Menu
    * if it is the lowest section within the top quarter of the viewport (25vh) */
    markScrolledToSectionAsActive: function() {
      try {
        // Add safety check for window and component state
        if (!this.$refs || !this.settingsSectionComponents) {
          return
        }

        const scrollY = window.scrollY + innerHeight / 4
        this.settingsSectionComponents.forEach((section) => {
          try {
            // Check if the ref exists in the Vue instance before accessing it
            if (this.$refs[section.type]) {
              const sectionRef = this.$refs[section.type]
              if (sectionRef && sectionRef[0] && sectionRef[0].$el) {
                const sectionElement = sectionRef[0].$el
                const sectionHeight = sectionElement.offsetHeight
                const sectionTop = sectionElement.offsetTop
                const correspondingMenuLink = document.getElementById(section.type)

                if (correspondingMenuLink) {
                  if (this.isInDesktopView && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    correspondingMenuLink.classList.add(ACTIVE_CLASS_NAME)
                  } else {
                    correspondingMenuLink.classList.remove(ACTIVE_CLASS_NAME)
                  }
                }
              }
            }
          } catch (sectionError) {
            // Silently handle individual section errors
            console.warn(`Section error for ${section.type} (hidden from user):`, sectionError.message)
          }
        })
      } catch (error) {
        // Silently handle overall scroll tracking errors
        console.warn('Scroll tracking error (hidden from user):', error.message)
      }
    },

    handleResize: function () {
      const wasNotInDesktopView = !this.isInDesktopView
      this.isInDesktopView = window.innerWidth > SETTINGS_MOBILE_WIDTH_THRESHOLD

      // navigate to section that was open in mobile or desktop view, if any
      if (this.isInDesktopView && wasNotInDesktopView && this.settingsSectionTypeOpenInMobile != null) {
        this.navigateToSection(this.settingsSectionTypeOpenInMobile)
        this.settingsSectionTypeOpenInMobile = null
      } else if (!this.isInDesktopView && !wasNotInDesktopView) {
        const activeMenuLink = document.querySelector(`.settingsMenu .title.${ACTIVE_CLASS_NAME}`)
        if (!activeMenuLink) {
          return
        }

        const sectionType = activeMenuLink.id
        this.navigateToSection(sectionType)
      }
    },

    ...mapActions([
      'showKeyboardShortcutPrompt',
      'updateSettingsSectionSortEnabled'
    ])
  }
})

