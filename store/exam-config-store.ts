"use client";

import { create } from "zustand";
import { clearSSCConfigCache, getSSCConfig } from "@/services/exam-config.service";
import type { ExamConfig } from "@/types/exam-config";

type ExamConfigState = {
  loading: boolean;
  error?: string;
  config?: ExamConfig;
  loadConfig: () => Promise<void>;
  refreshConfig: () => Promise<void>;
};

const load = async (set: (state: Partial<ExamConfigState>) => void, refresh = false) => {
  if (refresh) clearSSCConfigCache();
  set({ loading: true, error: undefined });
  try {
    set({ config: await getSSCConfig(), loading: false });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : "Unable to load the SSC syllabus.", loading: false });
  }
};

export const useExamConfigStore = create<ExamConfigState>((set, get) => ({
  loading: false,
  loadConfig: async () => {
    if (get().config || get().loading) return;
    await load(set);
  },
  refreshConfig: async () => load(set, true),
}));
