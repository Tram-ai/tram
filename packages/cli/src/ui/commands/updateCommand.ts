/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';
import { checkForUpdates } from '../utils/updateCheck.js';
import { t } from '../../i18n/index.js';

export const updateCommand: SlashCommand = {
  name: 'update',
  altNames: ['check-update'],
  get description() {
    return t('check for updates');
  },
  kind: CommandKind.BUILT_IN,
  action: async (context) => {
    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: t('Checking for updates...'),
      },
      Date.now(),
    );

    try {
      const updateInfo = await checkForUpdates();
      if (updateInfo) {
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: updateInfo.message,
          },
          Date.now(),
        );
      } else {
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: t('You are running the latest version.'),
          },
          Date.now(),
        );
      }
    } catch (err) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: t('Failed to check for updates: ') + String(err),
        },
        Date.now(),
      );
    }
  },
};
