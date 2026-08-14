const API_BASE = "http://127.0.0.1:8000/api/v1";

export async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("acpia_token");
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Cases
  getCases: () => fetchAPI("/cases/"),
  getCase: (id: number) => fetchAPI(`/cases/${id}`),
  createCase: (name: string, description?: string) =>
    fetchAPI("/cases/", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),

  // Evidence
  getEvidence: (caseId: number) => fetchAPI(`/cases/${caseId}/evidence`),
  uploadEvidence: async (caseId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    let token = null;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("acpia_token");
    }
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
      method: "POST",
      body: formData,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload error: ${response.statusText}`);
    }

    return response.json();
  },

  // Agents
  getDecisions: (evidenceId: number) => fetchAPI(`/agents/decisions/${evidenceId}`),
  getCaseDecisions: (caseId: number) => fetchAPI(`/agents/case/${caseId}/decisions`),
  updateDecision: (decisionId: number, status: "approved" | "rejected" | "pending_approval") =>
    fetchAPI(`/agents/decisions/${decisionId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Timeline
  getTimeline: (caseId: number, eventType?: string) => {
    const query = eventType ? `?event_type=${encodeURIComponent(eventType)}` : "";
    return fetchAPI(`/timeline/${caseId}${query}`);
  },

  // Graph
  getGraph: (caseId: number) => fetchAPI(`/graph/${caseId}`),
  addNode: (caseId: number, node: { name: string; type: string; properties_json?: string }) =>
    fetchAPI(`/graph/${caseId}/nodes`, {
      method: "POST",
      body: JSON.stringify(node),
    }),
  addEdge: (caseId: number, edge: { source_id: number; target_id: number; type: string; properties_json?: string }) =>
    fetchAPI(`/graph/${caseId}/edges`, {
      method: "POST",
      body: JSON.stringify(edge),
    }),

  // Search
  search: (caseId: number, q: string) =>
    fetchAPI(`/search/${caseId}?q=${encodeURIComponent(q)}`),

  // Audit Logs
  getAudit: (caseId: number) => fetchAPI(`/audit/${caseId}`),

  // Analytics
  getAnalytics: (caseId: number) => fetchAPI(`/analytics/${caseId}`),

  // OSINT
  scanOSINT: (q: string) => fetchAPI(`/osint/scan?q=${encodeURIComponent(q)}`),
  importOSINT: (caseId: number, platform: string, username: string, details: string, linkedLocations?: string, originQuery?: string) =>
    fetchAPI(`/osint/${caseId}/import?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(username)}&details=${encodeURIComponent(details)}${linkedLocations ? `&linked_locations=${encodeURIComponent(linkedLocations)}` : ""}${originQuery ? `&origin_query=${encodeURIComponent(originQuery)}` : ""}`, {
      method: "POST"
    }),

  // Forensics
  getForensicSources: (caseId: number) => fetchAPI(`/forensics/case/${caseId}/sources`),
  registerForensicSource: (caseId: number, filepath: string, fileType: string, filename?: string) =>
    fetchAPI(`/forensics/register`, {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, filepath, file_type: fileType, filename }),
    }),
  getDiskStructure: (evidenceId: number) => fetchAPI(`/forensics/disk/${evidenceId}/structure`),
  extractVirtualFile: (evidenceId: number, path: string) =>
    fetchAPI(`/forensics/disk/${evidenceId}/extract?path=${encodeURIComponent(path)}`),
  checkFileHash: (evidenceId: number, sha256: string, filepath?: string) =>
    fetchAPI(`/forensics/disk/${evidenceId}/hash-check`, {
      method: "POST",
      body: JSON.stringify({ sha256, filepath }),
    }),
  getMemoryAnalysis: (evidenceId: number) => fetchAPI(`/forensics/memory/${evidenceId}/analysis`),
};
