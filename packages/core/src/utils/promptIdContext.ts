/**
 * @license
 * Copyright 2025 TRAM Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from "node:async_hooks";

export const promptIdContext = new AsyncLocalStorage<string>();
