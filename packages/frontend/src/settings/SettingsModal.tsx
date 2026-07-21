import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import './SettingsModal.css';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { provider, model, temperature, maxTokens, systemPrompt, saveSettings, resetSettings } =
    useSettingsStore();

  const [localProvider, setLocalProvider] = useState(provider);
  const [localModel, setLocalModel] = useState(model);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'configured' | 'missing'>('checking');

  useEffect(() => {
    setLocalProvider(provider);
    setLocalModel(model);
    setLocalTemp(temperature);
    setLocalMaxTokens(maxTokens);
    setLocalSystemPrompt(systemPrompt);
  }, [provider, model, temperature, maxTokens, systemPrompt]);

  useEffect(() => {
    fetch('http://localhost:8001/health')
      .then((r) => r.json())
      .then(() => setApiKeyStatus('configured'))
      .catch(() => setApiKeyStatus('missing'));
  }, []);

  const handleSave = useCallback(() => {
    saveSettings({
      provider: localProvider,
      model: localModel,
      temperature: localTemp,
      maxTokens: localMaxTokens,
      systemPrompt: localSystemPrompt,
    });
    onClose();
  }, [localProvider, localModel, localTemp, localMaxTokens, localSystemPrompt, saveSettings, onClose]);

  const handleReset = useCallback(() => {
    resetSettings();
    onClose();
  }, [resetSettings, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div className="sm-overlay" onClick={handleOverlayClick}>
      <div className="sm-panel">
        <div className="sm-header">
          <span className="sm-title">Settings</span>
          <button className="sm-close-btn" onClick={onClose}>x</button>
        </div>

        <div className="sm-body">
          <label className="sm-field">
            <span className="sm-label">Provider</span>
            <select
              className="sm-input"
              value={localProvider}
              onChange={(e) => setLocalProvider(e.target.value)}
            >
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
              <option value="google">google</option>
              <option value="groq">groq</option>
              <option value="together_ai">together_ai</option>
            </select>
          </label>

          <label className="sm-field">
            <span className="sm-label">Model</span>
            <input
              className="sm-input"
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </label>

          <label className="sm-field">
            <span className="sm-label">
              Temperature <span className="sm-value-hint">{localTemp.toFixed(2)}</span>
            </span>
            <input
              className="sm-slider"
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={localTemp}
              onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
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

          <div className="sm-api-status">
            <span>API Key:</span>
            {apiKeyStatus === 'checking' && (
              <span className="sm-api-badge sm-api-loading">Checking...</span>
            )}
            {apiKeyStatus === 'configured' && (
              <span className="sm-api-badge sm-api-ok">Configured</span>
            )}
            {apiKeyStatus === 'missing' && (
              <span className="sm-api-badge sm-api-missing">
                Not configured (set LITELLM_API_KEY in .env)
              </span>
            )}
          </div>
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
