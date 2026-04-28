/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { DeviceAuthorizationData } from "@tram-ai/tram-core";
import { useTramAuth } from "./useTramAuth.js";
import {
  AuthType,
  tramOAuth2Events,
  TramOAuth2Event,
} from "@tram-ai/tram-core";

// Mock the tramOAuth2Events
vi.mock("@tram-ai/tram-core", async () => {
  const actual = await vi.importActual("@tram-ai/tram-core");
  const mockEmitter = {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnThis(),
  };
  return {
    ...actual,
    tramOAuth2Events: mockEmitter,
    TramOAuth2Event: {
      AuthUri: "authUri",
      AuthProgress: "authProgress",
    },
  };
});

const mockTramOAuth2Events = vi.mocked(tramOAuth2Events);

describe("useTramAuth", () => {
  const mockDeviceAuth: DeviceAuthorizationData = {
    verification_uri: "https://oauth.tram.com/device",
    verification_uri_complete: "https://oauth.tram.com/device?user_code=ABC123",
    user_code: "ABC123",
    expires_in: 1800,
    device_code: "device_code_123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state when not TRAM auth", () => {
    const { result } = renderHook(() =>
      useTramAuth(AuthType.USE_GEMINI, false),
    );

    expect(result.current.TramAuthState).toEqual({
      deviceAuth: null,
      authStatus: "idle",
      authMessage: null,
    });
    expect(result.current.cancelTramAuth).toBeInstanceOf(Function);
  });

  it("should initialize with default state when TRAM auth but not authenticating", () => {
    const { result } = renderHook(() =>
      useTramAuth(AuthType.TRAM_OAUTH, false),
    );

    expect(result.current.TramAuthState).toEqual({
      deviceAuth: null,
      authStatus: "idle",
      authMessage: null,
    });
    expect(result.current.cancelTramAuth).toBeInstanceOf(Function);
  });

  it("should set up event listeners when TRAM auth and authenticating", () => {
    renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    expect(mockTramOAuth2Events.on).toHaveBeenCalledWith(
      TramOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockTramOAuth2Events.on).toHaveBeenCalledWith(
      TramOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it("should handle device auth event", () => {
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationData) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.TramAuthState.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.TramAuthState.authStatus).toBe("polling");
  });

  it("should handle auth progress event - success", () => {
    let handleAuthProgress: (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleAuthProgress!("success", "Authentication successful!");
    });

    expect(result.current.TramAuthState.authStatus).toBe("success");
    expect(result.current.TramAuthState.authMessage).toBe(
      "Authentication successful!",
    );
  });

  it("should handle auth progress event - error", () => {
    let handleAuthProgress: (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleAuthProgress!("error", "Authentication failed");
    });

    expect(result.current.TramAuthState.authStatus).toBe("error");
    expect(result.current.TramAuthState.authMessage).toBe(
      "Authentication failed",
    );
  });

  it("should handle auth progress event - polling", () => {
    let handleAuthProgress: (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleAuthProgress!("polling", "Waiting for user authorization...");
    });

    expect(result.current.TramAuthState.authStatus).toBe("polling");
    expect(result.current.TramAuthState.authMessage).toBe(
      "Waiting for user authorization...",
    );
  });

  it("should handle auth progress event - rate_limit", () => {
    let handleAuthProgress: (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleAuthProgress!(
        "rate_limit",
        "Too many requests. The server is rate limiting our requests. Please select a different authentication method or try again later.",
      );
    });

    expect(result.current.TramAuthState.authStatus).toBe("rate_limit");
    expect(result.current.TramAuthState.authMessage).toBe(
      "Too many requests. The server is rate limiting our requests. Please select a different authentication method or try again later.",
    );
  });

  it("should handle auth progress event without message", () => {
    let handleAuthProgress: (
      status: "success" | "error" | "polling" | "timeout" | "rate_limit",
      message?: string,
    ) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthProgress) {
        handleAuthProgress = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    act(() => {
      handleAuthProgress!("success");
    });

    expect(result.current.TramAuthState.authStatus).toBe("success");
    expect(result.current.TramAuthState.authMessage).toBe(null);
  });

  it("should clean up event listeners when auth type changes", () => {
    const { rerender } = renderHook(
      ({ pendingAuthType, isAuthenticating }) =>
        useTramAuth(pendingAuthType, isAuthenticating),
      {
        initialProps: {
          pendingAuthType: AuthType.TRAM_OAUTH,
          isAuthenticating: true,
        },
      },
    );

    // Change to non-TRAM auth
    rerender({ pendingAuthType: AuthType.USE_GEMINI, isAuthenticating: true });

    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it("should clean up event listeners when authentication stops", () => {
    const { rerender } = renderHook(
      ({ isAuthenticating }) =>
        useTramAuth(AuthType.TRAM_OAUTH, isAuthenticating),
      { initialProps: { isAuthenticating: true } },
    );

    // Stop authentication
    rerender({ isAuthenticating: false });

    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it("should clean up event listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useTramAuth(AuthType.TRAM_OAUTH, true),
    );

    unmount();

    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthUri,
      expect.any(Function),
    );
    expect(mockTramOAuth2Events.off).toHaveBeenCalledWith(
      TramOAuth2Event.AuthProgress,
      expect.any(Function),
    );
  });

  it("should reset state when switching from TRAM auth to another auth type", () => {
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationData) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result, rerender } = renderHook(
      ({ pendingAuthType, isAuthenticating }) =>
        useTramAuth(pendingAuthType, isAuthenticating),
      {
        initialProps: {
          pendingAuthType: AuthType.TRAM_OAUTH,
          isAuthenticating: true,
        },
      },
    );

    // Simulate device auth
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.TramAuthState.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.TramAuthState.authStatus).toBe("polling");

    // Switch to different auth type
    rerender({ pendingAuthType: AuthType.USE_GEMINI, isAuthenticating: true });

    expect(result.current.TramAuthState.deviceAuth).toBe(null);
    expect(result.current.TramAuthState.authStatus).toBe("idle");
    expect(result.current.TramAuthState.authMessage).toBe(null);
  });

  it("should reset state when authentication stops", () => {
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationData) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result, rerender } = renderHook(
      ({ isAuthenticating }) =>
        useTramAuth(AuthType.TRAM_OAUTH, isAuthenticating),
      { initialProps: { isAuthenticating: true } },
    );

    // Simulate device auth
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.TramAuthState.deviceAuth).toEqual(mockDeviceAuth);
    expect(result.current.TramAuthState.authStatus).toBe("polling");

    // Stop authentication
    rerender({ isAuthenticating: false });

    expect(result.current.TramAuthState.deviceAuth).toBe(null);
    expect(result.current.TramAuthState.authStatus).toBe("idle");
    expect(result.current.TramAuthState.authMessage).toBe(null);
  });

  it("should handle cancelTramAuth function", () => {
    let handleDeviceAuth: (deviceAuth: DeviceAuthorizationData) => void;

    mockTramOAuth2Events.on.mockImplementation((event, handler) => {
      if (event === TramOAuth2Event.AuthUri) {
        handleDeviceAuth = handler;
      }
      return mockTramOAuth2Events;
    });

    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    // Set up some state
    act(() => {
      handleDeviceAuth!(mockDeviceAuth);
    });

    expect(result.current.TramAuthState.deviceAuth).toEqual(mockDeviceAuth);

    // Cancel auth
    act(() => {
      result.current.cancelTramAuth();
    });

    expect(result.current.TramAuthState.deviceAuth).toBe(null);
    expect(result.current.TramAuthState.authStatus).toBe("idle");
    expect(result.current.TramAuthState.authMessage).toBe(null);
  });

  it("should handle different auth types correctly", () => {
    // Test with TRAM OAuth - should set up event listeners when authenticating
    const { result: tramResult } = renderHook(() =>
      useTramAuth(AuthType.TRAM_OAUTH, true),
    );
    expect(tramResult.current.TramAuthState.authStatus).toBe("idle");
    expect(mockTramOAuth2Events.on).toHaveBeenCalled();

    // Test with other auth types - should not set up event listeners
    const { result: geminiResult } = renderHook(() =>
      useTramAuth(AuthType.USE_GEMINI, true),
    );
    expect(geminiResult.current.TramAuthState.authStatus).toBe("idle");

    const { result: oauthResult } = renderHook(() =>
      useTramAuth(AuthType.USE_OPENAI, true),
    );
    expect(oauthResult.current.TramAuthState.authStatus).toBe("idle");
  });

  it("should initialize with idle status when starting authentication with TRAM auth", () => {
    const { result } = renderHook(() => useTramAuth(AuthType.TRAM_OAUTH, true));

    expect(result.current.TramAuthState.authStatus).toBe("idle");
    expect(mockTramOAuth2Events.on).toHaveBeenCalled();
  });
});
