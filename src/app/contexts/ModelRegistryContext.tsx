/**
 * @file src/app/contexts/ModelRegistryContext.tsx
 * @description AI 模型注册中心 Context — 多提供商管理、模型选择、连通性检测、心跳监控
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-05-22
 * @status stable
 * @license MIT
 * @tags ai,model,registry,context,provider
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  detectOllama,
  getApiKey,
  getProviderConfigs,
  hasApiKey,
  setApiKey as storeApiKey,
  testModelConnectivity,
  type ProviderConfig,
  type ProviderId,
} from '@/app/services/LLMService';

export type ModelStatus = 'active' | 'offline' | 'checking' | 'error';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  providerId: ProviderId;
  type: string;
  status: ModelStatus;
  endpoint: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ConnectivityResult {
  status: 'idle' | 'testing' | 'success' | 'fail';
  latencyMs: number | null;
  error: string | null;
  timestamp: number;
}

interface ModelRegistryContextType {
  models: AIModel[];
  activeModelId: string | null;
  activeModel: AIModel | undefined;
  setActiveModelId: (id: string | null) => void;
  providers: ProviderConfig[];
  setProviderApiKey: (providerId: ProviderId, key: string) => void;
  getProviderApiKey: (providerId: ProviderId) => string;
  hasProviderKey: (providerId: ProviderId) => boolean;
  testConnectivity: (modelId: string) => Promise<ConnectivityResult>;
  connectivityResults: Record<string, ConnectivityResult>;
  ollamaStatus: 'checking' | 'available' | 'unavailable';
  recheckOllama: () => void;
  latencyHistory: { timestamp: number; latencyMs: number; modelId: string }[];
}

const ModelRegistryContext = createContext<ModelRegistryContextType | null>(null);

export function useModelRegistry() {
  const ctx = useContext(ModelRegistryContext);
  if (!ctx) throw new Error('useModelRegistry must be used within ModelRegistryProvider');
  return ctx;
}

export function useModelRegistryOptional() {
  return useContext(ModelRegistryContext);
}

function buildModels(providers: ProviderConfig[]): AIModel[] {
  const models: AIModel[] = [];
  for (const provider of providers) {
    for (const model of provider.models) {
      const key = provider.authType === 'none' || hasApiKey(provider.id);
      const detected = provider.id === 'ollama' ? provider.detected : true;
      models.push({
        id: `${provider.id}::${model.id}`,
        name: model.name,
        provider: provider.name,
        providerId: provider.id,
        type: model.type,
        status: key && detected ? 'active' : 'offline',
        endpoint: provider.baseUrl,
        modelId: model.id,
        maxTokens: model.maxTokens,
        temperature: model.type === 'code' ? 0.2 : 0.7,
      });
    }
  }
  return models;
}

export function ModelRegistryProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<ProviderConfig[]>(() => getProviderConfigs());
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [connectivityResults, setConnectivityResults] = useState<Record<string, ConnectivityResult>>({});
  const [latencyHistory, setLatencyHistory] = useState<{ timestamp: number; latencyMs: number; modelId: string }[]>([]);
  const ollamaChecked = useRef(false);

  const models = React.useMemo(() => buildModels(providers), [providers]);
  const activeModel = models.find(m => m.id === activeModelId);

  const setProviderApiKey = useCallback((providerId: ProviderId, key: string) => {
    storeApiKey(providerId, key);
    setProviders(prev => prev.map(p => {
      if (p.id !== providerId) return p;
      return { ...p };
    }));
  }, []);

  const getProviderApiKeyFn = useCallback((providerId: ProviderId) => getApiKey(providerId), []);
  const hasProviderKeyFn = useCallback((providerId: ProviderId) => hasApiKey(providerId), []);

  const testConnectivity = useCallback(async (modelFullId: string): Promise<ConnectivityResult> => {
    const model = models.find(m => m.id === modelFullId);
    if (!model) return { status: 'fail', latencyMs: null, error: 'Model not found', timestamp: Date.now() };

    setConnectivityResults(prev => ({ ...prev, [modelFullId]: { status: 'testing', latencyMs: null, error: null, timestamp: Date.now() } }));

    const result = await testModelConnectivity(model.providerId, model.modelId);
    const connResult: ConnectivityResult = {
      status: result.ok ? 'success' : 'fail',
      latencyMs: result.latencyMs,
      error: result.error,
      timestamp: Date.now(),
    };

    setConnectivityResults(prev => ({ ...prev, [modelFullId]: connResult }));

    if (result.ok && result.latencyMs > 0) {
      setLatencyHistory(prev => [...prev.slice(-49), { timestamp: Date.now(), latencyMs: result.latencyMs, modelId: modelFullId }]);
    }

    return connResult;
  }, [models]);

  const checkOllama = useCallback(async () => {
    setOllamaStatus('checking');
    const available = await detectOllama();
    setOllamaStatus(available ? 'available' : 'unavailable');
    setProviders(prev => prev.map(p => p.id === 'ollama' ? { ...p, detected: available } : p));
  }, []);

  useEffect(() => {
    if (!ollamaChecked.current) {
      ollamaChecked.current = true;
      checkOllama();
    }
  }, [checkOllama]);

  const value = React.useMemo<ModelRegistryContextType>(() => ({
    models,
    activeModelId,
    activeModel,
    setActiveModelId,
    providers,
    setProviderApiKey,
    getProviderApiKey: getProviderApiKeyFn,
    hasProviderKey: hasProviderKeyFn,
    testConnectivity,
    connectivityResults,
    ollamaStatus,
    recheckOllama: checkOllama,
    latencyHistory,
  }), [models, activeModelId, activeModel, providers, setProviderApiKey, getProviderApiKeyFn, hasProviderKeyFn, testConnectivity, connectivityResults, ollamaStatus, checkOllama, latencyHistory]);

  return (
    <ModelRegistryContext.Provider value={value}>
      {children}
    </ModelRegistryContext.Provider>
  );
}
