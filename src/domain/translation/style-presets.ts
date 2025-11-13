export const STYLE_PRESETS = {
  formal: { label: 'Formal', values: { formal: 0.7, slang: 0.1, idioms: 0.2 } },
  balanced: { label: 'Balanced', values: { formal: 0.4, slang: 0.3, idioms: 0.3 } },
  informal: { label: 'Informal', values: { formal: 0.2, slang: 0.5, idioms: 0.3 } },
} as const;

export type StylePresetKey = keyof typeof STYLE_PRESETS;
