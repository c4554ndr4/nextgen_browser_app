<template>
  <FtSettingsSection
    :title="$t('Settings.Parental Control Settings.Parental Control Settings')"
  >
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Parental Control Settings.Show Family Friendly Only')"
          compact
          :default-value="showFamilyFriendlyOnly"
          @change="updateShowFamilyFriendlyOnly"
        />
        <FtToggleSwitch
          :label="$t('Settings.Parental Control Settings.Enable Comments')"
          compact
          :default-value="enableComments"
          @change="updateEnableComments"
        />
      </div>
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Parental Control Settings.Hide Search Bar')"
          compact
          :default-value="hideSearchBar"
          @change="updateHideSearchBar"
        />
      </div>
    </div>

    <h4 class="groupTitle">
      {{ $t('Settings.Parental Control Settings.Content Filtering') }}
    </h4>

    <FtFlexBox>
      <FtSelect
        :placeholder="$t('Settings.Parental Control Settings.Content Filter Prompt')"
        :value="contentFilterPrompt"
        :select-names="promptTemplateNames"
        :select-values="promptTemplateValues"
        :tooltip="$t('Settings.Parental Control Settings.Content Filter Prompt Tooltip')"
        :icon="['fas', 'filter']"
        @change="updateContentFilterPrompt"
      />
    </FtFlexBox>

    <div
      v-if="contentFilterPrompt === 'custom'"
      class="customPromptSection"
    >
      <div class="customPromptInputWrapper">
        <label
          for="customPromptTextarea"
          class="customPromptLabel"
        >
          {{ $t('Settings.Parental Control Settings.Custom Filter Prompt') }}
          <FtTooltip
            v-if="$t('Settings.Parental Control Settings.Custom Filter Prompt Tooltip')"
            class="customPromptTooltip"
            position="bottom"
            :tooltip="$t('Settings.Parental Control Settings.Custom Filter Prompt Tooltip')"
          />
        </label>
        <textarea
          id="customPromptTextarea"
          class="customPromptTextarea"
          :placeholder="$t('Settings.Parental Control Settings.Custom Filter Prompt Placeholder')"
          v-model="localCustomPrompt"
          rows="8"
        />
      </div>

      <div
        v-if="customPromptValidation.errors.length > 0"
        class="validationErrors"
      >
        <p
          v-for="error in customPromptValidation.errors"
          :key="error"
          class="errorText"
        >
          {{ error }}
        </p>
      </div>

      <div class="promptHelp">
        <p class="helpText">
          {{ $t('Settings.Parental Control Settings.Custom Prompt Help') }}
        </p>
        <ul class="helpList">
          <li>{{ $t('Settings.Parental Control Settings.Custom Prompt Help 1') }}</li>
          <li>{{ $t('Settings.Parental Control Settings.Custom Prompt Help 2') }}</li>
          <li>{{ $t('Settings.Parental Control Settings.Custom Prompt Help 3') }}</li>
        </ul>
      </div>
    </div>

    <div
      v-if="selectedTemplateInfo"
      class="templateDescription"
    >
      <div class="templateHeader">
        <h5>{{ selectedTemplateInfo.name }}</h5>
        <FtButton
          v-if="selectedTemplateInfo.id !== 'custom'"
          :label="$t('Settings.Parental Control Settings.View Prompt')"
          :icon="['fas', 'eye']"
          text-color="var(--accent-color)"
          background-color="transparent"
          @click="showPromptModal = true"
        />
      </div>
      <p class="descriptionText">
        {{ selectedTemplateInfo.description }}
      </p>
    </div>

    <!-- Prompt Modal -->
    <FtPrompt
      v-if="showPromptModal"
      :label="$t('Settings.Parental Control Settings.Full Prompt Preview')"
      :extra-labels="[selectedTemplateInfo?.name || '']"
      :option-names="[$t('Settings.Parental Control Settings.Close')]"
      :option-values="['close']"
      theme="base"
      autosize
      @click="showPromptModal = false"
    >
      <div class="promptModalContent">
        <div class="promptText">
          {{ selectedTemplateBasePrompt }}
        </div>
      </div>
      <FtFlexBox>
        <FtButton
          :label="$t('Settings.Parental Control Settings.Close')"
          @click="showPromptModal = false"
        />
      </FtFlexBox>
    </FtPrompt>

    <!-- Search Assistant Section -->
    <h4 class="groupTitle">
      {{ $t('Settings.Parental Control Settings.Search Assistant') }}
    </h4>

    <FtFlexBox>
      <FtSelect
        :placeholder="$t('Settings.Parental Control Settings.Search Assistant Prompt')"
        :value="searchAssistantPrompt"
        :select-names="searchAssistantTemplateNames"
        :select-values="searchAssistantTemplateValues"
        :tooltip="$t('Settings.Parental Control Settings.Search Assistant Prompt Tooltip')"
        :icon="['fas', 'search']"
        @change="updateSearchAssistantPrompt"
      />
    </FtFlexBox>

    <div
      v-if="searchAssistantPrompt === 'custom'"
      class="customPromptSection"
    >
      <div class="customPromptInputWrapper">
        <label
          for="customSearchAssistantTextarea"
          class="customPromptLabel"
        >
          {{ $t('Settings.Parental Control Settings.Custom Search Assistant Prompt') }}
          <FtTooltip
            v-if="$t('Settings.Parental Control Settings.Custom Search Assistant Prompt Tooltip')"
            class="customPromptTooltip"
            position="bottom"
            :tooltip="$t('Settings.Parental Control Settings.Custom Search Assistant Prompt Tooltip')"
          />
        </label>
        <textarea
          id="customSearchAssistantTextarea"
          class="customPromptTextarea"
          :placeholder="$t('Settings.Parental Control Settings.Custom Search Assistant Prompt Placeholder')"
          v-model="localCustomSearchAssistantPrompt"
          rows="8"
        />
      </div>

      <div
        v-if="customSearchAssistantValidation.errors.length > 0"
        class="validationErrors"
      >
        <p
          v-for="error in customSearchAssistantValidation.errors"
          :key="error"
          class="errorText"
        >
          {{ error }}
        </p>
      </div>

      <div class="promptHelp">
        <p class="helpText">
          {{ $t('Settings.Parental Control Settings.Custom Search Assistant Help') }}
        </p>
        <ul class="helpList">
          <li>{{ $t('Settings.Parental Control Settings.Custom Search Assistant Help 1') }}</li>
          <li>{{ $t('Settings.Parental Control Settings.Custom Search Assistant Help 2') }}</li>
          <li>{{ $t('Settings.Parental Control Settings.Custom Search Assistant Help 3') }}</li>
        </ul>
      </div>
    </div>

    <div
      v-if="selectedSearchAssistantTemplateInfo"
      class="templateDescription"
    >
      <div class="templateHeader">
        <h5>{{ selectedSearchAssistantTemplateInfo.name }}</h5>
        <FtButton
          v-if="selectedSearchAssistantTemplateInfo.id !== 'custom'"
          :label="$t('Settings.Parental Control Settings.View Prompt')"
          :icon="['fas', 'eye']"
          text-color="var(--accent-color)"
          background-color="transparent"
          @click="showSearchAssistantPromptModal = true"
        />
      </div>
      <p class="descriptionText">
        {{ selectedSearchAssistantTemplateInfo.description }}
      </p>
    </div>

    <!-- Search Assistant Prompt Modal -->
    <FtPrompt
      v-if="showSearchAssistantPromptModal"
      :label="$t('Settings.Parental Control Settings.Search Assistant Prompt Preview')"
      :extra-labels="[selectedSearchAssistantTemplateInfo?.name || '']"
      :option-names="[$t('Settings.Parental Control Settings.Close')]"
      :option-values="['close']"
      theme="base"
      autosize
      @click="showSearchAssistantPromptModal = false"
    >
      <div class="promptModalContent">
        <div class="promptText">
          {{ selectedSearchAssistantTemplateBasePrompt }}
        </div>
      </div>
      <FtFlexBox>
        <FtButton
          :label="$t('Settings.Parental Control Settings.Close')"
          @click="showSearchAssistantPromptModal = false"
        />
      </FtFlexBox>
    </FtPrompt>
  </FtSettingsSection>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'

