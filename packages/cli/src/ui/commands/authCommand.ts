/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { t } from '../../i18n/index.js';

export const authCommand: SlashCommand = {
  name: 'auth',
  altNames: ['login'],
  get description() {
    return t('Open the initialization wizard to configure providers and authentication');
  },
  kind: CommandKind.BUILT_IN,
  action: () => ({
    type: 'dialog',
    dialog: 'initialize',
  }),
};
