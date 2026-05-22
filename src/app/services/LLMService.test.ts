import { describe, expect, it } from 'vitest';

import {
  getProvider,
  getProviderConfigs,
  hasApiKey,
  type ProviderId,
} from '@/app/services/LLMService';

describe('LLMService', () => {
  describe('Provider configs', () => {
    it('should have 4 providers', () => {
      const configs = getProviderConfigs();
      expect(configs).toHaveLength(4);
      const ids = configs.map(c => c.id);
      expect(ids).toContain('ollama');
      expect(ids).toContain('zhipu');
      expect(ids).toContain('openai');
      expect(ids).toContain('anthropic');
    });

    it('should get provider by id', () => {
      const ollama = getProvider('ollama');
      expect(ollama).toBeDefined();
      expect(ollama!.name).toBe('Ollama (本地)');
      expect(ollama!.authType).toBe('none');
      expect(ollama!.baseUrl).toBe('http://localhost:11434');
    });

    it('should return undefined for unknown provider', () => {
      expect(getProvider('unknown' as ProviderId)).toBeUndefined();
    });

    it('ollama should have models', () => {
      const ollama = getProvider('ollama');
      expect(ollama!.models.length).toBeGreaterThan(0);
      const modelIds = ollama!.models.map(m => m.id);
      expect(modelIds.some(id => id.includes('qwen'))).toBe(true);
    });

    it('zhipu should have GLM models', () => {
      const zhipu = getProvider('zhipu');
      expect(zhipu).toBeDefined();
      expect(zhipu!.models.some(m => m.id.includes('glm'))).toBe(true);
    });

    it('openai should have GPT models', () => {
      const openai = getProvider('openai');
      expect(openai).toBeDefined();
      expect(openai!.models.some(m => m.id.includes('gpt'))).toBe(true);
    });

    it('anthropic should have Claude models', () => {
      const anthropic = getProvider('anthropic');
      expect(anthropic).toBeDefined();
      expect(anthropic!.models.some(m => m.id.includes('claude'))).toBe(true);
    });
  });

  describe('API key management', () => {
    it('ollama should always have key (authType none)', () => {
      expect(hasApiKey('ollama')).toBe(true);
    });

    it('should check key for auth-required providers', () => {
      const hasOpenAIKey = hasApiKey('openai');
      expect(typeof hasOpenAIKey).toBe('boolean');
    });
  });
});
