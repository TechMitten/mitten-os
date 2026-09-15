import { create } from "zustand";
import { getWebLLMEngine, type WebLLMLoadProgress } from "@/lib/ai/webllm";

export type AIModelDownloadStatus = "idle" | "downloading" | "ready" | "error";

interface AIModelDownloadState {
  status: AIModelDownloadStatus;
  modelId: string | null;
  progress: number;
  message: string;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  ensureWebLLMModel: (modelId: string) => Promise<void>;
  resetError: () => void;
}

const readyModels = new Set<string>();
let activeDownload: Promise<void> | null = null;
let activeModelId: string | null = null;

function normalizeProgress(report: WebLLMLoadProgress): number {
  const raw = Number.isFinite(report.progress) ? report.progress : 0;
  const percent = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, percent));
}

function formatMessage(report: WebLLMLoadProgress): string {
  return report.text?.trim() || "Preparing local AI model...";
}

export const useAIModelStore = create<AIModelDownloadState>((set, get) => ({
  status: "idle",
  modelId: null,
  progress: 0,
  message: "",
  error: null,
  startedAt: null,
  completedAt: null,

  ensureWebLLMModel: async (modelId: string) => {
    const selectedModel = modelId.trim();
    if (!selectedModel) {
      throw new Error("Choose a local WebGPU model first.");
    }

    if (readyModels.has(selectedModel)) {
      set({
        status: "ready",
        modelId: selectedModel,
        progress: 100,
        message: "Local AI model ready",
        error: null,
        completedAt: Date.now(),
      });
      return;
    }

    if (activeDownload && activeModelId === selectedModel) {
      return activeDownload;
    }

    activeModelId = selectedModel;
    set({
      status: "downloading",
      modelId: selectedModel,
      progress: 0,
      message: "Starting local AI model download...",
      error: null,
      startedAt: Date.now(),
      completedAt: null,
    });

    activeDownload = getWebLLMEngine(selectedModel, {
      onProgress: (report) => {
        if (activeModelId !== selectedModel) return;
        set({
          status: "downloading",
          modelId: selectedModel,
          progress: normalizeProgress(report),
          message: formatMessage(report),
          error: null,
        });
      },
    })
      .then(() => {
        readyModels.add(selectedModel);
        set({
          status: "ready",
          modelId: selectedModel,
          progress: 100,
          message: "Local AI model ready",
          error: null,
          completedAt: Date.now(),
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Local model download failed.";
        set({
          status: "error",
          modelId: selectedModel,
          progress: get().progress,
          message: "Local AI model download failed",
          error: message,
          completedAt: null,
        });
        throw err;
      })
      .finally(() => {
        if (activeModelId === selectedModel) {
          activeDownload = null;
        }
      });

    return activeDownload;
  },

  resetError: () => {
    if (get().status === "error") {
      set({ status: "idle", error: null, message: "", progress: 0 });
    }
  },
}));

export function isAIAppBlocked(appId: string): boolean {
  if (appId !== "coding-assistant") return false;
  const state = useAIModelStore.getState();
  return state.status === "downloading";
}
