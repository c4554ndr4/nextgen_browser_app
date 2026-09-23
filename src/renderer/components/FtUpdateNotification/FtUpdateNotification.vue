<template>
  <transition name="slide-up">
    <div
      v-if="visible"
      class="updateNotification"
      :class="{ 'downloading': isDownloading, 'ready': isReady }"
    >
      <div class="content">
        <div class="message">
          <span v-if="!isDownloading && !isReady">
            A new update is available. Update now?
          </span>
          <span v-else-if="isDownloading">
            Downloading update... {{ downloadPercent }}%
          </span>
          <span v-else-if="isReady">
            Update ready! Restart to install.
          </span>
        </div>
        <div class="actions">
          <button
            v-if="!isDownloading && !isReady"
            class="updateButton"
            @click="handleUpdateClick"
          >
            Update
          </button>
          <button
            v-else-if="isReady"
            class="updateButton"
            @click="handleInstallClick"
          >
            Restart Now
          </button>
          <button
            class="closeButton"
            @click="handleCloseClick"
            :disabled="isDownloading"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="isDownloading" class="progressBar">
        <div class="progress" :style="{ width: downloadPercent + '%' }"></div>
      </div>
    </div>
  </transition>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FtUpdateNotification',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    version: {
      type: String,
      default: ''
    },
    isDownloading: {
      type: Boolean,
      default: false
    },
    downloadPercent: {
      type: Number,
      default: 0
    },
    isReady: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update-click', 'install-click', 'close-click'],
  methods: {
    handleUpdateClick() {
      this.$emit('update-click')
    },
    handleInstallClick() {
      this.$emit('install-click')
    },
    handleCloseClick() {
      this.$emit('close-click')
    }
  }
})
</script>

<style scoped>
.updateNotification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--card-bg-color);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  z-index: 9999;
  overflow: hidden;
}

.content {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message {
  flex: 1;
  font-size: 14px;
  color: var(--text-color);
  line-height: 1.4;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.updateButton {
  background: var(--primary-color);
  color: var(--text-with-main-color);
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.updateButton:hover {
  background: var(--primary-color-active);
}

.closeButton {
  background: transparent;
  color: var(--text-color);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  line-height: 1;
}

.closeButton:hover:not(:disabled) {
  background: var(--side-nav-hover-color);
}

.closeButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progressBar {
  height: 3px;
  background: var(--side-nav-hover-color);
  position: relative;
}

.progress {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.updateNotification.downloading {
  border-color: var(--accent-color);
}

.updateNotification.ready {
  border-color: #4CAF50;
}

.updateNotification.ready .updateButton {
  background: #4CAF50;
}

.updateNotification.ready .updateButton:hover {
  background: #45a049;
}

/* Transition animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .updateNotification {
    bottom: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
  
  .content {
    padding: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .actions {
    justify-content: space-between;
  }
  
  .updateButton {
    flex: 1;
    padding: 8px 12px;
  }
}
</style> 