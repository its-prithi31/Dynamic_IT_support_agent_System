import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Activity, CheckCircle2, Clock, ShieldAlert, TicketCheck, Users } from 'lucide-react';
import { aiLogs, tickets } from '../data/mockData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

const metrics = [
  { label: 'Total tickets', value: '248', change: '+12%', icon: TicketCheck },
  { label: 'Resolved tickets', value: '189', change: '+8%', icon: CheckCircle2 },
  { label: 'Pending tickets', value: '31', change: '-4%', icon: Clock },
  { label: 'AI success rate', value: '94%', change: '+3%', icon: Activity },
];

const issueData = {
  labels: ['Network', 'VPN', 'Email', 'Printer', 'Recovery'],
  datasets: [
    {
      label: 'Tickets by category',
      data: [35, 25, 20, 15, 12],
      backgroundColor: ['#06b6d4', '#38bdf8', '#818cf8', '#34d399', '#f59e0b'],
    },
  ],
};

const resolutionData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Resolution time (min)',
      data: [42, 38, 35, 31, 28, 24],
      borderColor: '#22d3ee',
      tension: 0.3,
      fill: true,
      backgroundColor: 'rgba(34, 211, 238, 0.16)',
    },
  ],
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Admin dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Enterprise support analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Monitor tickets, AI performance, recovery demand, and human approval workload from one operations view.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
          <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{metric.label}</p>
              <Icon size={19} className="text-emerald-300" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
            <p className={`mt-2 text-sm ${metric.change.startsWith('-') ? 'text-amber-300' : 'text-emerald-400'}`}>{metric.change} this month</p>
          </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Issue category analysis</h2>
          <div className="mt-6 h-72">
            <Bar data={issueData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Recovery requests</h2>
          <div className="mt-6 h-72">
            <Doughnut
              data={{
                labels: ['Amazon', 'Gmail', 'GitHub', 'Microsoft', 'Company apps'],
                datasets: [{ data: [18, 22, 14, 16, 10], backgroundColor: ['#22d3ee', '#818cf8', '#34d399', '#f59e0b', '#ef4444'] }],
              }}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Resolution trend</h2>
          <div className="mt-6 h-72">
            <Line data={resolutionData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Live AI operations</h2>
            <Users size={19} className="text-emerald-300" />
          </div>
          <div className="mt-4 space-y-3">
            {aiLogs.map((log) => (
              <div key={`${log.ticket}-${log.time}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{log.agent}</p>
                  <span className="text-xs text-zinc-500">{log.time}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{log.ticket}: {log.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-100">Human approval queue</p>
            <p className="mt-1 text-sm text-amber-100/80">{tickets.filter((ticket) => ticket.status === 'Waiting Approval').length} ticket needs human review before account recovery or critical remediation can continue.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
