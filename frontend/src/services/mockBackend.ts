import { tickets as defaultTickets, knowledgeDocuments, aiLogs } from '../data/mockData';

// Storage keys
const STORAGE_USERS_KEY = 'aegis_demo_users';
const STORAGE_TICKETS_KEY = 'aegis_demo_tickets';
const STORAGE_CURRENT_USER_KEY = 'aegis_demo_current_user';

export type DemoUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function getStoredUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: DemoUser[]) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage quota errors
  }
}

export function getStoredTickets(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_TICKETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...defaultTickets];
}

export function saveStoredTickets(tickets: any[]) {
  try {
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
  } catch {}
}

export function getDemoCurrentUser(): DemoUser {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 1,
    name: 'Priya Sharma',
    email: 'priya@aegis.corp',
    role: 'Admin',
  };
}

export function setDemoCurrentUser(user: DemoUser) {
  try {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } catch {}
}

/**
 * Handles simulated backend responses for all endpoints when backend is unavailable.
 */
export function handleMockRequest(endpoint: string, options?: RequestInit): any {
  const method = (options?.method || 'GET').toUpperCase();
  let body: any = null;
  if (options?.body) {
    if (typeof options.body === 'string') {
      try {
        body = JSON.parse(options.body);
      } catch {
        // May be URLSearchParams
        const params = new URLSearchParams(options.body);
        body = Object.fromEntries(params.entries());
      }
    }
  }

  // 1. /auth/register
  if (endpoint === '/auth/register' && method === 'POST') {
    const users = getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === (body?.email || '').toLowerCase());
    if (existing) {
      // Don't fail in demo mode; reuse user
      setDemoCurrentUser(existing);
      return { id: existing.id, email: existing.email, name: existing.name, role: existing.role };
    }
    const role = (body?.email || '').toLowerCase().includes('admin')
      ? 'Admin'
      : (body?.email || '').toLowerCase().includes('tech')
      ? 'IT Technician'
      : 'Employee';
    const newUser: DemoUser = {
      id: Date.now(),
      name: body?.name || 'Workspace User',
      email: body?.email || 'user@aegis.corp',
      role,
    };
    users.push(newUser);
    saveStoredUsers(users);
    setDemoCurrentUser(newUser);
    return { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
  }

  // 2. /auth/login
  if (endpoint === '/auth/login' && method === 'POST') {
    const email = body?.username || body?.email || '';
    const users = getStoredUsers();
    let found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      const role = email.toLowerCase().includes('admin')
        ? 'Admin'
        : email.toLowerCase().includes('tech')
        ? 'IT Technician'
        : 'Employee';
      found = {
        id: Date.now(),
        name: email.split('@')[0] || 'Workspace User',
        email: email || 'user@aegis.corp',
        role,
      };
      users.push(found);
      saveStoredUsers(users);
    }
    setDemoCurrentUser(found);
    return {
      access_token: `demo-jwt-token-${Date.now()}`,
      refresh_token: `demo-refresh-token-${Date.now()}`,
      token_type: 'bearer',
    };
  }

  // 3. /auth/me
  if (endpoint === '/auth/me') {
    return getDemoCurrentUser();
  }

  // 4. /ai/route (Support Chat Intelligent Triage)
  if (endpoint === '/ai/route' && method === 'POST') {
    const query: string = (body?.query || '').trim();
    const lower = query.toLowerCase();

    let category = 'General Support';
    let priority = 'Medium';
    let team = 'Desktop Support';
    let rootCause = 'Routine application service disturbance or configuration discrepancy.';
    let solution = [
      '1. Restart the affected software application to reset active threads.',
      '2. Verify system network reachability and corporate proxy settings.',
      '3. In Command Prompt or Terminal, flush DNS cache: ipconfig /flushdns',
    ];
    let verification = 'Verify expected application behavior and confirm latency is normalized.';
    let confidence = 89;
    let escalate = false;

    if (lower.includes('vpn') || lower.includes('network') || lower.includes('connect') || lower.includes('wifi') || lower.includes('timeout')) {
      category = 'Network Issue';
      priority = 'High';
      team = 'Network Engineering';
      rootCause = 'Stale virtual routing table and split-tunnel gateway timeout.';
      solution = [
        '1. Disconnect and re-authenticate to corporate VPN profile.',
        '2. Flush local DNS resolver cache: ipconfig /flushdns',
        '3. Verify route metrics and reset Secure Client network adapter.',
      ];
      verification = 'Ping corporate gateway (10.10.1.1) and verify intranet portal loads without error.';
      confidence = 94;
    } else if (lower.includes('print') || lower.includes('printer') || lower.includes('queue') || lower.includes('spooler')) {
      category = 'Device & Peripherals';
      priority = 'Low';
      team = 'Desktop Support';
      rootCause = 'Corrupted document buffer in Windows Print Spooler queue.';
      solution = [
        '1. Open Services console or run "net stop spooler" in Administrator terminal.',
        '2. Purge pending spool buffer files in C:\\Windows\\System32\\spool\\PRINTERS.',
        '3. Restart Print Spooler using "net start spooler" and dispatch a single test page.',
      ];
      verification = 'Send Windows Printer Test Page and verify physical paper output.';
      confidence = 97;
    } else if (lower.includes('password') || lower.includes('mfa') || lower.includes('sso') || lower.includes('lock') || lower.includes('reset') || lower.includes('login')) {
      category = 'Identity & Access';
      priority = 'Medium';
      team = 'Identity Management';
      rootCause = 'MFA token synchronization drift following credential update.';
      solution = [
        '1. Direct user to company identity portal for verified recovery challenge.',
        '2. Confirm authenticator application push approval on authorized hardware.',
        '3. If persistent loop continues, request administrator one-time bypass token.',
      ];
      verification = 'Complete single sign-on challenge and verify session token issuance.';
      confidence = 91;
    } else if (lower.includes('prompt') || lower.includes('system') || lower.includes('ignore') || lower.includes('bypass') || lower.includes('jailbreak')) {
      category = 'Security Guardrail';
      priority = 'Critical';
      team = 'Security Operations';
      rootCause = 'Prompt injection signature detected by Aegis Guardrail engine.';
      solution = [
        '1. Input safely neutralized by safety filter.',
        '2. Incident audit signature recorded.',
        '3. Escalated to Tier 2 security analysts for behavioral review.',
      ];
      verification = 'Review security logs and confirmed input sanitization.';
      confidence = 99;
      escalate = true;
    }

    const ticketId = Math.floor(1000 + Math.random() * 9000);
    const tickets = getStoredTickets();
    const newTicket = {
      id: `TCK-${ticketId}`,
      user: getDemoCurrentUser().name,
      title: query.slice(0, 60) + (query.length > 60 ? '...' : ''),
      category,
      priority,
      department: team,
      status: escalate ? 'Waiting Approval' : 'In Progress',
      source: 'AI Assistant',
      created: 'Just now',
      confidence,
      solution: solution.join(' '),
    };
    tickets.unshift(newTicket);
    saveStoredTickets(tickets);

    return {
      category,
      priority,
      team,
      rootCause,
      root_cause: rootCause,
      solution,
      verification,
      confidence,
      escalate,
      ticket_id: ticketId,
      request_id: `req-${Date.now()}`,
      response: `Problem: ${category} (${priority}). Likely cause: ${rootCause} Recommended actions: ${solution.join(' ')} Verify: ${verification}`,
    };
  }

  // 5. /tickets
  if (endpoint === '/tickets' && method === 'GET') {
    return getStoredTickets();
  }

  // 6. /tickets/:id/assign
  if (endpoint.includes('/assign') && method === 'POST') {
    const parts = endpoint.split('/');
    const ticketId = parts[2];
    const tickets = getStoredTickets();
    const t = tickets.find((x) => String(x.id) === String(ticketId));
    if (t) {
      t.status = 'In Progress';
      saveStoredTickets(tickets);
    }
    return { success: true, ticket: t };
  }

  // 7. /tickets/:id/comment
  if (endpoint.includes('/comment') && method === 'POST') {
    return { success: true, message: 'Comment added' };
  }

  // 8. /tickets/:id/resolve
  if (endpoint.includes('/resolve') && method === 'POST') {
    const parts = endpoint.split('/');
    const ticketId = parts[2];
    const tickets = getStoredTickets();
    const t = tickets.find((x) => String(x.id) === String(ticketId));
    if (t) {
      t.status = 'Resolved';
      saveStoredTickets(tickets);
    }
    return { success: true, ticket: t };
  }

  // 9. /knowledge
  if (endpoint === '/knowledge') {
    return knowledgeDocuments;
  }

  // 10. /knowledge/candidates
  if (endpoint === '/knowledge/candidates') {
    return [
      {
        id: 101,
        title: 'Edge VPN Dual-Homed Gateway Failover',
        source_ticket_id: 'TCK-1048',
        confidence_score: 93,
        proposed_solution: 'Configure static route metric priority when split tunneling is active.',
        status: 'pending',
      },
      {
        id: 102,
        title: 'Automated Spooler Cache Flush Routine',
        source_ticket_id: 'TCK-1046',
        confidence_score: 89,
        proposed_solution: 'PowerShell script to reset spooler service and wipe corrupted printer cache.',
        status: 'pending',
      },
      {
        id: 103,
        title: 'SSO Session Drift Remediation Runbook',
        source_ticket_id: 'TCK-1047',
        confidence_score: 95,
        proposed_solution: 'Clear stale identity cookies and trigger tenant authorization refresh.',
        status: 'pending',
      },
    ];
  }

  // 11. /knowledge/candidates/:id/approve
  if (endpoint.includes('/approve') && method === 'POST') {
    return { success: true, message: 'Knowledge article approved and indexed.' };
  }

  // 12. /technicians
  if (endpoint === '/technicians') {
    return [
      { id: 1, name: 'Alex Rivera', email: 'alex@aegis.corp', role: 'IT Technician', active_tickets: 2 },
      { id: 2, name: 'Samantha Vance', email: 'sam@aegis.corp', role: 'IT Technician', active_tickets: 1 },
      { id: 3, name: 'David Zhang', email: 'david@aegis.corp', role: 'IT Technician', active_tickets: 3 },
    ];
  }

  // 13. /offline/status
  if (endpoint === '/offline/status') {
    return {
      status: 'offline-ready',
      mode: 'client-offline-cache',
      cached_runbooks: 4,
      tickets_cached: getStoredTickets().length,
      sqlite_sync: false,
      timestamp: new Date().toISOString(),
    };
  }

  // 14. /ai/monitor/recent
  if (endpoint === '/ai/monitor/recent') {
    return [
      { id: 1, agent: 'Triage Agent', action: 'Classified incident priority and category', duration_ms: 120, status: 'success', timestamp: '10:42' },
      { id: 2, agent: 'RAG Retriever', action: 'Matched 4 verified runbooks from vector corpus', duration_ms: 240, status: 'success', timestamp: '10:43' },
      { id: 3, agent: 'Guardrail Engine', action: 'Scanned input for PII and injection signatures', duration_ms: 45, status: 'success', timestamp: '10:45' },
      { id: 4, agent: 'Verification Agent', action: 'Confirmed ping response and port availability', duration_ms: 310, status: 'success', timestamp: '10:46' },
    ];
  }

  // 15. /ai/metrics
  if (endpoint === '/ai/metrics') {
    return {
      ticket_count: getStoredTickets().length,
      waiting_approval: getStoredTickets().filter((t) => t.status === 'Waiting Approval').length,
      resolved_tickets: getStoredTickets().filter((t) => t.status === 'Resolved').length,
      feedback_count: 18,
      avg_confidence: 92.4,
    };
  }

  // 16. /ai/audit
  if (endpoint === '/ai/audit') {
    return {
      logs: [
        { id: 'AUD-901', action: 'Automated remediation executed for VPN route table', actor: 'Aegis Agent', status: 'Verified', timestamp: '10:45 AM' },
        { id: 'AUD-902', action: 'Prompt template updated: triage-v2', actor: 'Admin', status: 'Success', timestamp: '09:20 AM' },
        { id: 'AUD-903', action: 'Approval gate granted for ticket TCK-1047', actor: 'Lead Tech', status: 'Approved', timestamp: 'Yesterday' },
      ],
      events: aiLogs,
    };
  }

  // 17. /ai/prompts
  if (endpoint === '/ai/prompts') {
    return [
      {
        id: 'triage_agent',
        role: 'system',
        version: '1.2',
        template: 'You are an autonomous IT triage agent. Analyze user queries, detect severity, and identify affected systems.',
        metadata: { model: 'gpt-4o-mini', temperature: 0.2 },
      },
      {
        id: 'rag_synthesizer',
        role: 'system',
        version: '1.0',
        template: 'Synthesize solution steps strictly from verified internal runbooks. Escalate if confidence is below threshold.',
        metadata: { model: 'gpt-4o-mini', temperature: 0.1 },
      },
      {
        id: 'verification_agent',
        role: 'system',
        version: '1.1',
        template: 'Produce deterministic verification checks (pings, service restarts, port validation) for the solution.',
        metadata: { model: 'gpt-4o-mini', temperature: 0.0 },
      },
    ];
  }

  // 18. /guardrails/logs
  if (endpoint === '/guardrails/logs') {
    return [
      {
        id: 1,
        request_id: 'REQ-8821',
        event_type: 'PII_MASK',
        reason: 'Redacted password credentials from diagnostic log upload',
        details: { pattern: 'password=***' },
        created_at: new Date().toLocaleDateString(),
      },
      {
        id: 2,
        request_id: 'REQ-8822',
        event_type: 'INJECTION_INTERCEPT',
        reason: 'Blocked instruction override in query prompt',
        details: { risk: 'High' },
        created_at: new Date().toLocaleDateString(),
      },
    ];
  }

  // 19. /ai/requests
  if (endpoint === '/ai/requests') {
    return [
      { id: 'REQ-8821', query: 'VPN keeps disconnecting when opening internal SAP portal', status: 'Resolved', latency_ms: 380, created_at: new Date().toLocaleDateString() },
      { id: 'REQ-8820', query: 'Printer spooler error 0x0000007e', status: 'Resolved', latency_ms: 290, created_at: new Date().toLocaleDateString() },
    ];
  }

  // 20. /ai/responses
  if (endpoint === '/ai/responses') {
    return [
      { id: 'RES-8821', request_id: 'REQ-8821', category: 'Network', confidence: 94, created_at: new Date().toLocaleDateString() },
      { id: 'RES-8820', request_id: 'REQ-8820', category: 'Hardware', confidence: 97, created_at: new Date().toLocaleDateString() },
    ];
  }

  // 21. /ai/feedback
  if (endpoint === '/ai/feedback') {
    return { success: true, message: 'Feedback recorded' };
  }

  // Generic fallback
  return { success: true, message: 'Demo mode simulated response' };
}
