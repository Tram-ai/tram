/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple i18n module for core package.
 * Provides a `tt` (tool-translate) function that translates tool output messages.
 * The CLI package should call `setCoreTranslations()` at startup to inject
 * locale-specific translations.
 */

type TranslationMap = Record<string, string>;

let translations: TranslationMap = {};

/**
 * Set translations for the core package.
 * Called by the CLI package during initialization.
 */
export function setCoreTranslations(map: TranslationMap): void {
  translations = { ...map };
}

/**
 * Translate a tool output string with optional parameter substitution.
 * Falls back to the key itself if no translation is found.
 * 
 * @param key - The translation key (also serves as the English fallback)
 * @param params - Optional parameters for interpolation (e.g., { name: 'myService' })
 * @returns Translated string
 */
export function tt(key: string, params?: Record<string, string | number | boolean>): string {
  let result = translations[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(
        new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'),
        String(paramValue),
      );
    }
  }

  return result;
}
