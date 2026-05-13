/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import { shortenPath, tildeifyPath } from "@tram-ai/tram-core";
import { theme } from "../semantic-colors.js";
import { shortAsciiLogo } from "./AsciiArt.js";
import { getAsciiArtWidth, getCachedStringWidth } from "../utils/textUtils.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { t } from "../../i18n/index.js";
import { getRenderableGradientColors } from "../utils/gradientUtils.js";
import { pickAsciiArtTier } from "../utils/customBanner.js";

/**
 * Auth display type for the Header component.
 * Simplified representation of authentication method shown to users.
 */
export enum AuthDisplayType {
  TRAM_OAUTH = "TRAM OAuth",
  CODING_PLAN = "Coding Plan",
  API_KEY = "API Key",
  UNKNOWN = "Unknown",
}

interface HeaderProps {
  /**
   * Width-aware override for the logo column. Each tier is a sanitized
   * ASCII string; the renderer picks `large` when it fits, then `small`,
   * then falls through to the default Qwen logo. Either tier may be
   * omitted: a missing tier simply skips that step.
   */
  customAsciiArt?: { small?: string; large?: string };
  /**
   * Sanitized replacement for the bold ">_ Qwen Code" title in the info
   * panel. The version suffix is always appended. When undefined or empty
   * the default title is used; the leading `>_` glyph is part of the
   * default brand and is dropped when a custom title is set.
   */
  customBannerTitle?: string;
  /**
   * Sanitized subtitle string rendered between the title and the
   * auth/model line. When undefined the existing blank spacer row is
   * preserved so unset users see the same layout as before.
   */
  customBannerSubtitle?: string;
  version: string;
  authDisplayType?: AuthDisplayType | string;
  model: string;
  workingDirectory: string;
}

export const Header: React.FC<HeaderProps> = ({
  customAsciiArt,
  customBannerTitle,
  customBannerSubtitle,
  version,
  authDisplayType,
  model,
  workingDirectory,
}) => {
  const { columns: terminalWidth } = useTerminalSize();

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

  // Two distinct fallback paths:
  //   - User supplied a custom tier and at least one tier fits → render that.
  //   - User supplied custom art but neither tier fits → hide the logo column.
  //     Falling back to the bundled TRAM logo here would silently undo a
  //     white-label deployment on narrow terminals.
  //   - User supplied no custom art → fall through to `shortAsciiLogo` and let
  //     the existing width gate decide whether to show or hide it.
  const hasCustomArt = Boolean(customAsciiArt?.small || customAsciiArt?.large);
  const customTier = pickAsciiArtTier(
    customAsciiArt?.small,
    customAsciiArt?.large,
    availableTerminalWidth,
    logoGap,
    minInfoPanelWidth,
    getAsciiArtWidth,
  );
  const displayLogo = customTier ?? (hasCustomArt ? "" : shortAsciiLogo);
  const logoWidth = getAsciiArtWidth(displayLogo);

  // TRAM: logo column is intentionally hidden. We keep the calculation
  // (displayLogo / logoWidth) so layout math stays consistent, but always
  // suppress rendering the logo.
  const autoShowLogo =
    displayLogo !== "" &&
    availableTerminalWidth >= logoWidth + logoGap + minInfoPanelWidth;
  const showLogo = false && autoShowLogo;

  // Calculate info panel width based on content width (auto-shrink)
  const tildeifiedPath = tildeifyPath(workingDirectory);
  const authModelText =
    formattedAuthType === AuthDisplayType.API_KEY
      ? model
      : `${formattedAuthType} | ${model}`;
  const modelHintText = ` ${t("(/model to change)")}`;

  // Calculate widths of content
  const pathWidth = getCachedStringWidth(tildeifiedPath);
  const authModelWidth = getCachedStringWidth(authModelText + modelHintText);
  const contentWidth = Math.max(pathWidth, authModelWidth);

  // Set info panel width based on content, with min/max bounds
  const minInfoPanelWidth_auto = Math.min(
    40,
    contentWidth + infoPanelChromeWidth,
  ); // Minimum readable
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
  const shortenedPath = shortenPath(
    tildeifiedPath,
    Math.max(3, infoPanelContentWidth),
  );
  const displayPath = shortenedPath;

  const gradientColors = getRenderableGradientColors(theme.ui.gradient, [
    theme.text.secondary,
    theme.text.link,
    theme.text.accent,
  ]);

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
            {gradientColors ? (
              <Gradient colors={gradientColors}>
                <Text>{displayLogo}</Text>
              </Gradient>
            ) : (
              <Text>{displayLogo}</Text>
            )}
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
        {/* Title line: customBannerTitle (already sanitized) or the default
            ">_ TRAM Cli" brand. Version suffix is always appended. */}
        <Text>
          <Text bold color={theme.text.accent}>
            {customBannerTitle ? customBannerTitle : ">_ TRAM Cli"}
          </Text>
          <Text color={theme.text.secondary}> (v{version})</Text>
        </Text>
        {/* Subtitle (when set) replaces the blank spacer row. We always
            emit a row here so the auth/model line stays at the same
            vertical position regardless of whether the subtitle is set. */}
        {customBannerSubtitle ? (
          <Text color={theme.text.secondary}>{customBannerSubtitle}</Text>
        ) : (
          <Text> </Text>
        )}
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
