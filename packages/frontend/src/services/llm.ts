import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
}

export interface ChatRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

interface ChatChunk {
  text: string;
  thought?: string;
}

export type StreamChunk =
  | { type: 'delta'; content: string }
  | { type: 'thought'; content: string };

export async function* chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
  const chunks: StreamChunk[] = [];
  let done = false;
  let wake: (() => void) | null = null;

  const unlisten: UnlistenFn = await listen<ChatChunk>('chat-chunk', (event) => {
    const { text, thought } = event.payload;
    if (text === '[DONE]') {
      done = true;
      wake?.();
      return;
    }
    if (thought) {
      chunks.push({ type: 'thought', content: thought });
    } else {
      chunks.push({ type: 'delta', content: text });
    }
    wake?.();
  });

  const invokePromise = invoke('chat_stream', {
    request: {
      messages: request.messages,
      model: request.model ?? 'gpt-4o-mini',
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      systemPrompt: request.system_prompt,
    },
  }).catch((err) => {
    chunks.push({ type: 'delta', content: `Error: ${String(err)}` });
    done = true;
    wake?.();
  });

  let index = 0;
  while (!done || index < chunks.length) {
    if (index < chunks.length) {
      yield chunks[index++];
    } else if (!done) {
      await new Promise<void>((r) => {
        wake = r;
      });
    }
  }

  await invokePromise;
  unlisten();
}
