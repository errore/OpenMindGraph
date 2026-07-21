import './Slider.css';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({ value, min = 0, max = 1, step = 0.01, onChange, className }: SliderProps) {
  return (
    <input
      className={`omg-slider ${className ?? ''}`.trim()}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  );
}
