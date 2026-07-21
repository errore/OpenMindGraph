import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore, fetchFromBackend } from '../store/settingsStore';
import { Slider } from '../components/Slider';
import './SettingsModal.css';

interface Props {
  onClose: () => void;
}

interface ModelsResult {
  models: string[];
  error?: string;
  usable: boolean;
}

export function SettingsModal({ onClose }: Props) {
  const {
    model,
    temperature,
    maxTokens,
    systemPrompt,
    llmEndpoint,
    apiKey,
    saveSettings,
    resetSettings,
  } = useSettingsStore();

  const [localModel, setLocalModel] = useState(model);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localEndpoint, setLocalEndpoint] = useState(llmEndpoint);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'configured' | 'missing'>('checking');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState('');
  const modelListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalModel(model);
    setLocalTemp(temperature);
    setLocalMaxTokens(maxTokens);
    setLocalSystemPrompt(systemPrompt);
    setLocalEndpoint(llmEndpoint);
    setLocalApiKey(apiKey);
  }, [model, temperature, maxTokens, systemPrompt, llmEndpoint, apiKey]);

  useEffect(() => {
    async function checkStatus() {
      setApiKeyStatus('checking');
      const cfg = await fetchFromBackend();
      if (cfg) {
        setBackendOnline(true);
        setApiKeyStatus(cfg.api_key_configured ? 'configured' : 'missing');
      } else {
        setBackendOnline(false);
        setApiKeyStatus(apiKey ? 'configured' : 'missing');
      }
    }
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modelListRef.current && !modelListRef.current.contains(e.target as Element)) {
        setAvailableModels([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleFetchModels = useCallback(async () => {
    if (!localEndpoint.trim()) return;
    setFetchingModels(true);
    setFetchError('');
    setAvailableModels([]);
    try {
      const data = await invoke<ModelsResult>('list_models', {
        endpoint: localEndpoint.trim(),
      });
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
      } else {
        setFetchError(data.error || 'No models found');
      }
    } catch (err) {
      setFetchError(`Failed: ${err}`);
    } finally {
      setFetchingModels(false);
    }
  }, [localEndpoint]);

  const handleSave = useCallback(() => {
    saveSettings({
      model: localModel,
      temperature: localTemp,
      maxTokens: localMaxTokens,
      systemPrompt: localSystemPrompt,
      llmEndpoint: localEndpoint,
      apiKey: localApiKey,
    });
    onClose();
  }, [localModel, localTemp, localMaxTokens, localSystemPrompt, localEndpoint, localApiKey, saveSettings, onClose]);

  const handleReset = useCallback(() => {
    resetSettings();
    onClose();
  }, [resetSettings, onClose]);

  return (
    <div className="sm-overlay">
      <div className="sm-panel">
        <div className="sm-header">
          <span className="sm-title">Settings</span>
          <button className="sm-close-btn" onClick={onClose}>x</button>
        </div>

        <div className="sm-body">
          <div className="sm-section-label">LLM Connection</div>

          <label className="sm-field">
            <span className="sm-label">Endpoint URL</span>
            <input
              className="sm-input"
              type="text"
              value={localEndpoint}
              onChange={(e) => setLocalEndpoint(e.target.value)}
              placeholder="e.g. https://api.openai.com/v1"
            />
          </label>

          <label className="sm-field">
            <span className="sm-label">API Key</span>
            <div className="sm-input-row">
              <input
                className="sm-input sm-input-flex"
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="sm-toggle-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="sm-api-status">
            {apiKeyStatus === 'checking' && (
              <span className="sm-api-badge sm-api-loading">Checking...</span>
            )}
            {apiKeyStatus === 'configured' && (
              <span className="sm-api-badge sm-api-ok">
                API Key Configured{backendOnline === false ? ' (local)' : ''}
              </span>
            )}
            {apiKeyStatus === 'missing' && (
              <span className="sm-api-badge sm-api-missing">
                No API Key — enter one above or set LITELLM_API_KEY env var
              </span>
            )}
          </div>

          <div className="sm-divider" />

          <div className="sm-section-label">Model Settings</div>

          <label className="sm-field">
            <span className="sm-label">Model</span>
            <div className="sm-input-row">
              <input
                className="sm-input sm-input-flex"
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
              <button
                className="sm-toggle-btn"
                onClick={handleFetchModels}
                disabled={!localEndpoint.trim() || fetchingModels}
                title={localEndpoint.trim() ? 'Fetch available models from endpoint' : 'Set an endpoint URL first'}
              >
                {fetchingModels ? '...' : 'Fetch'}
              </button>
            </div>
            {fetchError && <span className="sm-field-hint sm-field-error">{fetchError}</span>}
            {availableModels.length > 0 && (
              <div className="sm-model-list" ref={modelListRef}>
                {availableModels.map((m) => (
                  <button
                    key={m}
                    className="sm-model-item"
                    onClick={() => {
                      setLocalModel(m);
                      setAvailableModels([]);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className="sm-field">
            <span className="sm-label">
              Temperature <span className="sm-value-hint">{localTemp.toFixed(2)}</span>
            </span>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={localTemp}
              onChange={setLocalTemp}
            />
          </label>

          <label className="sm-field">
            <span className="sm-label">Max Tokens</span>
            <input
              className="sm-input"
              type="number"
              min="1"
              max="128000"
              value={localMaxTokens}
              onChange={(e) => setLocalMaxTokens(parseInt(e.target.value, 10) || 2048)}
            />
          </label>

          <label className="sm-field">
            <span className="sm-label">System Prompt</span>
            <textarea
              className="sm-textarea"
              rows={4}
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
            />
          </label>
        </div>

        <div className="sm-footer">
          <button className="sm-btn sm-btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="sm-btn sm-btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
