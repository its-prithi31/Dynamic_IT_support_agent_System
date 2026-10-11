const CONFIGURED_API_BASE = import.meta.env.VITE_API_URL || '/api';
const DIRECT_API_FALLBACK = 'http://127.0.0.1:4000/api';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('aegis-access-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchWithFallback(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = `${CONFIGURED_API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, init);
    // If the relative /api proxy returns 404 (e.g. backend was not reached or unproxied preview), try direct backend port 4000
    if (response.status === 404 && CONFIGURED_API_BASE === '/api' && !endpoint.includes('://')) {
      try {
        const directResponse = await fetch(`${DIRECT_API_FALLBACK}${endpoint}`, init);
        if (directResponse.status !== 404) {
          return directResponse;
        }
      } catch {
        // Fall back to original response
      }
    }
    return response;
  } catch (networkError) {
    // If relative /api network request failed, attempt direct connection to backend
    if (CONFIGURED_API_BASE === '/api' && !endpoint.includes('://')) {
      try {
        return await fetch(`${DIRECT_API_FALLBACK}${endpoint}`, init);
      } catch {
        throw new Error('Cannot connect to the Aegis backend. Please ensure the backend is running on http://127.0.0.1:4000.');
      }
    }
    throw networkError;
  }
}

async function jsonOrError(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  const detail = Array.isArray(data?.detail)
    ? data.detail.map((issue: { msg?: string }) => issue.msg || 'Invalid input.').join(' ')
    : typeof data?.detail === 'string' ? data.detail : '';
  if (!response.ok) {
    if (detail) throw new Error(detail);
    if (response.status === 404) throw new Error(`The requested endpoint was not found (HTTP 404). Ensure the backend is running on port 4000.`);
    if (response.status === 401) throw new Error(`Authentication failed. Please check your credentials.`);
    if (response.status === 403) throw new Error(`Permission denied. Administrator or technician access required.`);
    if (response.status === 409) throw new Error(`Email already registered.`);
    throw new Error(`The request could not be completed (HTTP ${response.status}).`);
  }
  if (data === null) {
    throw new Error('The backend returned an empty or invalid response. Ensure the backend is running on port 4000.');
  }
  return data;
}

export async function registerUser(name: string, email: string, password: string) {
  const response = await fetchWithFallback('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return jsonOrError(response);
}

export async function loginUser(email: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const response = await fetchWithFallback('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  return jsonOrError(response);
}

export async function fetchCurrentUser() {
  const response = await fetchWithFallback('/auth/me', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function postSupportChat(query: string, attachments: string[] = []) {
  const response = await fetchWithFallback('/ai/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ query, context: { attachments } }),
  });
  return jsonOrError(response);
}

export async function fetchKnowledge() {
  const response = await fetchWithFallback('/knowledge', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchTickets() {
  const response = await fetchWithFallback('/tickets', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchKnowledgeCandidates() {
  const response = await fetchWithFallback('/knowledge/candidates', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function approveKnowledgeCandidate(candidateId: string | number) {
  const response = await fetchWithFallback(`/knowledge/candidates/${candidateId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return jsonOrError(response);
}

export async function fetchOfflineStatus() {
  const response = await fetchWithFallback('/offline/status');
  return jsonOrError(response);
}

export async function fetchAIMonitorRecent() {
  const response = await fetchWithFallback('/ai/monitor/recent', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIMetrics() {
  const response = await fetchWithFallback('/ai/metrics', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIAudit() {
  const response = await fetchWithFallback('/ai/audit', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIPromptTemplates() {
  const response = await fetchWithFallback('/ai/prompts', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function createPromptTemplate(payload: Record<string, any>) {
  const response = await fetchWithFallback('/ai/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function updatePromptTemplate(promptId: string, version: string, payload: Record<string, any>) {
  const response = await fetchWithFallback(`/ai/prompts/${encodeURIComponent(promptId)}/${encodeURIComponent(version)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function deletePromptTemplate(promptId: string, version: string) {
  const response = await fetchWithFallback(`/ai/prompts/${encodeURIComponent(promptId)}/${encodeURIComponent(version)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return jsonOrError(response);
}

export async function fetchGuardrailLogs() {
  const response = await fetchWithFallback('/guardrails/logs', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIRequests() {
  const response = await fetchWithFallback('/ai/requests', { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIResponses() {
  const response = await fetchWithFallback('/ai/responses', { headers: authHeaders() });
  return jsonOrError(response);
}

export function aiMonitorWebSocketUrl() {
  const base = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('aegis-access-token');
  const auth = token ? `?token=${encodeURIComponent(token)}` : '';
  if (!base) {
    if (typeof window !== 'undefined' && window.location.port === '4000') {
      return `ws://${window.location.host}/ws/ai/monitor${auth}`;
    }
    return `ws://127.0.0.1:4000/ws/ai/monitor${auth}`;
  }
  return base.replace(/^http/, 'ws') + `/ws/ai/monitor${auth}`;
}

export async function fetchTechnicians() {
  const res = await fetchWithFallback('/technicians', { headers: authHeaders() });
  return jsonOrError(res);
}

export async function assignTicket(ticketId: string | number, technicianId: number) {
  const res = await fetchWithFallback(`/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ technician_id: technicianId }),
  });
  return jsonOrError(res);
}

export async function commentTicket(ticketId: string | number, comment: string) {
  const res = await fetchWithFallback(`/tickets/${ticketId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ comment }),
  });
  return jsonOrError(res);
}

export async function resolveTicket(ticketId: string | number, resolution: string) {
  const res = await fetchWithFallback(`/tickets/${ticketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ resolution }),
  });
  return jsonOrError(res);
}

export async function submitAIFeedback(requestId: string, helpful: boolean, successful: boolean, satisfactionScore = 3, comment = '') {
  const res = await fetchWithFallback('/ai/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ request_id: requestId, helpful, successful, satisfaction_score: satisfactionScore, comment }),
  });
  return jsonOrError(res);
}
