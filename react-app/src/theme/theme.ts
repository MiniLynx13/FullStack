import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

export const theme = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Основная цветовая палитра (только синие оттенки)
        blue: {
          50: { value: '#eff6ff' },
          100: { value: '#dbeafe' },
          200: { value: '#bfdbfe' },
          300: { value: '#93c5fd' },
          400: { value: '#60a5fa' },
          500: { value: '#3b82f6' },
          600: { value: '#2563eb' },
          700: { value: '#1d4ed8' },
          800: { value: '#1e40af' },
          900: { value: '#1e3a8a' },
          950: { value: '#172554' },
        },
        // Желтые и оранжевые оттенки для предупреждений/ошибок
        yellow: {
          50: { value: '#fefce8' },
          100: { value: '#fef9c3' },
          200: { value: '#fef08a' },
          300: { value: '#fde047' },
          400: { value: '#facc15' },
          500: { value: '#eab308' },
          600: { value: '#ca8a04' },
          700: { value: '#a16207' },
          800: { value: '#854d0e' },
          900: { value: '#713f12' },
        },
        orange: {
          50: { value: '#fff7ed' },
          100: { value: '#ffedd5' },
          200: { value: '#fed7aa' },
          300: { value: '#fdba74' },
          400: { value: '#fb923c' },
          500: { value: '#f97316' },
          600: { value: '#ea580c' },
          700: { value: '#c2410c' },
          800: { value: '#9a3412' },
          900: { value: '#7c2d12' },
        },
        // Серые оттенки (на основе синих)
        gray: {
          50: { value: '#f8fafc' },
          100: { value: '#f1f5f9' },
          200: { value: '#e2e8f0' },
          300: { value: '#cbd5e1' },
          400: { value: '#94a3b8' },
          500: { value: '#64748b' },
          600: { value: '#475569' },
          700: { value: '#334155' },
          800: { value: '#1e293b' },
          900: { value: '#0f172a' },
        },
      },
      fonts: {
        heading: { value: 'system-ui, -apple-system, sans-serif' },
        body: { value: 'system-ui, -apple-system, sans-serif' },
        mono: { value: 'SFMono-Regular, Menlo, monospace' },
      },
    },
    semanticTokens: {
      colors: {
        // Семантические токены для использования в компонентах
        'bg.dark': { value: '{colors.blue.950}' },
        'bg.light': { value: '{colors.blue.50}' },
        'text.primary': { value: '{colors.blue.950}' },
        'text.secondary': { value: '{colors.blue.800}' },
        'text.light': { value: '{colors.blue.50}' },
        'primary.500': { value: '{colors.blue.500}' },
        'primary.600': { value: '{colors.blue.600}' },
        'primary.700': { value: '{colors.blue.700}' },
        // Цвета для ошибок/предупреждений
        'warning.bg': { value: '{colors.yellow.50}' },
        'warning.border': { value: '{colors.orange.300}' },
        'warning.text': { value: '{colors.orange.700}' },
        'warning.icon': { value: '{colors.orange.500}' },
        'error.bg': { value: '{colors.yellow.50}' },
        'error.border': { value: '{colors.orange.300}' },
        'error.text': { value: '{colors.orange.700}' },
        'error.icon': { value: '{colors.orange.500}' },
      },
    },
  },
});

// Создаём систему с нашей темой
export const system = createSystem(defaultConfig, theme);