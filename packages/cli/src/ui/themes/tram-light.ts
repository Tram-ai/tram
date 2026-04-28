/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ColorsTheme, Theme } from "./theme.js";
import { lightSemanticColors } from "./semantic-tokens.js";

const tramLightColors: ColorsTheme = {
  type: "light",
  Background: "#f8f9fa",
  Foreground: "#5c6166",
  LightBlue: "#55b4d4",
  AccentBlue: "#399ee6",
  AccentPurple: "#a37acc",
  AccentCyan: "#4cbf99",
  AccentGreen: "#86b300",
  AccentYellow: "#f2ae49",
  AccentRed: "#f07171",
  AccentYellowDim: "#8B7000",
  AccentRedDim: "#993333",
  DiffAdded: "#86b300",
  DiffRemoved: "#f07171",
  Comment: "#ABADB1",
  Gray: "#CCCFD3",
  GradientColors: ["#399ee6", "#86b300"],
};

export const TramLight: Theme = new Theme(
  "TRAM Light",
  "light",
  {
    hljs: {
      display: "block",
      overflowX: "auto",
      padding: "0.5em",
      background: tramLightColors.Background,
      color: tramLightColors.Foreground,
    },
    "hljs-comment": {
      color: tramLightColors.Comment,
      fontStyle: "italic",
    },
    "hljs-quote": {
      color: tramLightColors.AccentCyan,
      fontStyle: "italic",
    },
    "hljs-string": {
      color: tramLightColors.AccentGreen,
    },
    "hljs-constant": {
      color: tramLightColors.AccentCyan,
    },
    "hljs-number": {
      color: tramLightColors.AccentPurple,
    },
    "hljs-keyword": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-selector-tag": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-attribute": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-variable": {
      color: tramLightColors.Foreground,
    },
    "hljs-variable.language": {
      color: tramLightColors.LightBlue,
      fontStyle: "italic",
    },
    "hljs-title": {
      color: tramLightColors.AccentBlue,
    },
    "hljs-section": {
      color: tramLightColors.AccentGreen,
      fontWeight: "bold",
    },
    "hljs-type": {
      color: tramLightColors.LightBlue,
    },
    "hljs-class .hljs-title": {
      color: tramLightColors.AccentBlue,
    },
    "hljs-tag": {
      color: tramLightColors.LightBlue,
    },
    "hljs-name": {
      color: tramLightColors.AccentBlue,
    },
    "hljs-builtin-name": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-meta": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-symbol": {
      color: tramLightColors.AccentRed,
    },
    "hljs-bullet": {
      color: tramLightColors.AccentYellow,
    },
    "hljs-regexp": {
      color: tramLightColors.AccentCyan,
    },
    "hljs-link": {
      color: tramLightColors.LightBlue,
    },
    "hljs-deletion": {
      color: tramLightColors.AccentRed,
    },
    "hljs-addition": {
      color: tramLightColors.AccentGreen,
    },
    "hljs-emphasis": {
      fontStyle: "italic",
    },
    "hljs-strong": {
      fontWeight: "bold",
    },
    "hljs-literal": {
      color: tramLightColors.AccentCyan,
    },
    "hljs-built_in": {
      color: tramLightColors.AccentRed,
    },
    "hljs-doctag": {
      color: tramLightColors.AccentRed,
    },
    "hljs-template-variable": {
      color: tramLightColors.AccentCyan,
    },
    "hljs-selector-id": {
      color: tramLightColors.AccentRed,
    },
  },
  tramLightColors,
  lightSemanticColors,
);
