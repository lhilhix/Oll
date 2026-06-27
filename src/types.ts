export interface ConnectionConfig {
  host: string;
  token: string;
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  modelsCount: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  // Stats returned at the end of the stream
  total_duration?: number; // nanoseconds
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaParams {
  temperature: number;
  top_p: number;
  repeat_penalty: number;
  num_predict: number;
  seed: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  systemPrompt: string;
  createdAt: Date;
  parameters: OllamaParams;
}

export interface PullStatus {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export interface ModelDetail {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
}
