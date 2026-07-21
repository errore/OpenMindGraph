import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { db } from '../persistence/db';

export interface LLMSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  llmEndpoint: string;
  apiKey: string;
  loaded: boolean;
}

const DEFAULTS: Omit<LLMSettings, 'loaded'> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful assistant.',
  llmEndpoint: '',
  apiKey: '',
};

interface SettingsState extends LLMSettings {
  loadSettings: () => Promise<void>;
  saveSettings: (partial: Partial<Omit<LLMSettings, 'loaded'>>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

async function pushToBackend(settings: { llmEndpoint: string; apiKey: string }) {
  try {
    await invoke('put_llm_config', {
      payload: {
        llm_endpoint: settings.llmEndpoint,
        api_key: settings.apiKey,
      },
    });
  } catch {
    // backend not available — settings persist in IndexedDB
  }
}

interface BackendConfig {
  llm_endpoint: string;
  api_key_configured: boolean;
}

async function fetchFromBackend(): Promise<BackendConfig | null> {
  try {
    return await invoke<BackendConfig>('get_llm_config');
  } catch {
    return null;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadSettings: async () => {
    try {
      const row = await db.settings.get('default');
      if (row) {
        set({
          model: row.model ?? DEFAULTS.model,
          temperature: row.temperature ?? DEFAULTS.temperature,
          maxTokens: row.maxTokens ?? DEFAULTS.maxTokens,
          systemPrompt: row.systemPrompt ?? DEFAULTS.systemPrompt,
          llmEndpoint: row.llmEndpoint ?? DEFAULTS.llmEndpoint,
          apiKey: row.apiKey ?? DEFAULTS.apiKey,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveSettings: async (partial) => {
    set(partial);
    const state = get();
    try {
      await db.settings.put({
        id: 'default',
        model: state.model,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        systemPrompt: state.systemPrompt,
        llmEndpoint: state.llmEndpoint,
        apiKey: state.apiKey,
        updatedAt: Date.now(),
      });
    } catch {
      // IndexedDB save failed silently — settings are still in memory
    }

    await pushToBackend({
      llmEndpoint: state.llmEndpoint,
      apiKey: state.apiKey,
    });
  },

  resetSettings: async () => {
    set(DEFAULTS);
    try {
      await db.settings.put({
        id: 'default',
        ...DEFAULTS,
        updatedAt: Date.now(),
      });
    } catch {
      // IndexedDB save failed silently
    }

    await pushToBackend({
      llmEndpoint: DEFAULTS.llmEndpoint,
      apiKey: DEFAULTS.apiKey,
    });
  },
}));

export { fetchFromBackend };
