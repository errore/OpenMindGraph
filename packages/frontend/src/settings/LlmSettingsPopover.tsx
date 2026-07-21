import { useState, useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Slider } from '../components/Slider';
import './LlmSettingsPopover.css';

interface Props {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  onChange: (values: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }) => void;
  onReset: () => void;
  onClose: () => void;
}

export function LlmSettingsPopover({
  model,
  temperature,
  maxTokens,
  systemPrompt,
  onChange,
  onReset,
  onClose,
}: Props) {
  const globalSettings = useSettingsStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [localModel, setLocalModel] = useState(model);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);

  useEffect(() => {
    setLocalModel(model);
    setLocalTemp(temperature);
    setLocalMaxTokens(maxTokens);
    setLocalSystemPrompt(systemPrompt);
  }, [model, temperature, maxTokens, systemPrompt]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Element)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleApply = useCallback(() => {
    onChange({
      model: localModel !== globalSettings.model ? localModel : undefined,
      temperature: localTemp !== globalSettings.temperature ? localTemp : undefined,
      maxTokens: localMaxTokens !== globalSettings.maxTokens ? localMaxTokens : undefined,
      systemPrompt: localSystemPrompt !== globalSettings.systemPrompt ? localSystemPrompt : undefined,
    });
    onClose();
  }, [localModel, localTemp, localMaxTokens, localSystemPrompt, onChange, onClose, globalSettings]);

  const handleReset = useCallback(() => {
    onReset();
    onClose();
  }, [onReset, onClose]);

  return (
    <div className="lsp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lsp-popover nodrag" ref={popoverRef}>
        <div className="lsp-header">
          <span className="lsp-title">LLM Settings</span>
          <button className="lsp-close" onClick={onClose}>x</button>
        </div>
        <div className="lsp-body">
          <label className="lsp-field">
            <span className="lsp-label">Model</span>
            <input
              className="lsp-input"
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
            />
          </label>
          <label className="lsp-field">
            <span className="lsp-label">
              Temp <span className="lsp-hint">{localTemp.toFixed(2)}</span>
            </span>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={localTemp}
              onChange={setLocalTemp}
            />
          </label>
          <label className="lsp-field">
            <span className="lsp-label">Max Tokens</span>
            <input
              className="lsp-input"
              type="number"
              min="1"
              max="128000"
              value={localMaxTokens}
              onChange={(e) => setLocalMaxTokens(parseInt(e.target.value, 10) || 2048)}
            />
          </label>
          <label className="lsp-field">
            <span className="lsp-label">System Prompt</span>
            <textarea
              className="lsp-textarea"
              rows={3}
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
            />
          </label>
        </div>
        <div className="lsp-footer">
          <button className="lsp-btn lsp-btn-reset" onClick={handleReset}>Use Global</button>
          <button className="lsp-btn lsp-btn-apply" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
