/**
 * @file src/app/services/LLMService.ts
 * @description AI 大语言模型统一服务层 — 多提供商接口、连通性检测、API密钥管理
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-05-22
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags ai,llm,service,provider,connectivity
 */

export type ProviderId = 'ollama' | 'zhipu' | 'openai' | 'anthropic' | 'custom';

export type AuthType = 'none' | 'bearer' | 'x-api-key';

export interface ProviderModel {
  id: string;
  name: string;
  type: 'llm' | 'embedding' | 'vision' | 'code' | 'chat';
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  authType: AuthType;
  detected: boolean;
  models: ProviderModel[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  providerId: ProviderId;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}

const API_KEY_STORAGE_PREFIX = 'yyc3_api_key_';

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434',
    authType: 'none',
    detected: false,
    models: [
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B', type: 'chat', maxTokens: 32768, contextWindow: 131072 },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B', type: 'chat', maxTokens: 8192, contextWindow: 131072 },
      { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', type: 'chat', maxTokens: 16384, contextWindow: 65536 },
      { id: 'nomic-embed-text', name: 'Nomic Embed', type: 'embedding', maxTokens: 8192 },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    authType: 'bearer',
    detected: true,
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', type: 'chat', maxTokens: 4096, contextWindow: 128000 },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', type: 'chat', maxTokens: 4096, contextWindow: 128000 },
      { id: 'glm-4v-plus', name: 'GLM-4V Plus', type: 'vision', maxTokens: 4096 },
      { id: 'embedding-3', name: 'Embedding-3', type: 'embedding', maxTokens: 512 },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    detected: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', type: 'chat', maxTokens: 16384, contextWindow: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: 'chat', maxTokens: 16384, contextWindow: 128000 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    authType: 'x-api-key',
    detected: true,
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', type: 'chat', maxTokens: 8192, contextWindow: 200000 },
    ],
  },
];

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function getApiKey(providerId: ProviderId): string {
  const storage = getStorage();
  if (!storage) return '';
  return storage.getItem(`${API_KEY_STORAGE_PREFIX}${providerId}`) || '';
}

export function setApiKey(providerId: ProviderId, key: string): void {
  const storage = getStorage();
  if (!storage) return;
  if (key) {
    storage.setItem(`${API_KEY_STORAGE_PREFIX}${providerId}`, key);
  } else {
    storage.removeItem(`${API_KEY_STORAGE_PREFIX}${providerId}`);
  }
}

export function hasApiKey(providerId: ProviderId): boolean {
  if (providerId === 'ollama') return true;
  return getApiKey(providerId).length > 0;
}

export function getProviderConfigs(): ProviderConfig[] {
  return PROVIDER_CONFIGS.map(p => ({ ...p }));
}

export function getProvider(id: ProviderId): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find(p => p.id === id);
}

export async function detectOllama(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function testModelConnectivity(
  providerId: ProviderId,
  modelId: string,
): Promise<{ ok: boolean; latencyMs: number; error: string | null }> {
  const provider = getProvider(providerId);
  if (!provider) return { ok: false, latencyMs: 0, error: 'Provider not found' };

  const apiKey = getApiKey(providerId);
  if (provider.authType !== 'none' && !apiKey) {
    return { ok: false, latencyMs: 0, error: 'API key not configured' };
  }

  const start = performance.now();

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.authType === 'bearer' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider.authType === 'x-api-key' && apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    if (providerId === 'ollama') {
      const res = await fetch(`${provider.baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
          options: { num_predict: 1 },
        }),
      });
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, latencyMs, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      return { ok: true, latencyMs, error: null };
    }

    const endpoint = providerId === 'anthropic'
      ? `${provider.baseUrl}/messages`
      : `${provider.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: modelId,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      stream: false,
    };

    if (providerId === 'anthropic') {
      body.max_tokens = 1;
      delete (body as Record<string, unknown>).max_tokens;
      body.max_tokens = 1;
      headers['anthropic-version'] = '2023-06-01';
      body.messages = [{ role: 'user', content: 'ping' }];
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { ok: false, latencyMs, error: `HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }
    return { ok: true, latencyMs, error: null };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, latencyMs, error: 'Request timed out (15s)' };
    }
    return { ok: false, latencyMs, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendChat(request: ChatRequest, providerId: ProviderId): Promise<ChatResponse> {
  const provider = getProvider(providerId);
  if (!provider) throw new Error(`Provider ${providerId} not found`);

  const apiKey = getApiKey(providerId);
  if (provider.authType !== 'none' && !apiKey) throw new Error(`API key not configured for ${provider.name}`);

  const start = performance.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (provider.authType === 'bearer' && apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.authType === 'x-api-key' && apiKey) {
    headers['x-api-key'] = apiKey;
  }

  if (providerId === 'ollama') {
    const res = await fetch(`${provider.baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: { temperature: request.temperature ?? 0.7, num_predict: request.maxTokens ?? 4096 },
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.message?.content ?? '',
      model: request.model,
      providerId,
      latencyMs,
    };
  }

  const endpoint = providerId === 'anthropic'
    ? `${provider.baseUrl}/messages`
    : `${provider.baseUrl}/chat/completions`;

  if (providerId === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        stream: false,
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? '',
      model: request.model,
      providerId,
      latencyMs,
    };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      stream: false,
    }),
  });
  const latencyMs = Math.round(performance.now() - start);
  if (!res.ok) throw new Error(`${provider.name} HTTP ${res.status}`);
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: request.model,
    providerId,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      totalTokens: data.usage.total_tokens ?? 0,
    } : undefined,
    latencyMs,
  };
}