import FtSettingsSection from './FtSettingsSection/FtSettingsSection.vue'
import FtToggleSwitch from './ft-toggle-switch/ft-toggle-switch.vue'
import FtSelect from './ft-select/ft-select.vue'
import FtFlexBox from './ft-flex-box/ft-flex-box.vue'
import FtTooltip from './FtTooltip/FtTooltip.vue'
import FtButton from './FtButton/FtButton.vue'
import FtPrompt from './FtPrompt/FtPrompt.vue'

import store from '../store/index'
import { getAvailableTemplates, validateCustomPrompt, PROMPT_TEMPLATES } from '../services/prompt-templates'
import { getSearchAssistantTemplates, validateSearchAssistantPrompt, SEARCH_ASSISTANT_TEMPLATES } from '../services/search-assistant-templates'

const hideSearchBar = computed(() => {
  return store.getters.getHideSearchBar
})

const showFamilyFriendlyOnly = computed(() => {
  return store.getters.getShowFamilyFriendlyOnly
})

const contentFilterPrompt = computed(() => {
  return store.getters.getContentFilterPrompt
})

const customFilterPrompt = computed(() => {
  return store.getters.getCustomFilterPrompt
})

const enableComments = computed(() => {
  return store.getters.getEnableComments
})

const searchAssistantPrompt = computed(() => {
  return store.getters.getSearchAssistantPrompt
})

