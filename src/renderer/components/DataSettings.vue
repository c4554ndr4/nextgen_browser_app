<template>
  <FtSettingsSection
    :title="$t('Settings.Data Settings.Data Settings')"
  >
    <h4 class="groupTitle">
      {{ $t('Subscriptions.Subscriptions') }}
    </h4>
    <FtFlexBox class="dataSettingsBox">
      <FtButton
        :label="$t('Settings.Data Settings.Manage Subscriptions')"
        @click="openProfileSettings"
      />
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { useRouter } from 'vue-router/composables'

import FtButton from './FtButton/FtButton.vue'
import FtFlexBox from './ft-flex-box/ft-flex-box.vue'
import FtSettingsSection from './FtSettingsSection/FtSettingsSection.vue'

const router = useRouter()

function openProfileSettings() {
  router.push('/settings/profile')
}
</script>
