'use client';

import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false
}: ToggleSwitchProps) {
  return (
    <div 
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        checked 
          ? 'bg-blue-50/70 border-[var(--color-blue-jobz)] shadow-sm' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex-1 pr-4">
        {label && <div className="text-sm font-semibold text-gray-900">{label}</div>}
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>

      <div className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
        checked ? 'bg-[var(--color-blue-jobz)]' : 'bg-gray-200'
      }`}>
        <span 
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-y-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`} 
        />
      </div>
    </div>
  );
}
