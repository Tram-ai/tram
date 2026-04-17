/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export interface UseInitializeDialogReturn {
  isInitializeDialogOpen: boolean;
  openInitializeDialog: () => void;
  closeInitializeDialog: () => void;
}

export const useInitializeDialog = (): UseInitializeDialogReturn => {
  const [isInitializeDialogOpen, setIsInitializeDialogOpen] = useState(false);

  const openInitializeDialog = useCallback(() => {
    setIsInitializeDialogOpen(true);
  }, []);

  const closeInitializeDialog = useCallback(() => {
    setIsInitializeDialogOpen(false);
  }, []);

  return {
    isInitializeDialogOpen,
    openInitializeDialog,
    closeInitializeDialog,
  };
};
