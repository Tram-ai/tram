/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { VSCodeAPI } from "../../hooks/useVSCode.js";

/**
 * Session management Hook
 * Manages session list, current session, session switching, and search
 */
export const useSessionManagement = (vscode: VSCodeAPI) => {
  const [tramSessions, setTramSessions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] =
    useState<string>("Past Conversations");
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSwitchingSession, setIsSwitchingSessionRaw] =
    useState<boolean>(false);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SWITCH_TIMEOUT_MS = 15000;
  const PAGE_SIZE = 20;

  const setIsSwitchingSession = useCallback((value: boolean) => {
    setIsSwitchingSessionRaw(value);
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }
    if (value) {
      switchTimeoutRef.current = setTimeout(() => {
        console.warn(
          '[useSessionManagement] Switch session timed out, clearing loading state',
        );
        setIsSwitchingSessionRaw(false);
        switchTimeoutRef.current = null;
      }, SWITCH_TIMEOUT_MS);
    }
  }, []);

  useEffect(
    () => () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
    },
    [],
  );

  /**
   * Filter session list
   */
  const filteredSessions = useMemo(() => {
    if (!sessionSearchQuery.trim()) {
      return tramSessions;
    }
    const query = sessionSearchQuery.toLowerCase();
    return tramSessions.filter((session) => {
      const title = (
        (session.title as string) ||
        (session.name as string) ||
        ""
      ).toLowerCase();
      return title.includes(query);
    });
  }, [tramSessions, sessionSearchQuery]);

  /**
   * Load session list
   */
  const handleLoadTramSessions = useCallback(() => {
    // Reset pagination state and load first page
    setTramSessions([]);
    setNextCursor(undefined);
    setHasMore(true);
    setIsLoading(true);
    vscode.postMessage({ type: "getTramSessions", data: { size: PAGE_SIZE } });
    setShowSessionSelector(true);
  }, [vscode]);

  const handleLoadMoreSessions = useCallback(() => {
    if (!hasMore || isLoading || nextCursor === undefined) {
      return;
    }
    setIsLoading(true);
    vscode.postMessage({
      type: "getTramSessions",
      data: { cursor: nextCursor, size: PAGE_SIZE },
    });
  }, [hasMore, isLoading, nextCursor, vscode]);

  /**
   * Create new session
   */
  const handleNewTramSession = useCallback(
    (modelId?: string | null) => {
      const trimmedModelId =
        typeof modelId === "string" && modelId.trim().length > 0
          ? modelId.trim()
          : undefined;
      vscode.postMessage({
        type: "openNewChatTab",
        data: trimmedModelId ? { modelId: trimmedModelId } : {},
      });
      setShowSessionSelector(false);
    },
    [vscode],
  );

  /**
   * Switch session
   */
  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      if (sessionId === currentSessionId) {
        console.log("[useSessionManagement] Already on this session, ignoring");
        setShowSessionSelector(false);
        return;
      }

      console.log("[useSessionManagement] Switching to session:", sessionId);
      setIsSwitchingSession(true);
      vscode.postMessage({
        type: "switchTramSession",
        data: { sessionId },
      });
    },
    [currentSessionId, vscode, setIsSwitchingSession],
  );

  /**
   * Delete session
   */
  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      vscode.postMessage({
        type: 'deleteQwenSession',
        data: { sessionId },
      });
    },
    [vscode],
  );

  /**
   * Rename session
   */
  const handleRenameSession = useCallback(
    (sessionId: string, title: string) => {
      vscode.postMessage({
        type: 'renameQwenSession',
        data: { sessionId, title },
      });
    },
    [vscode],
  );

  return {
    // State
    tramSessions,
    currentSessionId,
    currentSessionTitle,
    showSessionSelector,
    sessionSearchQuery,
    filteredSessions,
    nextCursor,
    hasMore,
    isLoading,
    isSwitchingSession,

    // State setters
    setTramSessions,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setShowSessionSelector,
    setSessionSearchQuery,
    setNextCursor,
    setHasMore,
    setIsLoading,
    setIsSwitchingSession,

    // Operations
    handleLoadTramSessions,
    handleNewTramSession,
    handleSwitchSession,
    handleLoadMoreSessions,
    handleDeleteSession,
    handleRenameSession,
  };
};
