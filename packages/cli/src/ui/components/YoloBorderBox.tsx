/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box } from 'ink';
import { theme } from '../semantic-colors.js';

interface YoloBorderBoxProps {
  children: React.ReactNode;
  /** Width of the content area (unused, kept for API compat) */
  width?: number;
  /** Whether YOLO styling is active (changes border color only) */
  active: boolean;
  /** Base border color (for non-highlighted segments) */
  baseBorderColor?: string;
}

/**
 * A simple Box wrapper with round top/bottom borders.
 * When `active`, uses the error-dim border color; otherwise uses the base color.
 */
export const YoloBorderBox: React.FC<YoloBorderBoxProps> = ({
  children,
  active,
  baseBorderColor,
}) => {
  const borderColor = active
    ? theme.status.errorDim
    : (baseBorderColor ?? theme.border.default);

  return (
    <Box
      borderStyle="round"
      borderTop
      borderBottom
      borderLeft={false}
      borderRight={false}
      borderColor={borderColor}
    >
      {children}
    </Box>
  );
};
