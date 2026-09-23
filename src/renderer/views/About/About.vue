<template>
  <div>
    <FtCard class="card">
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'info-circle']"
          class="headingIcon"
          fixed-width
        />
        {{ $t("About.About") }}
      </h2>
      <section class="brand">
        <FtLogoFull class="logo" />
        <div class="version">
          {{ versionNumber }} {{ $t("About.Beta") }}
        </div>
      </section>
      <section class="about-chunks">
        <figure
          v-for="chunk in chunks"
          :key="chunk.title"
          class="chunk"
        >
          <FontAwesomeIcon
            class="icon"
            :icon="chunk.icon"
          />
          <h3 class="title">
            {{ chunk.title }}
          </h3>
          <div
            class="content"
            v-html="chunk.content"
          />
        </figure>
      </section>
    </FtCard>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from '../../composables/use-i18n-polyfill'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtLogoFull from '../../components/FtLogoFull/FtLogoFull.vue'

import { ABOUT_BITCOIN_ADDRESS } from '../../../constants'
import packageDetails from '../../../../package.json'

const { t } = useI18n()

const versionNumber = `v${packageDetails.version}`

const chunks = computed(() => [
  {
    icon: ['fas', 'info-circle'],
    title: t('About.About'),
    content: 'Scout Browser is a private application designed for safe YouTube browsing for families.'
  },
  {
    icon: ['fas', 'shield-alt'],
    title: 'Privacy & Safety',
    content: 'This application includes advanced content filtering and parental controls to ensure a safe viewing experience.'
  },
  {
    icon: ['fas', 'envelope'],
    title: t('About.Email'),
    content: '<a href="mailto:contact@company.com">contact@company.com</a>'
  }
])
</script>

<style scoped src="./About.css" />
