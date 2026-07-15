export type Role = 'Employee' | 'IT Technician' | 'Admin';

export type Ticket = {
  id: string;
  user: string;
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  department: string;
  status: 'Open' | 'In Progress' | 'Waiting Approval' | 'Resolved';
  source: string;
  created: string;
  confidence: number;
  solution: string;
};

export const tickets: Ticket[] = [
  {
    id: 'TCK-1048',
    user: 'Mia Chen',
    title: 'VPN connects but internal apps timeout',
    category: 'Network Issue',
    priority: 'High',
    department: 'Network Team',
    status: 'In Progress',
    source: 'Screenshot + log',
    created: '09 Jul 2026',
    confidence: 92,
    solution: 'Refresh VPN profile, flush DNS, verify split tunnel routes, then test intranet access.',
  },
  {
    id: 'TCK-1047',
    user: 'Noah Patel',
    title: 'GitHub SSO login loop after MFA reset',
    category: 'Secure Recovery',
    priority: 'Medium',
    department: 'Identity Team',
    status: 'Waiting Approval',
    source: 'Text',
    created: '09 Jul 2026',
    confidence: 88,
    solution: 'Direct user to official GitHub recovery and request admin re-link after identity proof.',
  },
  {
    id: 'TCK-1046',
    user: 'Arun Kumar',
    title: 'Printer queue stuck after driver update',
    category: 'Device Issue',
    priority: 'Low',
    department: 'Desktop Support',
    status: 'Resolved',
    source: 'System report',
    created: '08 Jul 2026',
    confidence: 96,
    solution: 'Restart spooler, remove failed queue entries, reinstall signed driver package.',
  },
  {
    id: 'TCK-1045',
    user: 'Ava Stone',
    title: 'Outlook cannot open encrypted PDF attachment',
    category: 'Application Issue',
    priority: 'Medium',
    department: 'Messaging Team',
    status: 'Open',
    source: 'PDF',
    created: '08 Jul 2026',
    confidence: 81,
    solution: 'Verify sensitivity label plugin, update Outlook, and open PDF with approved reader.',
  },
];

export const knowledgeDocuments = [
  {
    title: 'VPN split tunnel remediation runbook',
    type: 'PDF manual',
    trust: 'Verified',
    matches: 42,
    updated: '06 Jul 2026',
    tags: ['VPN', 'Network', 'Routes'],
  },
  {
    title: 'Windows printer spooler recovery guide',
    type: 'Troubleshooting doc',
    trust: 'Verified',
    matches: 31,
    updated: '01 Jul 2026',
    tags: ['Printer', 'Driver', 'Windows'],
  },
  {
    title: 'MFA and secure account recovery policy',
    type: 'Security policy',
    trust: 'Restricted',
    matches: 26,
    updated: '29 Jun 2026',
    tags: ['MFA', 'Recovery', 'Identity'],
  },
  {
    title: 'Common application error log signatures',
    type: 'Log corpus',
    trust: 'Verified',
    matches: 58,
    updated: '24 Jun 2026',
    tags: ['Logs', 'Errors', 'RAG'],
  },
];

export const applications = [
  {
    name: 'Gmail',
    category: 'Email',
    usage: 86,
    lastUsed: 'Today',
    issue: 'MFA code not accepted',
    url: 'https://accounts.google.com/signin/recovery',
  },
  {
    name: 'Microsoft 365',
    category: 'Productivity',
    usage: 79,
    lastUsed: 'Today',
    issue: 'Outlook sign-in prompt loop',
    url: 'https://account.live.com/password/reset',
  },
  {
    name: 'GitHub',
    category: 'Developer',
    usage: 64,
    lastUsed: 'Yesterday',
    issue: 'SSO authorization expired',
    url: 'https://github.com/password_reset',
  },
  {
    name: 'Amazon',
    category: 'Commerce',
    usage: 38,
    lastUsed: '03 Jul 2026',
    issue: 'Suspicious login challenge',
    url: 'https://www.amazon.com/ap/forgotpassword',
  },
];

export const agentSteps = [
  { name: 'Input Processor', state: 'Complete', detail: 'Parsed text, PDF, screenshot OCR, and system report metadata.' },
  { name: 'Triage Agent', state: 'Complete', detail: 'Classified category, priority, department, and possible root cause.' },
  { name: 'RAG Retriever', state: 'Complete', detail: 'Searched solved tickets, manuals, logs, and trusted recovery documents.' },
  { name: 'Solution Agent', state: 'Running', detail: 'Drafting root cause, steps, rollback path, and verification method.' },
  { name: 'Verification Agent', state: 'Queued', detail: 'Will validate outcome or trigger the self-correction loop.' },
  { name: 'Approval Gate', state: 'Required', detail: 'Critical scripts and account recovery changes require human approval.' },
];

export const aiLogs = [
  { ticket: 'TCK-1048', agent: 'Triage Agent', action: 'Priority raised to High because VPN blocks internal systems.', time: '10:42' },
  { ticket: 'TCK-1048', agent: 'RAG Retriever', action: 'Matched 6 verified documents and 11 solved tickets.', time: '10:43' },
  { ticket: 'TCK-1047', agent: 'Recovery Assistant', action: 'Blocked credential capture and switched to official provider flow.', time: '10:45' },
  { ticket: 'TCK-1046', agent: 'Verification Agent', action: 'Marked resolved after successful print test confirmation.', time: '09:30' },
];
