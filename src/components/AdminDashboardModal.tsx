import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Shield,
  Bell,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Lock,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Terminal,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Radio,
} from 'lucide-react';
import { JournalCategory, NotificationTriggerReason, AdminAuditLog } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isAdmin: boolean;
  onSimulateRoleChange?: (role: 'superadmin' | 'admin' | 'user') => void;
  activeRole?: 'superadmin' | 'admin' | 'user';
}

interface TelemetryData {
  status: string;
  bootstrappedAdmin: string;
  uptimeSeconds: number;
  memory: {
    rssMb: string;
    heapUsedMb: string;
    heapTotalMb: string;
  };
  circuitBreaker: {
    isOpen: boolean;
  };
  rateLimiting: {
    activeBuckets: number;
    capacityPerBucket: number;
  };
  integrations: {
    slackConfigured: boolean;
    discordConfigured: boolean;
    emailConfigured: boolean;
  };
  totalAuditLogs: number;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
  onSimulateRoleChange,
  activeRole = 'superadmin',
}) => {
  const [activeTab, setActiveTab] = useState<'rbac' | 'notifications' | 'telemetry' | 'audit'>('rbac');

  // Notification Config State
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [slackUrl, setSlackUrl] = useState('');
  const [showSlackUrl, setShowSlackUrl] = useState(false);

  const [discordEnabled, setDiscordEnabled] = useState(true);
  const [discordUrl, setDiscordUrl] = useState('');
  const [showDiscordUrl, setShowDiscordUrl] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailEndpoint, setEmailEndpoint] = useState(currentUser?.email || 'gaudhamanaadhithyiaan@gmail.com');

  const [triggerCategories, setTriggerCategories] = useState<JournalCategory[]>([
    'Goal Setting',
    'Decision Making',
  ]);
  const [notifyOnCrisis, setNotifyOnCrisis] = useState(true);
  const [notifyOnKeyInsights, setNotifyOnKeyInsights] = useState(true);

  // Testing & Status State
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    channel: string;
    success: boolean;
    status?: number;
    message: string;
  } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Telemetry & Audit Logs
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Payload Schema Preview Tab
  const [schemaPreviewTab, setSchemaPreviewTab] = useState<'slack' | 'discord' | 'email'>('slack');

  useEffect(() => {
    if (!isOpen) return;

    // Fetch Notification Configuration from Server
    fetch('/api/notifications/config')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSlackEnabled(data.slackEnabled ?? true);
          setDiscordEnabled(data.discordEnabled ?? true);
          setEmailEnabled(data.emailEnabled ?? true);
          if (data.emailEndpoint) setEmailEndpoint(data.emailEndpoint);
          if (data.triggerCategories) setTriggerCategories(data.triggerCategories);
          if (typeof data.notifyOnCrisis === 'boolean') setNotifyOnCrisis(data.notifyOnCrisis);
          if (typeof data.notifyOnKeyInsights === 'boolean') setNotifyOnKeyInsights(data.notifyOnKeyInsights);
        }
      })
      .catch((err) => console.warn('Failed to load notification config:', err));

    // Fetch System Telemetry
    fetchTelemetry();

    // Fetch Audit Logs
    fetchAuditLogs();
  }, [isOpen]);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/admin/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.warn('Failed to fetch telemetry:', err);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveNotificationConfig = async () => {
    setIsSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackEnabled,
          slackWebhookUrl: slackUrl || undefined,
          discordEnabled,
          discordWebhookUrl: discordUrl || undefined,
          emailEnabled,
          emailEndpoint,
          triggerCategories,
          notifyOnCrisis,
          notifyOnKeyInsights,
          actorUid: currentUser?.uid || 'admin',
          actorEmail: currentUser?.email || 'gaudhamanaadhithyiaan@gmail.com',
        }),
      });
      if (res.ok) {
        setConfigSaveSuccess(true);
        setTimeout(() => setConfigSaveSuccess(false), 3000);
        fetchTelemetry();
        fetchAuditLogs();
      }
    } catch (e) {
      console.error('Failed to save notification preferences:', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestWebhook = async (channel: 'slack' | 'discord' | 'email') => {
    setIsTestingWebhook(true);
    setTestResult(null);
    try {
      const targetUrl = channel === 'slack' ? slackUrl : channel === 'discord' ? discordUrl : undefined;
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          webhookUrl: targetUrl || undefined,
        }),
      });
      const data = await res.json();
      const channelResult = data.channels?.[channel];
      setTestResult({
        channel: channel.toUpperCase(),
        success: channelResult?.success ?? data.success,
        status: channelResult?.status,
        message: channelResult?.success
          ? `Successfully transmitted verification test payload to ${channel.toUpperCase()}!`
          : (channelResult?.error || data.error || 'Failed to dispatch webhook.'),
      });
      fetchAuditLogs();
    } catch (err: any) {
      setTestResult({
        channel: channel.toUpperCase(),
        success: false,
        message: err.message || 'Network error during test dispatch.',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const toggleCategory = (cat: JournalCategory) => {
    if (triggerCategories.includes(cat)) {
      setTriggerCategories(triggerCategories.filter((c) => c !== cat));
    } else {
      setTriggerCategories([...triggerCategories, cat]);
    }
  };

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesFilter = auditFilter === 'ALL' || log.severity === auditFilter;
    const matchesSearch =
      auditSearch === '' ||
      log.eventType.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(auditSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `reflectai-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Sample Slack Block Kit JSON Preview
  const sampleSlackPreview = {
    text: 'ReflectAI Alert: Launch AI Enclave Strategy (GOAL_SETTING)',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎯 ReflectAI Parsed Reflection Alert', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Title:* Launch AI Enclave Strategy\n*Category:* Goal Setting | *Event:* `GOAL_SETTING` | *Mood:* ⚡ Energized',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Executive Summary:*\n>Synthesized quarterly objectives for cryptographic privacy and zero-trust telemetry.',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Key Insights:*\n• Finalize hardware-backed enclave worker.\n• Configure external webhook notification egress.\n• Complete OWASP LLM Top 10 threat audits.',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🔒 _Zero-Knowledge Privacy Guard • PII Sanitized • Entry ID: `e7f29a01` • UTC ISO_',
          },
        ],
      },
    ],
  };

  // Sample Discord Rich Embed JSON Preview
  const sampleDiscordPreview = {
    username: 'ReflectAI Guardian',
    embeds: [
      {
        title: '📔 Launch AI Enclave Strategy',
        description: 'Synthesized quarterly objectives for cryptographic privacy and zero-trust telemetry.',
        color: 3066993,
        fields: [
          { name: 'Category', value: 'Goal Setting', inline: true },
          { name: 'Trigger Reason', value: '`GOAL_SETTING`', inline: true },
          { name: 'Mood', value: '⚡ Energized', inline: true },
          {
            name: 'Key Insights',
            value: '• Finalize hardware-backed enclave worker.\n• Configure external webhook notification egress.\n• Complete OWASP LLM Top 10 threat audits.',
          },
        ],
        footer: { text: 'ReflectAI Zero-Trust Enclave • Military-Grade DLP Sanitization' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return (
    <div
      id="admin-dashboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">Admin Control Center</h2>
                <span className="text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-semibold border border-indigo-200">
                  RBAC & Directives
                </span>
                <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Active
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-1">
                Enforced Role Security • External Webhook Integrations • Real-Time Audit Logs
              </p>
            </div>
          </div>
          <button
            id="close-admin-dashboard-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors flex items-center justify-center shrink-0 ml-2"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-white px-4 sm:px-6 gap-1 sm:gap-2 pt-2 text-xs font-semibold select-none overflow-x-auto no-scrollbar shrink-0">
          <button
            id="tab-rbac"
            type="button"
            onClick={() => setActiveTab('rbac')}
            className={`flex items-center gap-2 pb-3 px-2.5 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'rbac'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Role-Based Access Control</span>
          </button>
          <button
            id="tab-notifications"
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 pb-3 px-2.5 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>External Webhooks</span>
          </button>
          <button
            id="tab-telemetry"
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 pb-3 px-2.5 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Telemetry</span>
          </button>
          <button
            id="tab-audit"
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 pb-3 px-2.5 sm:px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-stone-50/50">
          {/* TAB 1: RBAC & ADMIN ROLES DIRECTIVE */}
          {activeTab === 'rbac' && (
            <div className="space-y-6">
              {/* Identity & Current Role Card */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          {currentUser?.displayName || 'Administrator Identity'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          {activeRole.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-mono">
                        {currentUser?.email || 'gaudhamanaadhithyiaan@gmail.com'}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Simulation Switcher for Testing */}
                  {onSimulateRoleChange && (
                    <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl text-xs">
                      <span className="text-stone-500 font-medium pl-1">Role Simulator:</span>
                      <button
                        type="button"
                        onClick={() => onSimulateRoleChange('superadmin')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          activeRole === 'superadmin' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        Super Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => onSimulateRoleChange('admin')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          activeRole === 'admin' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => onSimulateRoleChange('user')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          activeRole === 'user' ? 'bg-stone-800 text-white shadow-2xs' : 'text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        Standard User
                      </button>
                    </div>
                  )}
                </div>

                {/* Identity Verification Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Bootstrapped Admin Status</span>
                    <span className="font-semibold text-stone-900 flex items-center gap-1 mt-0.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Email Gate
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Enclave Memory Protection</span>
                    <span className="font-semibold text-stone-900 flex items-center gap-1 mt-0.5 text-indigo-700">
                      <Lock className="w-3.5 h-3.5" /> Web Worker AES-GCM
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">Auth UID</span>
                    <span className="font-mono text-stone-700 block mt-0.5 truncate" title={currentUser?.uid || 'local-root-admin'}>
                      {currentUser?.uid || 'local-root-admin'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RBAC Security Policy Matrix */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-stone-100/60 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                    Admin Roles Directive: RBAC Permission Matrix
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">Pillar 2: Defense-in-Depth</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold">
                        <th className="py-2.5 px-4">Capability / Operation</th>
                        <th className="py-2.5 px-3">Standard User</th>
                        <th className="py-2.5 px-3">Administrator</th>
                        <th className="py-2.5 px-3">Super Admin</th>
                        <th className="py-2.5 px-4">Security Enforcement Layer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Read/Write Own Encrypted Reflections</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">Firestore Owner Path Guard</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Access System Telemetry & Health</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">❌ Denied</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">Express API Gateway Token Guard</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Reconfigure External Webhook URLs</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">❌ Denied</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">❌ Denied</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">Firestore Rules: `isAdmin()` Check</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Dispatch Manual Webhook Verification Tests</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">❌ Denied</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">SSRF & IP Sanitizer Filter</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Review System Audit Trail Logs</td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">❌ Denied</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Allowed</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">Append-Only Audit Enclave</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Zero-Knowledge Cryptographic Shredding</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Own Key</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-semibold">✅ Own Key</td>
                        <td className="py-2.5 px-3 text-amber-600 font-semibold">⚡ Full Reset</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">Web Worker In-Memory Key Enclave</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin Roles Directive Architecture Box */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 text-xs space-y-2 text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Terminal className="w-4 h-4" />
                  <span>Admin Roles Directive Security Specification</span>
                </div>
                <p className="leading-relaxed text-indigo-900/80">
                  Admin privileges are dynamically evaluated using the Denial-of-Wallet hierarchy:
                  (1) <code className="bg-white/80 px-1 rounded">isSignedIn()</code> check;
                  (2) Static parameter boundaries;
                  (3) Bootstrapped verified administrator token check against <code className="bg-white/80 px-1 rounded">gaudhamanaadhithyiaan@gmail.com</code> or trusted database documents.
                  Client-supplied role parameters are strictly rejected.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: EXTERNAL NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Notification Configuration & Credentials Form */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      External Notification Channels & Webhook Credentials
                    </h3>
                    <p className="text-xs text-stone-500">
                      Dispatches alerts to Slack, Discord, or Email when specific reflection types are parsed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {configSaveSuccess && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg animate-in fade-in flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                      </span>
                    )}
                    <button
                      id="save-notification-config-btn"
                      type="button"
                      onClick={handleSaveNotificationConfig}
                      disabled={isSavingConfig}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>

                {/* Slack Channel */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#4A154B] text-white flex items-center justify-center font-bold text-xs">
                        #
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900">Slack Incoming Webhook</span>
                        <span className="block text-[11px] text-stone-500">Block Kit formatting with DLP scrub</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTestWebhook('slack')}
                        disabled={isTestingWebhook}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        Test Slack
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slackEnabled}
                          onChange={(e) => setSlackEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showSlackUrl ? 'text' : 'password'}
                        value={slackUrl}
                        onChange={(e) => setSlackUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/T00/B00/XXXX (or configured via SLACK_WEBHOOK_URL)"
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSlackUrl(!showSlackUrl)}
                        className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700"
                      >
                        {showSlackUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discord Channel */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#5865F2] text-white flex items-center justify-center font-bold text-xs">
                        🎮
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900">Discord Webhook</span>
                        <span className="block text-[11px] text-stone-500">Rich Embed cards with severity colors</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTestWebhook('discord')}
                        disabled={isTestingWebhook}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        Test Discord
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={discordEnabled}
                          onChange={(e) => setDiscordEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showDiscordUrl ? 'text' : 'password'}
                        value={discordUrl}
                        onChange={(e) => setDiscordUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/XXXX/YYYY (or configured via DISCORD_WEBHOOK_URL)"
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDiscordUrl(!showDiscordUrl)}
                        className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700"
                      >
                        {showDiscordUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Gateway */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold text-xs">
                        ✉️
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-900">Email Gateway Dispatch</span>
                        <span className="block text-[11px] text-stone-500">Delivers executive reflection digests</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTestWebhook('email')}
                        disabled={isTestingWebhook}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        Test Email
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          onChange={(e) => setEmailEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  <input
                    type="email"
                    value={emailEndpoint}
                    onChange={(e) => setEmailEndpoint(e.target.value)}
                    placeholder="alert-recipient@reflections.app"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Test Dispatch Result Feedback Banner */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">
                        [{testResult.channel}] {testResult.success ? 'Verification Passed' : 'Dispatch Failed'}
                        {testResult.status ? ` (HTTP ${testResult.status})` : ''}
                      </span>
                      <p className="text-[11px] mt-0.5 opacity-90">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Trigger Rules */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900">
                  Parsing Trigger Rules & DLP Privacy Guard
                </h3>
                <p className="text-xs text-stone-500">
                  Select which entry types trigger automated notifications. Raw conversation transcripts are blocked by the Data Loss Prevention (DLP) shield; only scrubbed metadata and key takeaways are dispatched.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggerCategories.includes('Goal Setting')}
                      onChange={() => toggleCategory('Goal Setting')}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">🎯 Goal Setting Reflections</span>
                      <span className="text-[11px] text-stone-500">Dispatches milestone & action plan digests</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={triggerCategories.includes('Decision Making')}
                      onChange={() => toggleCategory('Decision Making')}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">💡 Decision Making Reflections</span>
                      <span className="text-[11px] text-stone-500">Dispatches trade-off and strategic choice summaries</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyOnCrisis}
                      onChange={(e) => setNotifyOnCrisis(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-rose-900 block">🚨 Distress & Safe Mode Activations</span>
                      <span className="text-[11px] text-stone-500">Dispatches high-priority crisis assistance alert</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={notifyOnKeyInsights}
                      onChange={(e) => setNotifyOnKeyInsights(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">⚡ Executive Key Insights Synthesized</span>
                      <span className="text-[11px] text-stone-500">Dispatches Gemini-generated takeaways</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Standardized Payload Schema Inspector */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-stone-100/60 border-b border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-stone-600" />
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                      Standardized Notification Payload Schema Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSchemaPreviewTab('slack')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        schemaPreviewTab === 'slack' ? 'bg-indigo-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Slack Block Kit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchemaPreviewTab('discord')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        schemaPreviewTab === 'discord' ? 'bg-indigo-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Discord Embed
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-stone-900 text-stone-200 text-xs font-mono overflow-x-auto max-h-56">
                  <pre>
                    {schemaPreviewTab === 'slack'
                      ? JSON.stringify(sampleSlackPreview, null, 2)
                      : JSON.stringify(sampleDiscordPreview, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY & HEALTH */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">System Telemetry & Operational Health</h3>
                  <p className="text-xs text-stone-500">Live metrics from Node.js runtime and rate limiting buckets</p>
                </div>
                <button
                  type="button"
                  onClick={fetchTelemetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
                </button>
              </div>

              {telemetry ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <span className="text-stone-500 text-[11px] block">Service Status</span>
                    <span className="font-bold text-base text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Operational
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                      Uptime: {telemetry.uptimeSeconds}s
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <span className="text-stone-500 text-[11px] block">AI Circuit Breaker</span>
                    <span
                      className={`font-bold text-base flex items-center gap-1.5 ${
                        telemetry.circuitBreaker.isOpen ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {telemetry.circuitBreaker.isOpen ? '⚠️ OPEN (Tripped)' : '🛡️ CLOSED (Healthy)'}
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                      Fallback Ladder: 4 Models
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <span className="text-stone-500 text-[11px] block">Memory Heap (Used/Total)</span>
                    <span className="font-bold text-base text-stone-900 font-mono">
                      {telemetry.memory.heapUsedMb} / {telemetry.memory.heapTotalMb} MB
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                      RSS: {telemetry.memory.rssMb} MB
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-1">
                    <span className="text-stone-500 text-[11px] block">Rate Limiter (Token-Bucket)</span>
                    <span className="font-bold text-base text-indigo-700 font-mono">
                      {telemetry.rateLimiting.capacityPerBucket} Tokens/Cap
                    </span>
                    <span className="text-[11px] text-stone-400 block mt-1 font-mono">
                      Active Buckets: {telemetry.rateLimiting.activeBuckets}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 text-xs">Loading telemetry...</div>
              )}

              {/* Integration Status Box */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                  Integration Egress Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span className="text-stone-700 font-medium">Slack Egress</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Configured
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span className="text-stone-700 font-medium">Discord Egress</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Configured
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span className="text-stone-700 font-medium">Email Alert Gateway</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Tamper-Evident Administrative & Security Audit Trail
                  </h3>
                  <p className="text-xs text-stone-500">
                    Append-only ledger recording administrative decisions, DLP redactions, and webhook dispatches.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchAuditLogs}
                    className="p-2 rounded-xl text-stone-600 bg-white border border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs"
                    title="Refresh Audit Logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAuditLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search events, actors, or details..."
                  className="w-full sm:flex-1 text-xs px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1 text-xs self-start sm:self-auto">
                  {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setAuditFilter(tier)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                        auditFilter === tier
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log List */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden max-h-[50vh] overflow-y-auto divide-y divide-stone-100">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs">No audit events match your filter.</div>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const isCrit = log.severity === 'CRITICAL';
                    const isWarn = log.severity === 'WARNING';
                    return (
                      <div key={log.id} className="p-3.5 hover:bg-stone-50/80 transition-colors space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isCrit
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isWarn
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-stone-100 text-stone-800 border border-stone-200'
                              }`}
                            >
                              {log.severity}
                            </span>
                            <span className="font-mono font-bold text-stone-900">{log.eventType}</span>
                          </div>
                          <span className="text-[11px] text-stone-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-700 leading-relaxed font-sans">{log.details}</p>
                        <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono pt-0.5">
                          <span>Actor: {log.actorEmail || log.actorUid}</span>
                          <span>• ID: {log.id}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-100/80 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>ReflectAI Zero-Knowledge Administrative Boundary</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors shadow-2xs"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
