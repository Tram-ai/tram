/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  SlashCommand,
  CommandContext,
  OpenDialogActionReturn,
  MessageActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { t } from '../../i18n/index.js';

export const modelCommand: SlashCommand = {
  name: 'model',
  get description() {
    return t('Switch the model for this session');
  },
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
  ): Promise<OpenDialogActionReturn | MessageActionReturn> => {
    const { services } = context;
    const { config } = services;

    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: t('Configuration not available.'),
      };
    }

    const configuredModels = config.getAllConfiguredModels();
    if (!configuredModels || configuredModels.length === 0) {
      return {
        type: 'message',
        messageType: 'error',
        content: t(
          'Please run tram --initialize to configure providers and authentication.',
        ),
      };
    }

    return {
      type: 'dialog',
      dialog: 'model',
    };
  },
};
