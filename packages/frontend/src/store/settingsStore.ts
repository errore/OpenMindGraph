import { create } from 'zustand';
import { db } from '../persistence/db';

export interface LLMSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  loaded: boolean;
}

const DEFAULTS: Omit<LLMSettings, 'loaded'> = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful assistant.',
};

interface SettingsState extends LLMSettings {
  loadSettings: () => Promise<void>;
  saveSettings: (partial: Partial<Omit<LLMSettings, 'loaded'>>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadSettings: async () => {
    try {
      const row = await db.settings.get('default');
      if (row) {
        set({
          provider: row.provider ?? DEFAULTS.provider,
          model: row.model ?? DEFAULTS.model,
          temperature: row.temperature ?? DEFAULTS.temperature,
          maxTokens: row.maxTokens ?? DEFAULTS.maxTokens,
          systemPrompt: row.systemPrompt ?? DEFAULTS.systemPrompt,
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
        provider: state.provider,
        model: state.model,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        systemPrompt: state.systemPrompt,
        updatedAt: Date.now(),
      });
    } catch {
      // IndexedDB save failed silently — settings are still in memory
    }
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
  },
}));
