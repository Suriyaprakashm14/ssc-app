"use client";

import { useEffect } from "react";
import { loadStudyState, saveStudyState } from "@/services/study-state.service";
import { useWarRoomStore } from "@/store/war-room-store";

const syncDelayMs = 750;

export function StudyStateSync({ userId, children }: { userId: string; children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: (() => void) | undefined;
    let saving: Promise<void> = Promise.resolve();

    const persist = (force = false) => {
      if (!active && !force) return saving;
      const state = useWarRoomStore.getState();
      if (!state.cloudReady || state.ownerId !== userId) return saving;
      saving = saving
        .catch(() => undefined)
        .then(() => saveStudyState(userId, state.toStudyStateData()))
        .catch((error) => {
          console.error("Unable to sync study state to Firestore", error);
        });
      return saving;
    };

    const schedulePersist = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => void persist(), syncDelayMs);
    };

    const persistActiveTimers = () => {
      const state = useWarRoomStore.getState();
      const hasActiveWork = state.workSessions.some((work) => !work.logoutAt);
      if (state.timer.state !== "idle" || hasActiveWork) void persist();
    };

    const persistBeforeBackground = () => {
      if (document.visibilityState === "hidden") void persist();
    };

    const startSyncing = () => {
      unsubscribe = useWarRoomStore.subscribe((state, previous) => {
        if (!state.cloudReady || state.ownerId !== userId || state === previous) return;
        schedulePersist();
      });

      void persist();
      interval = setInterval(persistActiveTimers, 15_000);
      window.addEventListener("pagehide", persistActiveTimers);
      document.addEventListener("visibilitychange", persistBeforeBackground);
    };

    void loadStudyState(userId).then((remoteState) => {
      if (!active) return;
      if (remoteState) useWarRoomStore.getState().hydrateFromCloud(remoteState, userId);
      else useWarRoomStore.getState().prepareCloudUser(userId);

      startSyncing();
    }).catch((error) => {
      console.error("Unable to load study state from Firestore", error);
      if (!active) return;
      useWarRoomStore.getState().prepareCloudUser(userId);
      startSyncing();
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
      window.removeEventListener("pagehide", persistActiveTimers);
      document.removeEventListener("visibilitychange", persistBeforeBackground);
      void persist(true);
      active = false;
      unsubscribe?.();
    };
  }, [userId]);

  return <>{children}</>;
}
