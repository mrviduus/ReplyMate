// Message types
export const MESSAGE_TYPES = {
  // AI-related messages
  LOAD_MODEL: 'load_model',
  LOAD_ALL_MODELS: 'load_all_models',
  GENERATE_RESPONSE: 'generate_response',
  MODEL_STATUS: 'model_status',
  CLEAR_MODEL_CACHE: 'clear_model_cache',
  
  // LinkedIn integration
  MESSAGE_DETECTED: 'message_detected',
  RESPONSE_GENERATED: 'response_generated',
  SEND_RESPONSE: 'send_response',
  
  // Settings
  GET_SETTINGS: 'get_settings',
  UPDATE_SETTINGS: 'update_settings',
  RESET_SETTINGS: 'reset_settings',
  IMPORT_SETTINGS: 'import_settings',
  
  // Templates
  GET_TEMPLATES: 'get_templates',
  SAVE_TEMPLATE: 'save_template',
  DELETE_TEMPLATE: 'delete_template',
  
  // UI
  TOGGLE_UI: 'toggle_ui',
  UI_STATE_CHANGED: 'ui_state_changed',
  
  // Analytics
  LOG_USAGE: 'log_usage',
  GET_STATS: 'get_stats',
  
  // Data management
  CLEAR_ALL_DATA: 'clear_all_data',
  
  // System
  PING: 'ping',
  ERROR: 'error'
} as const;

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'linkedin_autoreply_settings',
  TEMPLATES: 'linkedin_autoreply_templates',
  USAGE_STATS: 'linkedin_autoreply_stats',
  MODEL_CACHE: 'linkedin_autoreply_model_cache',
  CONVERSATION_HISTORY: 'linkedin_autoreply_history'
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  isEnabled: true,
  autoReplyEnabled: false,
  selectedModel: 'flan-t5-small',
  generationConfig: {
    maxTokens: 80,
    temperature: 0.7,
    topP: 0.9,
    repeatPenalty: 1.1,
    stopSequences: ['\n\n', '---', 'Best regards']
  },
  responseTemplates: [
    {
      id: 'greeting',
      name: 'Professional Greeting',
      description: 'Polite professional greeting',
      template: 'Thank you for reaching out! I appreciate your message about {topic}.',
      category: 'greeting' as const,
      isActive: true,
      variables: ['topic']
    },
    {
      id: 'follow-up',
      name: 'Follow-up Response',
      description: 'Professional follow-up',
      template: 'Thanks for the follow-up. I\'ll review this and get back to you by {timeframe}.',
      category: 'follow-up' as const,
      isActive: true,
      variables: ['timeframe']
    }
  ],
  blacklistedKeywords: ['urgent', 'immediate', 'asap'],
  maxResponseLength: 300,
  responseDelay: 5,
  includeContext: true,
  privacyMode: true,
  suggestionMode: 'automatic' as const,
  responseLanguage: 'en',
  analyticsEnabled: true,
  dataSharing: false
};

// Model configurations
export const AVAILABLE_MODELS = [
  {
    id: 'flan-t5-small',
    name: 'Flan-T5-Small',
    description: 'Text-to-text generation model optimized for professional responses',
    size: '~60MB',
    status: 'not-loaded' as const,
    path: 'Xenova/flan-t5-small',
    type: 'text2text-generation' as const
  },
  {
    id: 'distilbert-sentiment',
    name: 'DistilBERT Sentiment',
    description: 'Sentiment analysis for message context',
    size: '250MB',
    status: 'not-loaded' as const,
    path: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    type: 'sentiment-analysis' as const
  }
];

// LinkedIn selectors (these may need updates based on LinkedIn's current DOM structure)
export const LINKEDIN_SELECTORS = {
  // Messaging
  MESSAGE_INPUT: '[contenteditable="true"][data-placeholder*="message"]',
  MESSAGE_SEND_BUTTON: 'button[data-control-name="send_message"]',
  MESSAGE_THREAD: '.msg-s-message-list__event',
  MESSAGE_CONTENT: '.msg-s-event-listitem__body',
  
  // Conversation list
  CONVERSATION_LIST: '.msg-conversations-container__conversations-list',
  CONVERSATION_ITEM: '.msg-conversation-listitem',
  UNREAD_INDICATOR: '.msg-conversation-card__unread-count',
  
  // Profile information
  PARTICIPANT_NAME: '.msg-entity-lockup__entity-title',
  PARTICIPANT_TITLE: '.msg-entity-lockup__entity-subtitle',
  
  // UI injection points
  MESSAGING_CONTAINER: '.msg-form__contenteditable',
  MESSAGING_TOOLBAR: '.msg-form__send-button'
};

// CSS classes for our injected UI
export const UI_CLASSES = {
  CONTAINER: 'linkedin-autoreply-container',
  BUTTON: 'linkedin-autoreply-button',
  PANEL: 'linkedin-autoreply-panel',
  SUGGESTION: 'linkedin-autoreply-suggestion',
  LOADING: 'linkedin-autoreply-loading',
  ERROR: 'linkedin-autoreply-error',
  HIDDEN: 'linkedin-autoreply-hidden'
};
