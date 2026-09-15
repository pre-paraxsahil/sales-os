'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  PhoneCall,
  MessageSquare,
  Eye,
  ExternalLink,
  Edit3,
  CalendarCheck,
  CheckCircle2,
  Bell,
  XCircle,
  Filter,
  X,
  Search,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { CalendarEvent } from '@/lib/calendar/salesCalendarEngine';
import { cn } from '@/lib/utils';

interface ManageScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onRefresh: () => void;
  onOpenEventDetails: (event: CalendarEvent) => void;
  onOpenCallLogger: (leadId?: string | null) => void;
  onOpenWhatsApp: (leadId?: string | null) => void;
}

export const ManageScheduleModal: React.FC<ManageScheduleModalProps> = ({
  isOpen,
  onClose,
  events,
  onRefresh,
  onOpenEventDetails,
  onOpenCallLogger,
  onOpenWhatsApp,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<CalendarEvent | null>(null);
  const [newDateTime, setNewDateTime] = useState<string>('');
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Edit Notes state
  const [editNotesTarget, setEditNotesTarget] = useState<CalendarEvent | null>(null);
  const [notesText, setNotesText] = useState<string>('');
  const [editNotesLoading, setEditNotesLoading] = useState<boolean>(false);

  // Change Reminder state
  const [reminderTarget, setReminderTarget] = useState<CalendarEvent | null>(null);
  const [reminderLeadMins, setReminderLeadMins] = useState<number>(10);
  const [reminderLoading, setReminderLoading] = useState<boolean>(false);

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Perform API Action
  const handleItemAction = async (
    event: CalendarEvent,
    action: 'MARK_DONE' | 'CANCEL' | 'SNOOZE' | 'RESCHEDULE' | 'CHANGE_REMINDER' | 'EDIT_NOTES',
    extraPayload?: any
  ) => {
    try {
      setLoadingItemId(event.id);
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sourceEntity: event.sourceEntity,
          ...extraPayload,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to process action.' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error.' };
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget || !newDateTime) return;
    setRescheduleLoading(true);
    setRescheduleError(null);

    const result = await handleItemAction(rescheduleTarget, 'RESCHEDULE', {
      newStartTime: new Date(newDateTime).toISOString(),
      durationMinutes: rescheduleTarget.durationMinutes,
      bufferMinutes: rescheduleTarget.bufferMinutes,
    });

    setRescheduleLoading(false);
    if (result.success) {
      setRescheduleTarget(null);
    } else {
      setRescheduleError(result.error);
    }
  };

  const handleNotesSubmit = async () => {
    if (!editNotesTarget) return;
    setEditNotesLoading(true);
    const result = await handleItemAction(editNotesTarget, 'EDIT_NOTES', { notes: notesText });
    setEditNotesLoading(false);
    if (result.success) setEditNotesTarget(null);
  };

  const handleReminderSubmit = async () => {
    if (!reminderTarget) return;
    setReminderLoading(true);
    const result = await handleItemAction(reminderTarget, 'CHANGE_REMINDER', {
      reminderLeadMinutes: reminderLeadMins,
    });
    setReminderLoading(false);
    if (result.success) setReminderTarget(null);
  };

  // Filter items
  const filteredEvents = events.filter((ev) => {
    // Type Filter
    if (selectedTypeFilter !== 'ALL') {
      if (selectedTypeFilter === 'CALL' && ev.type !== 'CALL') return false;
      if (selectedTypeFilter === 'CALLBACK' && ev.type !== 'CALLBACK') return false;
      if (selectedTypeFilter === 'DEMO' && ev.type !== 'DEMO') return false;
      if (selectedTypeFilter === 'FOLLOW_UP' && ev.type !== 'FOLLOW_UP') return false;
      if (selectedTypeFilter === 'SEND_DETAILS' && ev.type !== 'SEND_DETAILS') return false;
      if (selectedTypeFilter === 'TASK' && ev.type !== 'TASK') return false;
      if (selectedTypeFilter === 'CLOSING' && ev.type !== 'CLOSING') return false;
      if (selectedTypeFilter === 'SAMPLE' && ev.type !== 'SAMPLE') return false;
      if (selectedTypeFilter === 'QUOTATION' && ev.type !== 'QUOTATION') return false;
      if (selectedTypeFilter === 'LUNCH' && ev.type !== 'LUNCH') return false;
    }

    // Status Filter
    if (selectedStatusFilter !== 'ALL') {
      if (selectedStatusFilter === 'SCHEDULED' && ev.status !== 'SCHEDULED' && ev.status !== 'IN_PROGRESS') return false;
      if (selectedStatusFilter === 'COMPLETED' && ev.status !== 'COMPLETED') return false;
      if (selectedStatusFilter === 'MISSED' && ev.status !== 'MISSED') return false;
      if (selectedStatusFilter === 'CANCELLED' && ev.status !== 'CANCELLED') return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchLead = (ev.lead?.title || ev.lead?.contactName || ev.lead?.businessName || '').toLowerCase().includes(q);
      const matchNotes = (ev.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLead && !matchNotes) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Manage Complete Sales Schedule</h2>
              <p className="text-xs text-slate-500 font-medium">
                View, call, WhatsApp, reschedule, complete, snooze, or change reminders across all items.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity, lead name, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
            >
              <option value="ALL">All Item Types ({events.length})</option>
              <option value="CALL">Calls</option>
              <option value="CALLBACK">Callbacks</option>
              <option value="DEMO">Demos</option>
              <option value="FOLLOW_UP">Follow-ups</option>
              <option value="SEND_DETAILS">Send Details</option>
              <option value="TASK">Tasks</option>
              <option value="CLOSING">Closing Calls</option>
              <option value="SAMPLE">Sample Follow-ups</option>
              <option value="QUOTATION">Quotation Follow-ups</option>
              <option value="LUNCH">Schedule Blocks / Rest</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled / In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="MISSED">Missed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <CalendarIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No matching schedule items found.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search or filter options.</p>
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const startStr = ev.startTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });
              const dateStr = ev.startTime.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={ev.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white shadow-2xs hover:border-indigo-300',
                    ev.status === 'COMPLETED'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : ev.status === 'MISSED'
                      ? 'border-rose-200 bg-rose-50/20'
                      : ev.status === 'CANCELLED'
                      ? 'border-slate-200 opacity-60'
                      : 'border-slate-200'
                  )}
                >
                  {/* Left Metadata */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="font-mono font-bold text-slate-700 shrink-0 w-24 text-[11px] bg-slate-100 px-2 py-1.5 rounded-xl text-center border border-slate-200">
                      <div>{startStr}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{dateStr}</div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">{ev.title}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase',
                            ev.type === 'DEMO'
                              ? 'bg-violet-100 text-violet-800'
                              : ev.type === 'CALL' || ev.type === 'CALLBACK'
                              ? 'bg-indigo-100 text-indigo-800'
                              : ev.type === 'FOLLOW_UP'
                              ? 'bg-sky-100 text-sky-800'
                              : ev.type === 'LUNCH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {ev.type}
                        </span>

                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                            ev.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.status === 'MISSED'
                              ? 'bg-rose-100 text-rose-800'
                              : ev.status === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {ev.status}
                        </span>
                      </div>

                      {ev.lead && (
                        <div className="text-[11px] text-slate-600 mt-1 font-medium flex items-center gap-1.5">
                          <span>👤 {ev.lead.contactName || ev.lead.businessName || ev.lead.title}</span>
                          {ev.lead.phone && <span className="text-slate-400 font-mono">• {ev.lead.phone}</span>}
                        </div>
                      )}

                      {ev.notes && <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">{ev.notes}</p>}
                    </div>
                  </div>

                  {/* 10 Standard Action Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end md:self-center shrink-0">
                    
                    {/* 1. View */}
                    <button
                      onClick={() => onOpenEventDetails(ev)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition flex items-center gap-1 text-[11px]"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-600" /> View
                    </button>

                    {/* 2. Open Lead */}
                    {ev.leadId && (
                      <Link
                        href={`/leads/${ev.leadId}`}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition flex items-center gap-1 text-[11px] border border-indigo-200/60"
                        title="Open Lead Profile"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Lead
                      </Link>
                    )}

                    {/* 3. Call */}
                    {ev.leadId && (
                      <button
                        onClick={() => onOpenCallLogger(ev.leadId)}
                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-bold transition flex items-center gap-1 text-[11px] shadow-2xs"
                        title="Call Lead"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> Call
                      </button>
                    )}

                    {/* 4. WhatsApp */}
                    {ev.leadId && (
                      <button
                        onClick={() => onOpenWhatsApp(ev.leadId)}
                        className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1 text-[11px]"
                        title="WhatsApp Lead"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> WA
                      </button>
                    )}

                    {/* 5. Edit Notes */}
                    <button
                      onClick={() => {
                        setEditNotesTarget(ev);
                        setNotesText(ev.notes || '');
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                      title="Edit Notes"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {/* 6. Reschedule */}
                    <button
                      onClick={() => {
                        setRescheduleTarget(ev);
                        const localIso = new Date(ev.startTime.getTime() - ev.startTime.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16);
                        setNewDateTime(localIso);
                        setRescheduleError(null);
                      }}
                      className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
                      title="Reschedule"
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                    </button>

                    {/* 7. Complete */}
                    {ev.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleItemAction(ev, 'MARK_DONE')}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-bold transition flex items-center gap-1 text-[11px] shadow-2xs"
                        title="Mark Complete"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done
                      </button>
                    )}

                    {/* 8. Snooze */}
                    <button
                      onClick={() => handleItemAction(ev, 'SNOOZE', { snoozeMinutes: 15 })}
                      className="p-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition"
                      title="Snooze 15m"
                    >
                      <Clock className="h-3.5 w-3.5" /> Snooze
                    </button>

                    {/* 9. Change Reminder */}
                    <button
                      onClick={() => {
                        setReminderTarget(ev);
                        setReminderLeadMins(10);
                      }}
                      className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 transition"
                      title="Change Reminder"
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </button>

                    {/* 10. Cancel */}
                    {ev.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleItemAction(ev, 'CANCEL')}
                        className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition"
                        title="Cancel Booking"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sub-Modal: Reschedule */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Reschedule: {rescheduleTarget.title}</h3>
            {rescheduleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" /> {rescheduleError}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select New Date & Time</label>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRescheduleTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                disabled={rescheduleLoading}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-2xs"
              >
                {rescheduleLoading ? 'Checking...' : 'Save Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Edit Notes */}
      {editNotesTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Edit Notes: {editNotesTarget.title}</h3>
            <textarea
              rows={3}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Enter activity notes..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditNotesTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleNotesSubmit}
                disabled={editNotesLoading}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-2xs"
              >
                {editNotesLoading ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Change Reminder */}
      {reminderTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Change Reminder Lead Time</h3>
            <p className="text-xs text-slate-500">How long before {reminderTarget.title} should you be reminded?</p>
            <select
              value={reminderLeadMins}
              onChange={(e) => setReminderLeadMins(Number(e.target.value))}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 font-semibold"
            >
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReminderTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReminderSubmit}
                disabled={reminderLoading}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-2xs"
              >
                {reminderLoading ? 'Updating...' : 'Set Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
