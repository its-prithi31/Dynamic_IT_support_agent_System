import { handleMockRequest } from './mockBackend';

let currentBackendMode: 'live' | 'demo' = 'live';
const listeners: Array<(mode: 'live' | 'demo') => void> = [];

export function getBackendMode(): 'live' | 'demo' {
  return currentBackendMode;
}

export function subscribeBackendMode(callback: (mode: 'live' | 'demo') => void) {
  listeners.push(callback);
  callback(currentBackendMode);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function setBackendMode(mode: 'live' | 'demo') {
  if (currentBackendMode !== mode) {
    currentBackendMode = mode;
    listeners.forEach((cb) => cb(mode));
  }
}

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('aegis-api-url');
  if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  // Default to relative /api which is proxied by Vite or web server
  return '/api';
}

export function setApiBaseUrl(url: string) {
  if (url && url.trim()) {
    localStorage.setItem('aegis-api-url', url.trim());
  } else {
    localStorage.removeItem('aegis-api-url');
  }
  // Reset mode to attempt live with new URL
  setBackendMode('live');
}

const DIRECT_LOCAL_FALLBACK = 'http://127.0.0.1:4000/api';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('aegis-access-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function createMockResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fetchWithFallback(endpoint: string, init?: RequestInit): Promise<Response> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}${endpoint}`;

  try {
    const response = await fetch(url, init);

    // If server responds with valid status (even 400/401/403/409/422 with JSON), it's a real live backend
    if (response.ok) {
      setBackendMode('live');
      return response;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json') && response.status !== 404) {
      // Backend returned valid JSON error (e.g. 401 Unauthorized, 422 Unprocessable)
      setBackendMode('live');
      return response;
    }

    // If 404 on relative /api, attempt direct connection to local port 4000
    if (response.status === 404 && apiBase === '/api' && !endpoint.includes('://')) {
      try {
        const directResponse = await fetch(`${DIRECT_LOCAL_FALLBACK}${endpoint}`, init);
        if (directResponse.status !== 404) {
          setBackendMode('live');
          return directResponse;
        }
      } catch {
        // Fall back to client-side demo mode
      }
    }

    // If still 404 or non-JSON error on static deployment, smoothly fall back to client-side demo
    if (response.status === 404 || !contentType.includes('application/json')) {
      setBackendMode('demo');
      const mockData = handleMockRequest(endpoint, init);
      return createMockResponse(mockData);
    }

    return response;
  } catch (_networkError) {
    // Network failed (e.g. port closed, offline, mixed-content blocked)
    // Try local port 4000 if not already tried
    if (apiBase === '/api') {
      try {
        const directResponse = await fetch(`${DIRECT_LOCAL_FALLBACK}${endpoint}`, init);
        if (directResponse.status !== 404) {
          setBackendMode('live');
          return directResponse;
        }
      } catch {
        // Fall back to client-side demo mode
      }
    }

    setBackendMode('demo');
    const mockData = handleMockRequest(endpoint, init);
    return createMockResponse(mockData);
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
    throw new Error('The backend returned an empty response.');
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
  const custom = localStorage.getItem('aegis-api-url');
  const base = custom || import.meta.env.VITE_API_URL || '';
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
