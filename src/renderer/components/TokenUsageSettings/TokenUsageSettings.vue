<template>
  <div class="tokenUsageSettings">
    <h2 class="settingsHeader">
      {{ $t('Settings.Token Usage.Token Usage') }}
    </h2>
    
    <div class="tokenStatsContainer">
      <!-- Simple Usage Overview -->
      <div class="statsCard">
        <div class="statRow">
          <div class="statLabel">{{ $t('Settings.Token Usage.Total Tokens Used') }}:</div>
          <div class="statValue">{{ formatNumber(usageStats.totalTokens) }}</div>
        </div>
        
        <div class="statRow">
          <div class="statLabel">{{ $t('Settings.Token Usage.Total API Calls') }}:</div>
          <div class="statValue">{{ formatNumber(usageStats.apiCallsCount) }}</div>
        </div>
        
        <div class="statRow major">
          <div class="statLabel">{{ $t('Settings.Token Usage.Estimated Total Cost') }}:</div>
          <div class="statValue cost">{{ formatCost(usageStats.totalCost) }}</div>
        </div>
        
        <div class="breakdown">
          <div class="breakdownItem">
            <span class="label">{{ $t('Settings.Token Usage.Input Tokens') }}</span>
            <span class="value">{{ formatNumber(usageStats.totalInputTokens) }} ({{ formatCost(usageStats.totalInputTokens * 0.000001875) }})</span>
          </div>
          <div class="breakdownItem">
            <span class="label">{{ $t('Settings.Token Usage.Output Tokens') }}</span>
            <span class="value">{{ formatNumber(usageStats.totalOutputTokens) }} ({{ formatCost(usageStats.totalOutputTokens * 0.0000075) }})</span>
          </div>
        </div>
      </div>
      
      <!-- Info and Actions -->
      <div class="infoCard">
        <p class="costNote">{{ $t('Settings.Token Usage.Cost Note') }}</p>
        
        <div class="actionsRow">
          <button class="refreshBtn" @click="refreshUsage">
            🔄 {{ $t('Settings.Token Usage.Refresh') }}
          </button>
          
          <button class="testBtn" @click="addTestTokens">
            🧪 Add Test Tokens
          </button>
          
          <button class="resetBtn" @click="showResetConfirmation = true">
            🗑️ {{ $t('Settings.Token Usage.Reset') }}
          </button>
        </div>
        
        <p class="lastUpdated">{{ $t('Settings.Token Usage.Last Updated') }}: {{ formatDate(usageStats.lastUpdated) }}</p>
      </div>
    </div>
    
    <!-- Reset Confirmation Dialog -->
    <div v-if="showResetConfirmation" class="confirmationDialog" @click="showResetConfirmation = false">
      <div class="dialogContent" @click.stop>
        <h3>{{ $t('Settings.Token Usage.Reset Confirmation') }}</h3>
        <p>{{ $t('Settings.Token Usage.Reset Message') }}</p>
        <div class="dialogActions">
          <button @click="resetUsage" class="confirmBtn">{{ $t('Settings.Token Usage.Reset') }}</button>
          <button @click="showResetConfirmation = false" class="cancelBtn">{{ $t('Settings.Token Usage.Cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import tokenUsageService from '../../services/token-usage-service'

export default defineComponent({
  name: 'TokenUsageSettings',
  data() {
    return {
      usageStats: {},
      showResetConfirmation: false
    }
  },
  mounted() {
    this.refreshUsage()
  },
  methods: {
    refreshUsage() {
      console.log('🔄 Refreshing token usage...')
      this.usageStats = tokenUsageService.getUsage()
      console.log('📊 Current usage stats:', this.usageStats)
    },
    
    addTestTokens() {
      console.log('🧪 Adding test token usage...')
      // Add test usage data manually
      const testUsage = tokenUsageService.addTestTokens()
      console.log('🧪 Test data added:', testUsage)
      this.refreshUsage()
    },
    
    resetUsage() {
      console.log('🗑️ Resetting token usage...')
      tokenUsageService.resetUsage()
      this.refreshUsage()
      this.showResetConfirmation = false
    },
    
    formatNumber(num) {
      console.log('🔢 Formatting number:', num, 'Result:', tokenUsageService.formatNumber(num))
      return tokenUsageService.formatNumber(num)
    },
    
    formatCost(cost) {
      console.log('💰 Formatting cost:', cost, 'Result:', tokenUsageService.formatCost(cost))
      return tokenUsageService.formatCost(cost)
    },
    
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString()
    },
    
    // Test function for debugging
    testTokenUsage() {
      console.log('🧪 Testing token usage manually...')
      const result = tokenUsageService.addTestTokens()
      console.log('🧪 Test result:', result)
      this.refreshUsage()
    }
  }
})
</script>

<style scoped>
.tokenUsageSettings {
  max-width: 800px;
}

.settingsHeader {
  margin-bottom: 20px;
  color: var(--primary-text-color);
}

.tokenStatsContainer {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.statsCard {
  background: var(--secondary-card-color);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-color);
}

.statRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.statRow:last-child {
  border-bottom: none;
}

.statRow.major {
  font-size: 1.1em;
  font-weight: 600;
  background: var(--primary-color-light);
  margin: 16px -24px;
  padding: 16px 24px;
  border-radius: 8px;
  border: none;
}

.statLabel {
  color: var(--secondary-text-color);
  font-weight: 500;
}

.statValue {
  color: var(--primary-text-color);
  font-weight: 600;
  font-size: 1.1em;
}

.statValue.cost {
  color: var(--primary-color);
  font-size: 1.3em;
}

.breakdown {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.breakdownItem {
  flex: 1;
  text-align: center;
}

.breakdownItem .label {
  display: block;
  font-size: 0.9em;
  color: var(--secondary-text-color);
  margin-bottom: 4px;
}

.breakdownItem .value {
  display: block;
  font-weight: 600;
  color: var(--primary-text-color);
}

.infoCard {
  background: var(--secondary-card-color);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.costNote {
  font-size: 0.9em;
  color: var(--secondary-text-color);
  margin-bottom: 16px;
  line-height: 1.4;
}

.actionsRow {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.refreshBtn, .resetBtn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--secondary-card-color);
  color: var(--primary-text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refreshBtn:hover {
  background: var(--primary-color-light);
  border-color: var(--primary-color);
}

.resetBtn:hover {
  background: #ffebee;
  border-color: #e57373;
  color: #c62828;
}

.testBtn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--secondary-card-color);
  color: var(--primary-text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.testBtn:hover {
  background: var(--primary-color-light);
  border-color: var(--primary-color);
}

.lastUpdated {
  font-size: 0.8em;
  color: var(--tertiary-text-color);
  margin: 0;
}

.confirmationDialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialogContent {
  background: var(--secondary-card-color);
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  margin: 20px;
}

.dialogContent h3 {
  margin: 0 0 16px 0;
  color: var(--primary-text-color);
}

.dialogContent p {
  margin: 0 0 20px 0;
  color: var(--secondary-text-color);
  line-height: 1.4;
}

.dialogActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirmBtn, .cancelBtn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirmBtn {
  background: #ffebee;
  color: #c62828;
  border-color: #e57373;
}

.confirmBtn:hover {
  background: #ffcdd2;
  border-color: #ef5350;
}

.cancelBtn {
  background: var(--secondary-card-color);
  color: var(--primary-text-color);
}

.cancelBtn:hover {
  background: var(--primary-color-light);
  border-color: var(--primary-color);
}

@media (max-width: 768px) {
  .breakdown {
    flex-direction: column;
    gap: 12px;
  }
  
  .actionsRow {
    flex-direction: column;
  }
}
</style> 