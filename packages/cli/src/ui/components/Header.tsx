/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { shortenPath, tildeifyPath } from '@tram-ai/tram-core';
import { theme } from '../semantic-colors.js';
import { shortAsciiLogo } from './AsciiArt.js';
import { getAsciiArtWidth, getCachedStringWidth } from '../utils/textUtils.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { t } from '../../i18n/index.js';

/**
 * Auth display type for the Header component.
 * Simplified representation of authentication method shown to users.
 */
export enum AuthDisplayType {
  TRAM_OAUTH = 'TRAM OAuth',
  CODING_PLAN = 'Coding Plan',
  API_KEY = 'API Key',
  UNKNOWN = 'Unknown',
}

interface HeaderProps {
  customAsciiArt?: string; // For user-defined ASCII art
  version: string;
  authDisplayType?: AuthDisplayType;
  model: string;
  workingDirectory: string;
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  version,
  authDisplayType,
  model,
  workingDirectory,
}) => {
  const { columns: terminalWidth } = useTerminalSize();

  const displayLogo = customAsciiArt ?? shortAsciiLogo;
  const logoWidth = getAsciiArtWidth(displayLogo);
  const formattedAuthType = authDisplayType ?? AuthDisplayType.UNKNOWN;

  // Calculate available space properly:
  // First determine if logo can be shown, then use remaining space for path
  const containerMarginLeft = 0;
  const containerMarginRight = 2;
  const logoGap = 2; // Gap between logo and info panel
  const infoPanelPaddingLeft = 1;
  const infoPanelPaddingRight = 1;
  const infoPanelBorderWidth = 2; // left + right border
  const infoPanelChromeWidth =
    infoPanelBorderWidth + infoPanelPaddingLeft + infoPanelPaddingRight;
  const minPathLength = 40; // Minimum readable path length
  const minInfoPanelWidth = minPathLength + infoPanelChromeWidth;

  const availableTerminalWidth = Math.max(
    0,
    terminalWidth - containerMarginLeft - containerMarginRight,
  );

  // Check if we have enough space for logo + gap + minimum info panel
const autoShowLogo = availableTerminalWidth >= logoWidth + logoGap + minInfoPanelWidth;
const showLogo = false && autoShowLogo;
  
  // Calculate info panel width based on content width (auto-shrink)
  const tildeifiedPath = tildeifyPath(workingDirectory);
  const authModelText =
    formattedAuthType === AuthDisplayType.API_KEY ? model : `${formattedAuthType} | ${model}`;
  const modelHintText = ` ${t('(/model to change)')}`;
  
  // Calculate widths of content
  const pathWidth = getCachedStringWidth(tildeifiedPath);
  const authModelWidth = getCachedStringWidth(authModelText + modelHintText);
  const contentWidth = Math.max(pathWidth, authModelWidth);
  
  // Set info panel width based on content, with min/max bounds
  const minInfoPanelWidth_auto = Math.min(40, contentWidth + infoPanelChromeWidth); // Minimum readable
  const maxInfoPanelWidth = Math.min(80, availableTerminalWidth); // Maximum reasonable width
  const contentBasedWidth = contentWidth + infoPanelChromeWidth;
  
  let availableInfoPanelWidth = Math.max(
    minInfoPanelWidth_auto,
    Math.min(contentBasedWidth, maxInfoPanelWidth),
  );
  
  if (showLogo) {
    availableInfoPanelWidth = Math.min(
      availableInfoPanelWidth,
      availableTerminalWidth - logoWidth - logoGap,
    );
  }

  // Calculate content display width based on info panel
  const infoPanelContentWidth = Math.max(
    0,
    availableInfoPanelWidth - infoPanelChromeWidth,
  );
  const showModelHint =
    infoPanelContentWidth > 0 &&
    getCachedStringWidth(authModelText + modelHintText) <=
      infoPanelContentWidth;

  // Shorten path if needed to fit
  const shortenedPath = shortenPath(tildeifiedPath, Math.max(3, infoPanelContentWidth));
  const displayPath = shortenedPath;

  // Use theme gradient colors if available, otherwise use text colors (excluding primary)
  const gradientColors = theme.ui.gradient || [
    theme.text.secondary,
    theme.text.link,
    theme.text.accent,
  ];

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      marginLeft={containerMarginLeft}
      marginRight={containerMarginRight}
      width={availableTerminalWidth}
    >
      {/* Left side: ASCII logo (only if enough space) */}
      {showLogo && (
        <>
          <Box flexShrink={0}>
            <Gradient colors={gradientColors}>
              <Text>{displayLogo}</Text>
            </Gradient>
          </Box>
          {/* Fixed gap between logo and info panel */}
          <Box width={logoGap} />
        </>
      )}

      {/* Right side: Info panel (width based on content) */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.border.default}
        paddingLeft={infoPanelPaddingLeft}
        paddingRight={infoPanelPaddingRight}
        width={availableInfoPanelWidth}
      >
        {/* Title line: >_ TRAM (v{version}) color={theme.text.accent} */ }
        <Text>
          <Text bold >
            &gt;_ TRAM Cli
          </Text>
          <Text color={theme.text.secondary}> (v{version})</Text>
        </Text>
        {/* Empty line for spacing */}
        <Text> </Text>
        {/* Auth and Model line */}
        <Text>
          <Text color={theme.text.secondary}>{authModelText}</Text>
          {showModelHint && (
            <Text color={theme.text.secondary}>{modelHintText}</Text>
          )}
        </Text>
        {/* Directory line */}
        <Text color={theme.text.secondary}>{displayPath}</Text>
      </Box>
    </Box>
  );
};