const customSearchAssistantPrompt = computed(() => {
  return store.getters.getCustomSearchAssistantPrompt
})

// Get available prompt templates
const availableTemplates = getAvailableTemplates()
const promptTemplateNames = availableTemplates.map(template => template.name)
const promptTemplateValues = availableTemplates.map(template => template.id)

// Get available search assistant templates
const searchAssistantTemplates = getSearchAssistantTemplates()
const searchAssistantTemplateNames = searchAssistantTemplates.map(template => template.name)
const searchAssistantTemplateValues = searchAssistantTemplates.map(template => template.id)

// Get selected template info for description
const selectedTemplateInfo = computed(() => {
  return availableTemplates.find(template => template.id === contentFilterPrompt.value)
})

// Get selected search assistant template info
const selectedSearchAssistantTemplateInfo = computed(() => {
  return searchAssistantTemplates.find(template => template.id === searchAssistantPrompt.value)
})

// Get the base prompt text for the selected template
const selectedTemplateBasePrompt = computed(() => {
  const templateId = contentFilterPrompt.value
  if (templateId && PROMPT_TEMPLATES[templateId]) {
    return PROMPT_TEMPLATES[templateId].basePrompt
  }
  return ''
})

// Get the base prompt text for the selected search assistant template
const selectedSearchAssistantTemplateBasePrompt = computed(() => {
  const templateId = searchAssistantPrompt.value
  if (templateId && SEARCH_ASSISTANT_TEMPLATES[templateId]) {
    return SEARCH_ASSISTANT_TEMPLATES[templateId].basePrompt
  }
  return ''
})

// Custom prompt validation
const customPromptValidation = ref({ isValid: true, errors: [] })
const customSearchAssistantValidation = ref({ isValid: true, errors: [] })

// Local reactive variable for the custom prompt
const localCustomPrompt = ref('')
const localCustomSearchAssistantPrompt = ref('')

// Modal state
const showPromptModal = ref(false)
const showSearchAssistantPromptModal = ref(false)

// Debounce timer
let debounceTimer = null
let searchAssistantDebounceTimer = null

// Initialize local value from store
localCustomPrompt.value = customFilterPrompt.value
localCustomSearchAssistantPrompt.value = customSearchAssistantPrompt.value

// Watch for changes in store value and update local (only when not typing)
watch(customFilterPrompt, (newValue) => {
  if (newValue !== localCustomPrompt.value) {
    localCustomPrompt.value = newValue
  }
})

// Watch for changes in search assistant store value and update local
watch(customSearchAssistantPrompt, (newValue) => {
  if (newValue !== localCustomSearchAssistantPrompt.value) {
    localCustomSearchAssistantPrompt.value = newValue
  }
})

// Debounced function to update store and validate
const updateStoreDebounced = (value) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    if (value !== customFilterPrompt.value) {
      store.dispatch('updateCustomFilterPrompt', value)
    }
    
    // Validate the custom prompt
    if (contentFilterPrompt.value === 'custom') {
      customPromptValidation.value = validateCustomPrompt(value)
    }
  }, 300) // 300ms debounce delay
}

