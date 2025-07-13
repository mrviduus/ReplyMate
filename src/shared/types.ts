// Message types for communication between components
export interface Message {
  type: string;
  payload?: any;
  requestId?: string;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string | undefined;
}

// AI Model types
export interface AIModel {
  id: string;
  name: string;
  description: string;
  size: string;
  status: 'not-loaded' | 'loading' | 'loaded' | 'error';
  path: string;
  type: 'text-generation' | 'sentiment-analysis';
}

export interface ModelConfig {
  modelId: string;
  config: any;
  metadata?: Record<string, any>;
}

export interface GenerationConfig {
  maxTokens: number;
  temperature: number;
  topP: number;
  repeatPenalty: number;
  stopSequences: string[];
}

// LinkedIn message types
export interface LinkedInMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  conversationId: string;
  isIncoming: boolean;
}

export interface LinkedInConversation {
  id: string;
  participantName: string;
  participantTitle?: string;
  lastMessage: LinkedInMessage;
  unreadCount: number;
  profileUrl?: string;
}

// Response template types
export interface ResponseTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: 'greeting' | 'follow-up' | 'meeting' | 'decline' | 'custom';
  isActive: boolean;
  variables: string[];
}

// Message template for options page
export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extension settings
export interface ExtensionSettings {
  isEnabled: boolean;
  autoReplyEnabled: boolean;
  selectedModel: string;
  generationConfig: GenerationConfig;
  responseTemplates: ResponseTemplate[];
  blacklistedKeywords: string[];
  maxResponseLength: number;
  responseDelay: number; // in seconds
  includeContext: boolean;
  privacyMode: boolean;
  suggestionMode: 'automatic' | 'manual';
  responseLanguage: string;
  analyticsEnabled: boolean;
  dataSharing: boolean;
}

// UI state
export interface UIState {
  isVisible: boolean;
  currentMessage: LinkedInMessage | null;
  suggestedResponses: string[];
  isGenerating: boolean;
  error: string | null;
}

// Analytics and logging
export interface UsageStats {
  totalResponses: number;
  responsesThisWeek: number;
  responsesThisMonth: number;
  averageResponseTime: number;
  mostUsedTemplates: string[];
  lastUsed: Date;
  totalTokensGenerated: number;
  modelSwitches: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: any;
}
