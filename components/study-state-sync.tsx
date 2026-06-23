"use client";

import { useEffect } from "react";
import { loadStudyState, saveStudyState } from "@/services/study-state.service";
import { useWarRoomStore } from "@/store/war-room-store";

const syncDelayMs = 750;

export function StudyStateSync({ userId, children }: { userId: string; children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const persist = () => {
      if (!active) return;
      void saveStudyState(userId, useWarRoomStore.getState().toStudyStateData()).catch(() => undefined);
    };

    void loadStudyState(userId).then((remoteState) => {
      if (!active) return;
      if (remoteState) useWarRoomStore.getState().hydrateFromCloud(remoteState, userId);
      else useWarRoomStore.getState().prepareCloudUser(userId);

      unsubscribe = useWarRoomStore.subscribe((state, previous) => {
        if (!state.cloudReady || state.ownerId !== userId || state === previous) return;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(persist, syncDelayMs);
      });

      if (!remoteState) persist();
    }).catch(() => {
      if (active) useWarRoomStore.getState().prepareCloudUser(userId);
    });

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      unsubscribe?.();
    };
  }, [userId]);

  return <>{children}</>;
}
