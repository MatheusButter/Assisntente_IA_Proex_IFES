export interface Source {
  id: string;
  type: "url" | "text";
  value: string;
  title: string;
}

export interface BotConfig {
  botName: string;
  systemInstruction: string;
  threshold: number;
  welcomeMessage: string;
}

export interface RAGStatus {
  chunkCount: number;
  embeddedCount: number;
  hasApiKey: boolean;
  scheduler?: {
    lastTrainTimestamp: number;
    weeklyUpdateEnabled: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  isVector?: boolean;
  matchedChunks?: { title: string; source: string; content: string }[];
  feedback?: "like" | "dislike" | null;
  logId?: string;
}

export interface DashboardStats {
  totalQueries: number;
  usefulCount: number;
  nonUsefulCount: number;
  resolutionData: { name: string; value: number; color: string }[];
  categoriesData: { name: string; quantidade: number }[];
  accessTimelineData: { data: string; acessos: number }[];
  categoryResolutionData?: { name: string; Resolvidos: number; Direcionados: number }[];
}

export interface AppLog {
  id: string;
  timestamp: string;
  query: string;
  responseText: string;
  matchedChunks: string[];
  resolved: boolean;
  category: string;
  feedback: "like" | "dislike" | null;
  feedbackText: string;
}
