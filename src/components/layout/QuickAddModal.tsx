'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  PhoneCall,
  Calendar,
  Video,
  Clock,
  CheckSquare,
  DollarSign,
  FileSpreadsheet,
  Mic,
  ArrowRight,
  Search,
  Building,
  User,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadCreateModal } from '@/components/leads/LeadCreateModal';
import { QuickCallLoggerModal } from '@/components/calls/QuickCallLoggerModal';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const quickAddActions = [
  {
    id: 'new-lead',
    title: 'New Lead',
    description: 'Add a new prospect or contact to pipeline',
    icon: UserPlus,
    accent: 'border-indigo-500/30 text-indigo-400 bg-indigo-950/30',
  },
  {
    id: 'log-call',
    title: 'Log Call',
    description: 'Record notes and details from a completed phone call',
    icon: PhoneCall,
    accent: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30',
  },
  {
    id: 'schedule-call',
    title: 'Schedule Call',
    description: 'Set a future call slot on calendar',
    icon: Calendar,
    accent: 'border-sky-500/30 text-sky-400 bg-sky-950/30',
  },
  {
    id: 'schedule-demo',
    title: 'Schedule Demo',
    description: 'Book a product presentation or demo session',
    icon: Video,
    accent: 'border-violet-500/30 text-violet-400 bg-violet-950/30',
  },
  {
    id: 'add-follow-up',
    title: 'Add Follow-up',
    description: 'Set a high-priority follow-up reminder',
    icon: Clock,
    accent: 'border-amber-500/30 text-amber-400 bg-amber-950/30',
  },
  {
    id: 'add-task',
    title: 'Add Task',
    description: 'Create a quick task or action item',
    icon: CheckSquare,
    accent: 'border-slate-500/30 text-slate-300 bg-slate-800/40',
  },
  {
    id: 'add-sale',
    title: 'Add Sale',
    description: 'Record a closed deal and payment entry',
    icon: DollarSign,
    accent: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/40',
  },
  {
    id: 'import-excel-csv',
    title: 'Import Excel/CSV',
    description: 'Bulk import leads or call lists from file',
    icon: FileSpreadsheet,
    accent: 'border-teal-500/30 text-teal-300 bg-teal-950/30',
  },
  {
    id: 'upload-recording',
    title: 'Upload Recording',
    description: 'Upload audio recording for AI processing',
    icon: Mic,
    accent: 'border-rose-500/30 text-rose-300 bg-rose-950/30',
  },
];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose }) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Global Log Call search & select states
  const [leadSearch, setLeadSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<any | null>(null);
  const [isLeadCreateOpen, setIsLeadCreateOpen] = useState(false);

  // Debounced search for Log Call
  useEffect(() => {
    if (selectedAction !== 'log-call') return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = leadSearch ? `?search=${encodeURIComponent(leadSearch)}` : '';
        const res = await fetch(`/api/leads${query}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error('Error searching leads for global call log:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [leadSearch, selectedAction]);

  if (!isOpen) return null;

  const currentAction = quickAddActions.find((a) => a.id === selectedAction);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Quick Add
              </h2>
              <p className="text-xs text-slate-400">
                Select an action trigger to create or record entries in BroStartup Sales OS.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedAction(null);
                onClose();
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Selection List */}
          {!selectedAction ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
              {quickAddActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      if (action.id === 'new-lead') {
                        setIsLeadCreateOpen(true);
                      } else {
                        setSelectedAction(action.id);
                      }
                    }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all hover:scale-[1.01] hover:border-indigo-500/50 group',
                      action.accent
                    )}
                  >
                    <div className="rounded-md p-2 bg-slate-900/80 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">
                          {action.title}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : selectedAction === 'log-call' ? (
            /* Real Database Lead Search for Global Log Call */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-200">Log Call — Select Lead</h3>
                    <p className="text-[11px] text-slate-400">Search by customer name, business, or phone number</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-400 hover:text-indigo-400 underline"
                >
                  Back
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Type prospect name, business, or phone number..."
                  autoFocus
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Results List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {isSearching ? (
                  <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Searching database...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p>No leads found matching your search.</p>
                    <button
                      onClick={() => {
                        setSelectedAction(null);
                        setIsLeadCreateOpen(true);
                      }}
                      className="mt-2 text-indigo-400 hover:underline"
                    >
                      + Create New Lead Instead
                    </button>
                  </div>
                ) : (
                  searchResults.map((ld) => (
                    <button
                      key={ld.id}
                      onClick={() => {
                        setSelectedLeadForCall(ld);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-900 text-left transition-all group"
                    >
                      <div>
                        <span className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                          {ld.title}
                        </span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                          {ld.contact?.name && <span>{ld.contact.name}</span>}
                          {ld.contact?.phone && <span className="font-mono text-indigo-300">{ld.contact.phone}</span>}
                          {ld.business?.industry && <span>• {ld.business.industry}</span>}
                        </div>
                      </div>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        Select Lead →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Other actions placeholder */
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2.5">
                  {currentAction && (
                    <div className="rounded-md p-1.5 bg-slate-900">
                      <currentAction.icon className="h-4 w-4 text-indigo-400" />
                    </div>
                  )}
                  <span className="font-semibold text-sm text-slate-200">{currentAction?.title}</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-xs text-slate-400 hover:text-indigo-400 underline"
                >
                  Back to All Actions
                </button>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6 text-center">
                <div className="mx-auto max-w-sm space-y-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    {currentAction && <currentAction.icon className="h-5 w-5" />}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {currentAction?.title} Form
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This workflow is planned for upcoming scheduled builds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real Lead Create Modal */}
      <LeadCreateModal
        isOpen={isLeadCreateOpen}
        onClose={() => setIsLeadCreateOpen(false)}
        onSuccess={() => {
          setIsLeadCreateOpen(false);
          onClose();
        }}
      />

      {/* Real Quick Call Logger Modal when lead is selected */}
      {selectedLeadForCall && (
        <QuickCallLoggerModal
          isOpen={true}
          onClose={() => {
            setSelectedLeadForCall(null);
            setSelectedAction(null);
            onClose();
          }}
          leadId={selectedLeadForCall.id}
          leadTitle={selectedLeadForCall.title}
          contactName={selectedLeadForCall.contact?.name}
          initialTemperature={selectedLeadForCall.temperature}
          onSuccess={() => {
            setSelectedLeadForCall(null);
            setSelectedAction(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
