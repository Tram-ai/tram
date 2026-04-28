/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import {
  AuthType,
  tramOAuth2Events,
  TramOAuth2Event,
  type DeviceAuthorizationData,
} from "@tram-ai/tram-core";

export interface TramAuthState {
  deviceAuth: DeviceAuthorizationData | null;
  authStatus:
    | "idle"
    | "polling"
    | "success"
    | "error"
    | "timeout"
    | "rate_limit";
  authMessage: string | null;
}

export const useTramAuth = (
  pendingAuthType: AuthType | undefined,
  isAuthenticating: boolean,
) => {
  const [TramAuthState, setTramAuthState] = useState<TramAuthState>({
    deviceAuth: null,
    authStatus: "idle",
    authMessage: null,
  });

  const isTramAuth = pendingAuthType === AuthType.TRAM_OAUTH;

  // Set up event listeners when authentication starts
  useEffect(() => {
    if (!isTramAuth || !isAuthenticating) {
      // Reset state when not authenticating or not TRAM auth
      setTramAuthState({
        deviceAuth: null,
        authStatus: "idle",
        authMessage: null,
      });
      return;
    }

    setTramAuthState((prev) => ({
      ...prev,
      authStatus: "idle",
    }));

    // Set up event listeners
    const handleDeviceAuth = (deviceAuth: DeviceAuthorizationData) => {
      setTramAuthState((prev) => ({
        ...prev,
        deviceAuth: {
          verification_uri: deviceAuth.verification_uri,
          verification_uri_complete: deviceAuth.verification_uri_complete,
          user_code: deviceAuth.user_code,
          expires_in: deviceAuth.expires_in,
          device_code: deviceAuth.device_code,
        },
        authStatus: "polling",
      }));
    };

    const handleAuthProgress = (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => {
      setTramAuthState((prev) => ({
        ...prev,
        authStatus: status,
        authMessage: message || null,
      }));
    };

    // Add event listeners
    tramOAuth2Events.on(TramOAuth2Event.AuthUri, handleDeviceAuth);
    tramOAuth2Events.on(TramOAuth2Event.AuthProgress, handleAuthProgress);

    // Cleanup event listeners when component unmounts or auth finishes
    return () => {
      tramOAuth2Events.off(TramOAuth2Event.AuthUri, handleDeviceAuth);
      tramOAuth2Events.off(TramOAuth2Event.AuthProgress, handleAuthProgress);
    };
  }, [isTramAuth, isAuthenticating]);

  const cancelTramAuth = useCallback(() => {
    // Emit cancel event to stop polling
    tramOAuth2Events.emit(TramOAuth2Event.AuthCancel);

    setTramAuthState({
      deviceAuth: null,
      authStatus: "idle",
      authMessage: null,
    });
  }, []);

  return {
    TramAuthState,
    cancelTramAuth,
  };
};
