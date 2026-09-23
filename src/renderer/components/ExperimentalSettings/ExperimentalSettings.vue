<template>
  <FtSettingsSection
    :title="$t('Settings.Experimental Settings.Experimental Settings')"
  >
    <p class="experimental-warning">
      {{ $t('Settings.Experimental Settings.Warning') }}
    </p>
    <FtFlexBox>
      <FtToggleSwitch
        :label="$t('Settings.Parental Control Settings.Use Backend Filtering')"
        compact
        :default-value="useBackendFiltering"
        @change="updateUseBackendFiltering"
      />
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { computed } from 'vue'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtToggleSwitch from '../ft-toggle-switch/ft-toggle-switch.vue'

import store from '../../store/index'

const useBackendFiltering = computed(() => {
  return store.getters.getUseBackendFiltering
})

/**
 * @param {boolean} value
 */
function updateUseBackendFiltering(value) {
  store.dispatch('updateUseBackendFiltering', value)
}
</script>

<style scoped src="./ExperimentalSettings.css" />
