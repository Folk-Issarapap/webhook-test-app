import { generateWorkspaceTokens } from "@/lib/webhooks/generate-workspace-path";
import {
  isValidWorkspacePair,
  parseWorkspacePath,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/webhooks/workspace-storage";

/** Maximum webhook catchers per browser workspace. */
export const MAX_ENDPOINTS = 3 as const;

export const WORKSPACE_STATE_KEY = "webhook_workspace_state_v2" as const;

export type StoredEndpoint = {
  id: string;
  publicSlug: string;
  secretToken: string;
  createdAt: number;
};

export type WorkspaceState = {
  endpoints: StoredEndpoint[];
  selectedId: string | null;
};

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ep_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function createEndpoint(): StoredEndpoint {
  const { publicSlug, secretToken } = generateWorkspaceTokens();
  return {
    id: newId(),
    publicSlug,
    secretToken,
    createdAt: Date.now(),
  };
}

export function loadWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined") {
    return { endpoints: [], selectedId: null };
  }
  try {
    const raw = localStorage.getItem(WORKSPACE_STATE_KEY);
    if (!raw) return { endpoints: [], selectedId: null };
    const data = JSON.parse(raw) as WorkspaceState;
    if (!Array.isArray(data.endpoints)) return { endpoints: [], selectedId: null };
    const endpoints = data.endpoints.filter(
      (e) =>
        e?.id &&
        typeof e.publicSlug === "string" &&
        typeof e.secretToken === "string" &&
        isValidWorkspacePair(e.publicSlug, e.secretToken),
    );
    let selectedId = data.selectedId;
    if (!selectedId || !endpoints.some((e) => e.id === selectedId)) {
      selectedId = endpoints[0]?.id ?? null;
    }
    if (endpoints.length > MAX_ENDPOINTS) {
      const trimmed = endpoints.slice(0, MAX_ENDPOINTS);
      if (!selectedId || !trimmed.some((e) => e.id === selectedId)) {
        selectedId = trimmed[0]?.id ?? null;
      }
      const next = { endpoints: trimmed, selectedId };
      saveWorkspaceState(next);
      return next;
    }
    return { endpoints, selectedId };
  } catch {
    return { endpoints: [], selectedId: null };
  }
}

export function saveWorkspaceState(state: WorkspaceState): void {
  try {
    localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Migrates legacy v1 storage (single slug/token pair) into v2 state. */
export function migrateFromV1(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(WORKSPACE_STATE_KEY)) return;
    const v1 = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    const parsed = parseWorkspacePath(v1);
    if (!parsed) return;
    const ep: StoredEndpoint = {
      id: newId(),
      publicSlug: parsed.publicSlug,
      secretToken: parsed.secretToken,
      createdAt: Date.now(),
    };
    saveWorkspaceState({ endpoints: [ep], selectedId: ep.id });
  } catch {
    /* ignore */
  }
}

/** Ensures at least one endpoint exists; selects the first if none selected. */
export function ensureWorkspaceInitialized(): WorkspaceState {
  migrateFromV1();
  let state = loadWorkspaceState();
  if (state.endpoints.length === 0) {
    const ep = createEndpoint();
    state = { endpoints: [ep], selectedId: ep.id };
    saveWorkspaceState(state);
    return state;
  }
  if (!state.selectedId) {
    state = { ...state, selectedId: state.endpoints[0]!.id };
    saveWorkspaceState(state);
  }
  return state;
}

export function addEndpoint(): StoredEndpoint | null {
  const state = loadWorkspaceState();
  if (state.endpoints.length >= MAX_ENDPOINTS) return null;
  const ep = createEndpoint();
  const next: WorkspaceState = {
    endpoints: [...state.endpoints, ep],
    selectedId: ep.id,
  };
  saveWorkspaceState(next);
  return ep;
}

export function selectEndpoint(id: string): void {
  const state = loadWorkspaceState();
  if (!state.endpoints.some((e) => e.id === id)) return;
  saveWorkspaceState({ ...state, selectedId: id });
}

/** Removes an endpoint. Returns false if it would leave the workspace empty. */
export function removeEndpoint(id: string): boolean {
  const state = loadWorkspaceState();
  if (state.endpoints.length <= 1) return false;
  const endpoints = state.endpoints.filter((e) => e.id !== id);
  if (endpoints.length === state.endpoints.length) return false;
  let selectedId = state.selectedId;
  if (selectedId === id || !selectedId || !endpoints.some((e) => e.id === selectedId)) {
    selectedId = endpoints[0]?.id ?? null;
  }
  saveWorkspaceState({ endpoints, selectedId });
  return true;
}

/**
 * Deep link: select existing pair, append if under the cap, otherwise keep first selected.
 */
export function upsertEndpointByTokens(
  publicSlug: string,
  secretToken: string,
): { selected: StoredEndpoint } {
  let state = loadWorkspaceState();
  const hit = state.endpoints.find(
    (e) => e.publicSlug === publicSlug && e.secretToken === secretToken,
  );
  if (hit) {
    saveWorkspaceState({ ...state, selectedId: hit.id });
    return { selected: hit };
  }
  if (state.endpoints.length >= MAX_ENDPOINTS) {
    const first = state.endpoints[0]!;
    saveWorkspaceState({ ...state, selectedId: first.id });
    return { selected: first };
  }
  const ep: StoredEndpoint = {
    id: newId(),
    publicSlug,
    secretToken,
    createdAt: Date.now(),
  };
  state = {
    endpoints: [...state.endpoints, ep],
    selectedId: ep.id,
  };
  saveWorkspaceState(state);
  return { selected: ep };
}
