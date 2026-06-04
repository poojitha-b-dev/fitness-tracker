// src/components/NumericInput.tsx
// Fixes issue #16: default value of 0 blocks typing.
// Shows empty string when value is 0 so user can type freely.
// Falls back to 0 on blur if left empty.

import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value, onChange, placeholder, min, max, step, className, style, disabled,
}) => {
  // Show empty string instead of "0" so user can type without deleting first
  const [display, setDisplay] = useState<string>(value === 0 ? '' : String(value));

  // Keep in sync if parent updates the value externally
  useEffect(() => {
    setDisplay(value === 0 ? '' : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, one decimal point, negative for min < 0
    if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) {
      setDisplay(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
        const final   = min !== undefined ? Math.max(clamped, min) : clamped;
        onChange(final);
      } else if (raw === '' || raw === '-') {
        onChange(0);
      }
    }
  };

  const handleBlur = () => {
    // If left empty, reset display to '' and value to 0
    if (display === '' || display === '-') {
      setDisplay('');
      onChange(0);
    } else {
      // Normalise display to parsed value
      const parsed = parseFloat(display);
      if (!isNaN(parsed)) setDisplay(String(parsed));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder ?? '0'}
      disabled={disabled}
      className={className}
      style={style}
    />
  );
};

export default NumericInput;
