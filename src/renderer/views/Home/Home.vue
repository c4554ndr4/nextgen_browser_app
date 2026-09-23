<template>
  <div class="home">
    <FtCard class="card">
      <div class="homeHeader">
        <h1 class="homeTitle">
          <FontAwesomeIcon
            :icon="['fas', 'home']"
            class="homeIcon"
            fixed-width
          />
          {{ $t("Home.Welcome") }}
        </h1>
        <p class="homeSubtitle">{{ $t("Home.Discover great content from featured channels") }}</p>
      </div>
      
      <FtButton
        v-if="!isLoading && featuredChannels.length === 0"
        class="refreshButton"
        @click="loadFeaturedChannels"
      >
        {{ $t("Home.Load Featured Channels") }}
      </FtButton>
      
      <FtLoader
        v-if="isLoading"
      />
      
      <div v-if="!isLoading && featuredChannels.length > 0" class="channelSections">
        <!-- Featured Creator Section (Mark Rober) -->
        <div v-if="featuredChannels[0]" class="featuredCreatorSection">
          <div class="featuredCreatorHeader">
            <h2 class="featuredCreatorTitle">
              <FontAwesomeIcon
                :icon="['fas', 'star']"
                class="featuredIcon"
                fixed-width
              />
              Featured Creator
            </h2>
            <p class="featuredCreatorDescription">Amazing science and engineering projects!</p>
          </div>
          
          <div class="featuredChannelContent">
            <div class="featuredChannelHeader">
              <FtChannelBubble
                :channel-name="featuredChannels[0].name"
                :channel-thumbnail="featuredChannels[0].thumbnail"
                :channel-id="featuredChannels[0].id"
                :hide-channel-name="false"
                :show-subscribe-button="true"
                class="featuredChannelBubble"
              />
              <FtButton
                class="featuredViewAllButton"
                @click="$router.push(`/channel/${featuredChannels[0].id}`)"
              >
                {{ $t("Home.View All") }}
              </FtButton>
            </div>
            
            <FtLoader
              v-if="featuredChannels[0].isLoadingVideos"
              class="smallLoader"
            />
            
            <FtElementList
              v-else-if="featuredChannels[0].videos && featuredChannels[0].videos.length > 0"
              :data="featuredChannels[0].videos"
              :display="'grid'"
              class="featuredChannelVideos"
            />
            
            <p v-else-if="featuredChannels[0].videosLoaded" class="noVideosMessage">
              {{ $t("Home.No videos available from this channel") }}
            </p>
          </div>
        </div>
        
        <!-- Other Featured Channels -->
        <div
          v-for="(channel, index) in featuredChannels.slice(1)"
          :key="channel.id"
          class="channelSection"
        >
          <div class="channelHeader">
            <FtChannelBubble
              :channel-name="channel.name"
              :channel-thumbnail="channel.thumbnail"
              :channel-id="channel.id"
              :hide-channel-name="false"
              :show-subscribe-button="true"
              class="channelBubble"
            />
            <FtButton
              class="viewAllButton"
              @click="$router.push(`/channel/${channel.id}`)"
            >
              {{ $t("Home.View All") }}
            </FtButton>
          </div>
          
          <FtLoader
            v-if="channel.isLoadingVideos"
            class="smallLoader"
          />
          
          <FtElementList
            v-else-if="channel.videos && channel.videos.length > 0"
            :data="channel.videos"
            :display="'grid'"
            class="channelVideos"
          />
          
          <p v-else-if="channel.videosLoaded" class="noVideosMessage">
            {{ $t("Home.No videos available from this channel") }}
          </p>
        </div>
      </div>
      
      <div v-if="errorMessage" class="errorMessage">
        <p>{{ errorMessage }}</p>
        <FtButton @click="loadFeaturedChannels">
          {{ $t("Home.Try Again") }}
        </FtButton>
      </div>
    </FtCard>
  </div>
</template>

<script src="./Home.js" />
<style scoped src="./Home.css" /> 