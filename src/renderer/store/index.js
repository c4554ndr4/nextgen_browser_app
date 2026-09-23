import Vue from 'vue'
import Vuex from 'vuex'
// import createPersistedState from 'vuex-persistedstate'

import modules from './modules'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules,

  // Detects unsafe changes to the store state e.g. outside of mutations
  // but we have to turn it off despite its usefulness as we have so much data in the store
  // that it causes a noticable slow-down :(
  // PERFORMANCE FIX: Only enable strict mode in development
  strict: process.env.NODE_ENV === 'development'

  // TODO: Enable when deploy
  // plugins: [createPersistedState()]
})

// Hide the trending screen by default
store.dispatch('updateHideTrendingVideos', true)

export default store
