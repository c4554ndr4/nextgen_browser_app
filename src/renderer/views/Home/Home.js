import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtLoader from '../../components/FtLoader/FtLoader.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'
import FtChannelBubble from '../../components/FtChannelBubble/FtChannelBubble.vue'

import { showToast } from '../../helpers/utils'
import { getLocalChannelVideos } from '../../helpers/api/local'

export default defineComponent({
  name: 'Home',
  components: {
    'ft-card': FtCard,
    'ft-button': FtButton,
    'ft-loader': FtLoader,
    'ft-element-list': FtElementList,
    'ft-channel-bubble': FtChannelBubble
  },
  data: function () {
    return {
      isLoading: false,
      featuredChannels: [],
      errorMessage: ''
    }
  },
  mounted: function () {
    // Automatically load featured channels on component mount
    this.loadFeaturedChannels()
  },
  methods: {
    loadFeaturedChannels: async function () {
      this.isLoading = true
      this.errorMessage = ''
      
      try {
        // Define a list of featured channels (you can customize this list)
        const featuredChannelIds = [
          'UCY1kMZp36IQSyNx_9h4mpCg', // Mark Rober - Educational Science & Engineering
          'UCLx053rWZxCiYWsBETgdKrQ', // LinusTechTips
          'UC6nSFpj9HTCZ5t-N3Rm3-HA', // Vsauce
          'UCJkMlOu7faDgqh4PfzbpLdg', // Kurzgesagt
          'UCbu2SsF-Or3Rsn3NxqODImw', // GameTheory
          'UC0YLf8VGcy3QA3RjkA4tGvw', // Primitive Technology
          'UCNIuvl7V8zACPpTmmNIqP2A', // Outdoor Boys
        ]
        
        this.featuredChannels = featuredChannelIds.map(id => ({
          id,
          name: '',
          thumbnail: '',
          videos: [],
          isLoadingVideos: false,
          videosLoaded: false
        }))
        
        // Load channel info and videos for each featured channel
        await Promise.all(this.featuredChannels.map(async (channel) => {
          await this.loadChannelData(channel)
        }))
        
      } catch (error) {
        console.error('Error loading featured channels:', error)
        this.errorMessage = this.$t('Home.Failed to load featured channels')
        showToast(this.$t('Home.Failed to load featured channels'))
      }
      
      this.isLoading = false
    },

    loadChannelData: async function (channel) {
      channel.isLoadingVideos = true
      
      try {
        // Use only the local API - getLocalChannelVideos returns { name, thumbnailUrl, videos }
        const channelData = await getLocalChannelVideos(channel.id)
        
        if (channelData) {
          channel.name = channelData.name || 'Unknown Channel'
          channel.thumbnail = channelData.thumbnailUrl || ''
          // Limit to first 6 videos for homepage display
          channel.videos = (channelData.videos || []).slice(0, 6)
        } else {
          // Channel doesn't exist or couldn't be loaded
          channel.name = 'Channel Unavailable'
          channel.videos = []
        }
        
      } catch (error) {
        console.error(`Error loading data for channel ${channel.id}:`, error)
        channel.name = 'Channel Unavailable'
        channel.videos = []
      }
      
      channel.isLoadingVideos = false
      channel.videosLoaded = true
    },

    ...mapActions([
      'showToast'
    ])
  }
}) 