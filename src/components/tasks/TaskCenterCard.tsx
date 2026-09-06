'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  RotateCcw,
  Edit2,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED';
  dueDate?: string | null;
  completedAt?: string | null;
  leadId?: string | null;
  lead?: {
    id: string;
    title: string;
    contact?: { name: string; phone?: string | null } | null;
    business?: { name: string } | null;
  } | null;
}

const PRESET_TASK_TYPES = [
  '📞 09:30 — Cold Calls Session',
  '🔄 11:00 — Follow-ups & Hot Leads',
  '💻 14:00 — Demo Preparation & Delivery',
  '📦 16:00 — Send Quotations & Samples',
  '🤝 17:30 — Review Inbounds & Callbacks',
];

interface TaskCenterCardProps {
  onTaskChange?: () => void;
  className?: string;
}

export const TaskCenterCard: React.FC<TaskCenterCardProps> = ({ onTaskChange, className }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [counts, setCounts] = useState<{ total: number; pending: number; completed: number }>({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'PENDING' | 'COMPLETED'>('TODAY');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDueTime, setNewDueTime] = useState('');
  const [newLeadId, setNewLeadId] = useState('');
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [searchedLeads, setSearchedLeads] = useState<any[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks?filter=${filter}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTasks(json.data.tasks || []);
          if (json.data.counts) {
            setCounts(json.data.counts);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Lead search effect for linking leads to tasks
  useEffect(() => {
    if (!leadSearchTerm || leadSearchTerm.trim().length < 2) {
      setSearchedLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads?search=${encodeURIComponent(leadSearchTerm.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSearchedLeads(json.data.slice(0, 5));
          }
        }
      } catch (e) {}
    }, 200);
    return () => clearTimeout(timer);
  }, [leadSearchTerm]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      let combinedIsoDate: string | null = null;
      if (newDueDate) {
        const timePart = newDueTime ? `${newDueTime}:00` : '18:00:00';
        combinedIsoDate = new Date(`${newDueDate}T${timePart}+05:30`).toISOString();
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPriority,
          dueDate: combinedIsoDate,
          leadId: newLeadId || null,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        setNewDueTime('');
        setNewLeadId('');
        setSelectedLeadName('');
        setLeadSearchTerm('');
        setShowCreateForm(false);
        await fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === 'COMPLETED' ? new Date().toISOString() : null,
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      fetchTasks();
    }
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditPriority(task.priority);
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      setEditDueDate(d.toISOString().slice(0, 10));
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      setEditDueTime(`${hours}:${mins}`);
    } else {
      setEditDueDate('');
      setEditDueTime('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    try {
      let combinedIsoDate: string | null = null;
      if (editDueDate) {
        const timePart = editDueTime ? `${editDueTime}:00` : '18:00:00';
        combinedIsoDate = new Date(`${editDueDate}T${timePart}+05:30`).toISOString();
      }

      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          priority: editPriority,
          dueDate: combinedIsoDate,
        }),
      });

      if (res.ok) {
        setEditingTask(null);
        await fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleSnoozeTask = async (taskId: string, daysAhead: number) => {
    try {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      d.setHours(11, 0, 0, 0);

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate: d.toISOString(),
          status: 'PENDING',
        }),
      });

      if (res.ok) {
        await fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to reschedule task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        fetchTasks();
        onTaskChange?.();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const completionPercent =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                My Task Center & Action Items
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {counts.pending} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assign and check off daily sales actions, prep tasks & customer commitments.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreateForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* End of Day Completion Progress Bar */}
      {counts.total > 0 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-700">Daily Execution Pace:</span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {counts.completed} of {counts.total} Done ({completionPercent}%)
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                completionPercent === 100
                  ? 'bg-emerald-500'
                  : completionPercent >= 50
                  ? 'bg-indigo-600'
                  : 'bg-amber-500'
              )}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Inline Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateTask}
          className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Add New Action Item</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  setNewDueDate(todayStr);
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setNewDueDate(d.toISOString().slice(0, 10));
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Quick Presets with times */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_TASK_TYPES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  const clean = preset.replace(/^[^\w]+/, '').trim();
                  const timeMatch = clean.match(/^(\d{2}:\d{2})\s*—\s*(.+)$/);
                  if (timeMatch) {
                    setNewDueTime(timeMatch[1]);
                    setNewTitle(timeMatch[2]);
                  } else {
                    setNewTitle(clean);
                  }
                }}
                className="px-2 py-1 rounded-lg bg-white border border-indigo-100 hover:border-indigo-300 text-[11px] text-slate-700 hover:text-indigo-900 font-medium transition shadow-2xs cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task Title (e.g. 09:30 — Cold Calls or Call Rajesh for Enterprise ERP demo closing)"
              required
              className="w-full rounded-lg bg-white border border-indigo-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full rounded-lg bg-white border border-indigo-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time (Optional)</label>
              <input
                type="time"
                value={newDueTime}
                onChange={(e) => setNewDueTime(e.target.value)}
                placeholder="e.g. 11:00"
                className="w-full rounded-lg bg-white border border-indigo-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full rounded-lg bg-white border border-indigo-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent ⚡</option>
              </select>
            </div>
          </div>

          {/* Optional Lead Link Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Link to Lead / Customer (Optional)
            </label>
            {selectedLeadName ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-semibold">
                <span>Linked: {selectedLeadName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewLeadId('');
                    setSelectedLeadName('');
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  placeholder="Search lead title or customer name to link..."
                  className="w-full rounded-lg bg-white border border-indigo-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
                {searchedLeads.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-indigo-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                    {searchedLeads.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setNewLeadId(l.id);
                          setSelectedLeadName(l.business?.name || l.contact?.name || l.title);
                          setSearchedLeads([]);
                          setLeadSearchTerm('');
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-900">{l.title}</span>
                        <span className="text-[10px] text-slate-500">{l.contact?.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional notes or details..."
              rows={2}
              className="w-full rounded-lg bg-white border border-indigo-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-2 overflow-x-auto">
        {(['TODAY', 'TOMORROW', 'PENDING', 'COMPLETED', 'ALL'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
              filter === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab === 'TODAY'
              ? 'Today'
              : tab === 'TOMORROW'
              ? 'Tomorrow'
              : tab === 'PENDING'
              ? 'Pending'
              : tab === 'COMPLETED'
              ? 'Completed'
              : 'All Tasks'}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <div className="font-semibold text-slate-700">No tasks planned</div>
            <div className="text-[11px] text-slate-400">
              Click <strong className="text-indigo-600">+ New Task</strong> to create today&apos;s schedule and action items.
            </div>
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className={cn(
                  'p-3 rounded-xl border flex items-start justify-between gap-3 transition-all',
                  isDone
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-75'
                    : task.priority === 'URGENT'
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Clickable Checkbox */}
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className={cn(
                      'mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-indigo-500 bg-white'
                    )}
                    title={isDone ? 'Mark Pending' : 'Mark Done'}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-semibold text-xs text-slate-900',
                          isDone && 'line-through text-slate-500'
                        )}
                      >
                        {task.title}
                      </span>

                      {/* Priority Tag */}
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider',
                          task.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {task.priority}
                      </span>

                      {/* Linked Lead Info with Link */}
                      {task.lead && (
                        <Link
                          href={`/leads?leadId=${task.lead.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 hover:bg-indigo-100 transition"
                        >
                          <span>{task.lead.business?.name || task.lead.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono flex-wrap">
                        <Clock className="w-3 h-3" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !== '18:00' && (
                          <span className="text-slate-600 font-bold">
                            at {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {isDone && task.completedAt && (
                          <span className="text-emerald-600 font-semibold ml-2">
                            ✓ Done {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer',
                      isDone
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-2xs'
                    )}
                  >
                    {isDone ? (
                      <>
                        <RotateCcw className="w-3 h-3" /> Undo
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleSnoozeTask(task.id, 1)}
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                    title="Reschedule to Tomorrow"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-900">Edit Task</h4>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time</label>
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                  className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as any)}
                className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent ⚡</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
