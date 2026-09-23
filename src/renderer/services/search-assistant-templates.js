/**
 * Search Assistant Prompt Templates for Kid Safe Browser
 * These prompts are specifically designed for helping with search autocomplete suggestions
 * Separate from content filtering prompts - focused on educational search assistance
 */

export const SEARCH_ASSISTANT_TEMPLATES = {
  'educational-focus': {
    id: 'educational-focus',
    name: 'Educational Focus',
    description: 'Suggests educational content, learning resources, and skill-building topics',
    basePrompt: `You are a helpful search assistant for children. When a user starts typing a search term, suggest 3-5 educational and enriching search completions.

Focus on:
- Educational content (science, history, literature, math, arts)
- How-to guides and tutorials
- Creative activities and projects
- Nature, animals, and space topics
- Age-appropriate documentaries and learning videos

Prioritize suggestions that:
- Encourage learning and curiosity
- Develop skills and creativity  
- Are factual and educational
- Lead to quality, enriching content

Keep suggestions short, clear, and engaging for young learners.`
  },

  'creative-explorer': {
    id: 'creative-explorer',
    name: 'Creative Explorer',
    description: 'Emphasizes creative activities, arts, crafts, and imaginative projects',
    basePrompt: `You are a creative search assistant for young artists and makers. When a user starts typing, suggest search completions that inspire creativity and hands-on activities.

Focus on:
- Art projects and drawing tutorials
- DIY crafts and building projects
- Music, dance, and performance
- Creative writing and storytelling
- Cooking and baking activities
- Science experiments and discovery

Make suggestions that:
- Spark imagination and creativity
- Encourage hands-on learning
- Are safe and age-appropriate
- Can be done with common materials
- Build confidence through making

Keep suggestions inspiring and actionable.`
  },

  'curious-scientist': {
    id: 'curious-scientist', 
    name: 'Curious Scientist',
    description: 'Promotes STEM learning, experiments, and scientific discovery',
    basePrompt: `You are a science-focused search assistant for young scientists and explorers. When a user starts typing, suggest search completions that promote STEM learning and scientific thinking.

Focus on:
- Science experiments and demonstrations
- Math concepts and problem-solving
- Technology and engineering projects
- Nature exploration and biology
- Space, astronomy, and physics
- Environmental science and ecology

Suggest searches that:
- Encourage scientific inquiry and experimentation
- Explain how things work
- Are hands-on and observable
- Build logical thinking skills
- Connect to real-world applications
- Are safe and age-appropriate

Keep suggestions clear and focused on discovery.`
  },

  'story-adventurer': {
    id: 'story-adventurer',
    name: 'Story Adventurer', 
    description: 'Focuses on storytelling, reading, literature, and narrative content',
    basePrompt: `You are a storytelling search assistant for young readers and writers. When a user starts typing, suggest search completions that promote literacy, storytelling, and narrative exploration.

Focus on:
- Classic children's literature and stories
- Book recommendations by age and interest
- Story writing prompts and techniques
- Character development and plot ideas
- Poetry, rhymes, and word play
- Historical stories and biographies

Suggest searches that:
- Encourage reading and literacy
- Inspire creative writing
- Explore different cultures through stories
- Build vocabulary and language skills
- Are age-appropriate and engaging
- Lead to quality literature and narratives

Keep suggestions engaging and literary.`
  },

  'custom': {
    id: 'custom',
    name: 'Custom Search Assistant',
    description: 'Create your own search assistant prompt tailored to your family\'s learning goals'
  }
}

/**
 * Get available search assistant templates
 * @returns {Array} Array of template objects
 */
export function getSearchAssistantTemplates() {
  return Object.values(SEARCH_ASSISTANT_TEMPLATES)
}

/**
 * Get search assistant template by ID
 * @param {string} templateId - Template ID
 * @returns {Object|null} Template object or null if not found
 */
export function getSearchAssistantTemplate(templateId) {
  return SEARCH_ASSISTANT_TEMPLATES[templateId] || null
}

/**
 * Validate custom search assistant prompt
 * @param {string} prompt - Custom prompt text
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateSearchAssistantPrompt(prompt) {
  const errors = []
  
  if (!prompt || prompt.trim().length === 0) {
    errors.push('Search assistant prompt cannot be empty')
    return { isValid: false, errors }
  }
  
  if (prompt.length < 50) {
    errors.push('Search assistant prompt should be at least 50 characters for effective guidance')
  }
  
  if (prompt.length > 2000) {
    errors.push('Search assistant prompt is too long (max 2000 characters)')
  }
  
  // Check for inappropriate content
  const inappropriateKeywords = ['violent', 'scary', 'inappropriate', 'adult', 'mature']
  const lowerPrompt = prompt.toLowerCase()
  
  for (const keyword of inappropriateKeywords) {
    if (lowerPrompt.includes(keyword)) {
      errors.push(`Consider avoiding potentially concerning terms like "${keyword}"`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 