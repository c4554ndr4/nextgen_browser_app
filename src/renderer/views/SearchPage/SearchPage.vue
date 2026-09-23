<template>
  <div>
    <ft-loader
      v-if="isLoading"
      :fullscreen="true"
    />
    <ft-card
      v-else-if="geminiFilterInProgress"
      class="card"
    >
      <h2>
        <font-awesome-icon
          :icon="['fas', 'search']"
          class="headingIcon"
          fixed-width
        />
        {{ $t("Search Filters.Search Results") }}
      </h2>
      <div class="geminiLoadingIndicator">
        <p>Analyzing search results with AI...</p>
        
        <!-- Time estimate slider -->
        <div class="timeEstimateContainer">
          <div class="timeEstimateLabel">
            <span>Estimated time remaining: {{ formatTimeRemaining(timeRemaining) }}</span>
          </div>
          <div class="progressBarContainer">
            <div class="progressBar">
              <div 
                class="progressBarFill" 
                :style="{ width: progressPercentage + '%' }"
              ></div>
            </div>
          </div>
          <div class="timeEstimateSubtext">
            <span>AI is analyzing content for safety and quality</span>
          </div>
        </div>
      </div>
    </ft-card>
    <ft-card
      v-else
      class="card"
    >
      <h2>
        <font-awesome-icon
          :icon="['fas', 'search']"
          class="headingIcon"
          fixed-width
        />
        {{ $t("Search Filters.Search Results") }}
      </h2>
      <div v-if="shownResults.length === 0" class="emptyState">
        <font-awesome-icon
          :icon="['fas', 'shield-alt']"
          class="emptyStateIcon"
        />
        <h3>No suitable content found</h3>
        <p>All search results were filtered out for safety. Try searching for educational or creative content.</p>
      </div>
      <div v-else>
        <ft-element-list
          :data="shownResults"
        />
        <ft-auto-load-next-page-wrapper
          v-if="!geminiFilterInProgress && nextPageRef"
        >
          <div
            class="getNextPage"
            role="button"
            tabindex="0"
            @click="nextPage"
            @keydown.enter.prevent="nextPage"
            @keydown.space.prevent="nextPage"
          >
            <font-awesome-icon :icon="['fas', 'search']" /> {{ $t("Search Filters.Fetch more results") }}
          </div>
        </ft-auto-load-next-page-wrapper>
      </div>
    </ft-card>
  </div>
</template>

<script src="./SearchPage.js" />
<style scoped src="./SearchPage.css" />