// Debounced function to update search assistant store and validate
const updateSearchAssistantStoreDebounced = (value) => {
  if (searchAssistantDebounceTimer) {
    clearTimeout(searchAssistantDebounceTimer)
  }
  
  searchAssistantDebounceTimer = setTimeout(() => {
    if (value !== customSearchAssistantPrompt.value) {
      store.dispatch('updateCustomSearchAssistantPrompt', value)
    }
    
    // Validate the custom search assistant prompt
    if (searchAssistantPrompt.value === 'custom') {
      customSearchAssistantValidation.value = validateSearchAssistantPrompt(value)
    }
  }, 300) // 300ms debounce delay
}

// Watch for changes in local value and debounce store updates
watch(localCustomPrompt, (newValue) => {
  updateStoreDebounced(newValue)
})

// Watch for changes in local search assistant value and debounce store updates
watch(localCustomSearchAssistantPrompt, (newValue) => {
  updateSearchAssistantStoreDebounced(newValue)
})

// Cleanup debounce timer on component unmount
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  if (searchAssistantDebounceTimer) {
    clearTimeout(searchAssistantDebounceTimer)
  }
})

// Watch for content filter changes to immediately validate if switching to custom
watch(contentFilterPrompt, (newValue) => {
  if (newValue === 'custom' && localCustomPrompt.value) {
    customPromptValidation.value = validateCustomPrompt(localCustomPrompt.value)
  }
})

// Watch for search assistant changes to immediately validate if switching to custom
watch(searchAssistantPrompt, (newValue) => {
  if (newValue === 'custom' && localCustomSearchAssistantPrompt.value) {
    customSearchAssistantValidation.value = validateSearchAssistantPrompt(localCustomSearchAssistantPrompt.value)
  }
})

/**
 * @param {boolean} value
 */
function updateHideSearchBar(value) {
  store.dispatch('updateHideSearchBar', value)
}

/**
 * @param {boolean} value
 */
function updateShowFamilyFriendlyOnly(value) {
  store.dispatch('updateShowFamilyFriendlyOnly', value)
}

/**
 * @param {boolean} value
 */
function updateEnableComments(value) {
  store.dispatch('updateEnableComments', value)
}

/**
 * @param {string} value
 */
function updateContentFilterPrompt(value) {
  store.dispatch('updateContentFilterPrompt', value)
}

/**
 * @param {string} value
 */
function updateSearchAssistantPrompt(value) {
  store.dispatch('updateSearchAssistantPrompt', value)
}
</script>

<style scoped>
.groupTitle {
  margin-top: 20px;
  margin-bottom: 10px;
  color: var(--primary-text-color);
  font-size: 16px;
  font-weight: 600;
}

.customPromptSection {
  margin-top: 15px;
  padding: 15px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.customPromptInputWrapper {
  margin-bottom: 15px;
}

.customPromptLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-text-color);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.customPromptTooltip {
  display: inline-block;
}

.customPromptTextarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--search-bar-color);
  color: var(--primary-text-color);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.customPromptTextarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

.customPromptTextarea::placeholder {
  color: var(--tertiary-text-color);
}

.validationErrors {
  margin-top: 10px;
}

.errorText {
  color: var(--destructive-text-color);
  font-size: 14px;
  margin: 5px 0;
}

.promptHelp {
  margin-top: 15px;
  padding: 10px;
  background-color: var(--info-bg-color);
  border-radius: 6px;
  border-left: 4px solid var(--accent-color);
}

.helpText {
  color: var(--secondary-text-color);
  font-size: 14px;
  margin-bottom: 10px;
}

.helpList {
  color: var(--secondary-text-color);
  font-size: 13px;
  margin-left: 20px;
}

.helpList li {
  margin-bottom: 5px;
}

.templateDescription {
  margin-top: 15px;
  padding: 12px;
  background-color: var(--info-bg-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.templateHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.templateDescription h5 {
  color: var(--primary-text-color);
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.descriptionText {
  color: var(--secondary-text-color);
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
}

.promptModalContent {
  max-height: 60vh;
  overflow-y: auto;
  margin: 15px 0;
}

.promptText {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--primary-text-color);
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
