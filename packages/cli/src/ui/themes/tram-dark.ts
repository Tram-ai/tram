/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from "./theme.js";
import { darkSemanticColors } from "./semantic-tokens.js";

const tramDarkColors: ColorsTheme = {
  type: "dark",
  Background: "#0b0e14",
  Foreground: "#bfbdb6",
  LightBlue: "#59C2FF",
  AccentBlue: "#39BAE6",
  AccentPurple: "#D2A6FF",
  AccentCyan: "#95E6CB",
  AccentGreen: "#AAD94C",
  AccentYellow: "#FFD700",
  AccentRed: "#F26D78",
  AccentYellowDim: "#8B7530",
  AccentRedDim: "#8B3A4A",
  DiffAdded: "#AAD94C",
  DiffRemoved: "#F26D78",
  Comment: "#646A71",
  Gray: "#3D4149",
  GradientColors: ["#FFD700", "#da7959"],
};

export const TramDark: Theme = new Theme(
  "TRAM Dark",
  "dark",
  {
    hljs: {
      display: "block",
      overflowX: "auto",
      padding: "0.5em",
      background: tramDarkColors.Background,
      color: tramDarkColors.Foreground,
    },
    "hljs-keyword": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-literal": {
      color: tramDarkColors.AccentPurple,
    },
    "hljs-symbol": {
      color: tramDarkColors.AccentCyan,
    },
    "hljs-name": {
      color: tramDarkColors.LightBlue,
    },
    "hljs-link": {
      color: tramDarkColors.AccentBlue,
    },
    "hljs-function .hljs-keyword": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-subst": {
      color: tramDarkColors.Foreground,
    },
    "hljs-string": {
      color: tramDarkColors.AccentGreen,
    },
    "hljs-title": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-type": {
      color: tramDarkColors.AccentBlue,
    },
    "hljs-attribute": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-bullet": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-addition": {
      color: tramDarkColors.AccentGreen,
    },
    "hljs-variable": {
      color: tramDarkColors.Foreground,
    },
    "hljs-template-tag": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-template-variable": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-comment": {
      color: tramDarkColors.Comment,
      fontStyle: "italic",
    },
    "hljs-quote": {
      color: tramDarkColors.AccentCyan,
      fontStyle: "italic",
    },
    "hljs-deletion": {
      color: tramDarkColors.AccentRed,
    },
    "hljs-meta": {
      color: tramDarkColors.AccentYellow,
    },
    "hljs-doctag": {
      fontWeight: "bold",
    },
    "hljs-strong": {
      fontWeight: "bold",
    },
    "hljs-emphasis": {
      fontStyle: "italic",
    },
  },
  tramDarkColors,
  darkSemanticColors,
);
