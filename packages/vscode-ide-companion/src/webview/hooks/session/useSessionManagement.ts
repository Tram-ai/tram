/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo } from "react";
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

  const PAGE_SIZE = 20;

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
      vscode.postMessage({
        type: "switchTramSession",
        data: { sessionId },
      });
    },
    [currentSessionId, vscode],
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

    // State setters
    setTramSessions,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setShowSessionSelector,
    setSessionSearchQuery,
    setNextCursor,
    setHasMore,
    setIsLoading,

    // Operations
    handleLoadTramSessions,
    handleNewTramSession,
    handleSwitchSession,
    handleLoadMoreSessions,
  };
};
