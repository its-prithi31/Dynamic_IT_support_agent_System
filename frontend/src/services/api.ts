const API_BASE = import.meta.env.VITE_API_URL || '/api';
const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('aegis-access-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function jsonOrError(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  const detail = Array.isArray(data?.detail)
    ? data.detail.map((issue: { msg?: string }) => issue.msg || 'Invalid input.').join(' ')
    : typeof data?.detail === 'string' ? data.detail : '';
  if (!response.ok) throw new Error(detail || `The request could not be completed (HTTP ${response.status}). Ensure the backend is running on port 4000.`);
  if (data === null) throw new Error('The backend returned an empty or invalid response. Ensure the backend is running on port 4000.');
  return data;
}

export async function registerUser(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
  return jsonOrError(response);
}

export async function postSupportChat(query: string, attachments: string[] = []) {
  const response = await fetch(`${API_BASE}/ai/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ query, context: { attachments } }),
  });
  return jsonOrError(response);
}

export async function fetchKnowledge() {
  const response = await fetch(`${API_BASE}/knowledge`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchTickets() {
  const response = await fetch(`${API_BASE}/tickets`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchKnowledgeCandidates() {
  const response = await fetch(`${API_BASE}/knowledge/candidates`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function approveKnowledgeCandidate(candidateId: string | number) {
  const response = await fetch(`${API_BASE}/knowledge/candidates/${candidateId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return jsonOrError(response);
}

export async function fetchOfflineStatus() {
  const response = await fetch(`${API_BASE}/offline/status`);
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  return jsonOrError(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIMonitorRecent() {
  const response = await fetch(`${API_BASE}/ai/monitor/recent`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIMetrics() {
  const response = await fetch(`${API_BASE}/ai/metrics`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIAudit() {
  const response = await fetch(`${API_BASE}/ai/audit`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIPromptTemplates() {
  const response = await fetch(`${API_BASE}/ai/prompts`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function createPromptTemplate(payload: Record<string, any>) {
  const response = await fetch(`${API_BASE}/ai/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function updatePromptTemplate(promptId: string, version: string, payload: Record<string, any>) {
  const response = await fetch(`${API_BASE}/ai/prompts/${encodeURIComponent(promptId)}/${encodeURIComponent(version)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return jsonOrError(response);
}

export async function deletePromptTemplate(promptId: string, version: string) {
  const response = await fetch(`${API_BASE}/ai/prompts/${encodeURIComponent(promptId)}/${encodeURIComponent(version)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return jsonOrError(response);
}

export async function fetchGuardrailLogs() {
  const response = await fetch(`${API_BASE}/guardrails/logs`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIRequests() {
  const response = await fetch(`${API_BASE}/ai/requests`, { headers: authHeaders() });
  return jsonOrError(response);
}

export async function fetchAIResponses() {
  const response = await fetch(`${API_BASE}/ai/responses`, { headers: authHeaders() });
  return jsonOrError(response);
}

export function aiMonitorWebSocketUrl() {
  const base = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('aegis-access-token');
  const auth = token ? `?token=${encodeURIComponent(token)}` : '';
  // assume same host; replace http(s) with ws(s)
  if (!base) return `ws://${window.location.host}/ws/ai/monitor${auth}`;
  return base.replace(/^http/, 'ws') + `/ws/ai/monitor${auth}`;
}

export async function fetchTechnicians() {
  const res = await fetch(`${API_BASE}/technicians`, { headers: authHeaders() });
  return jsonOrError(res);
}

export async function assignTicket(ticketId: string | number, technicianId: number) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ technician_id: technicianId }),
  });
  return jsonOrError(res);
}

export async function commentTicket(ticketId: string | number, comment: string) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ comment }),
  });
  return jsonOrError(res);
}

export async function resolveTicket(ticketId: string | number, resolution: string) {
  const res = await fetch(`${API_BASE}/tickets/${ticketId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ resolution }),
  });
  return jsonOrError(res);
}

export async function submitAIFeedback(requestId: string, helpful: boolean, successful: boolean, satisfactionScore = 3, comment = '') {
  const res = await fetch(`${API_BASE}/ai/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ request_id: requestId, helpful, successful, satisfaction_score: satisfactionScore, comment }) });
  return jsonOrError(res);
}
