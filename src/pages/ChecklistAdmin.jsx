import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, Clock3, UserRound } from "lucide-react";
import { apiFetch } from "@/api";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const idOf = (x) => String(x?.id || x?._id || "");
const nameOf = (x) => x?.name || x?.full_name || x?.email || "User";
const managersOnly = (u) => u?.role === "manager";

export default function ChecklistAdmin() {
  const { user, activeStoreId } = useOutletContext();
  const [date, setDate] = useState(today());
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [entries, setEntries] = useState([]);
  const [openUser, setOpenUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = ["owner", "admin"].includes(user?.role);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const store = activeStoreId && activeStoreId !== "all" ? `&store_id=${encodeURIComponent(activeStoreId)}` : "";
        const [u, c, e] = await Promise.all([
          apiFetch("/api/users"),
          apiFetch(`/api/checklists?active=true${store}`),
          apiFetch(`/api/checklists/entries/list?date=${encodeURIComponent(date)}${store}`),
        ]);
        if (cancelled) return;
        setUsers(u?.items || []);
        setTemplates(c?.items || []);
        setEntries(e?.items || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load checklist data");
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [isAdmin, date, activeStoreId]);

  const managers = useMemo(() => users.filter(managersOnly).filter(u => {
    if (!activeStoreId || activeStoreId === "all") return true;
    return !u?.store_id || String(u.store_id) === String(activeStoreId);
  }), [users, activeStoreId]);

  const applicable = (c, u) => {
    if (activeStoreId && activeStoreId !== "all" && c?.store_id && !c?.all_stores && String(c.store_id) !== String(activeStoreId)) return false;
    return c?.all_managers ? true : String(c?.manager_id || "") === idOf(u);
  };

  const checklistsFor = (u) => templates.filter(c => c?.active !== false && applicable(c, u));
  const entryFor = (c, u) => entries.find(e => String(e?.checklist_id) === idOf(c) && String(e?.manager_id) === idOf(u));
  const progress = (entry) => {
    if (!entry) return 0;
    if (typeof entry.completed_pct === "number") return Math.max(0, Math.min(100, entry.completed_pct));
    const items = Array.isArray(entry.items) ? entry.items : [];
    return items.length ? Math.round(items.filter(x => x?.done).length / items.length * 100) : 0;
  };

  const total = managers.reduce((n,u) => n + checklistsFor(u).length, 0);
  const completed = managers.reduce((n,u) => n + checklistsFor(u).filter(c => progress(entryFor(c,u)) === 100).length, 0);

  if (!isAdmin) return <div className="p-6 text-sm text-slate-500">You do not have permission to view Checklist Admin.</div>;

  return <div className="p-4 space-y-4">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div><p className="text-sm text-slate-500">Checklist Admin</p><h2 className="text-2xl font-bold text-slate-900">Today's Checklists</h2></div>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2"><CalendarDays className="w-4 h-4 text-slate-500" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm outline-none bg-transparent" /></div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <Summary icon={UserRound} label="Users" value={managers.length} />
      <Summary icon={ClipboardCheck} label="Checklists" value={total} />
      <Summary icon={CheckCircle2} label="Completed" value={completed} />
    </div>

    {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

    {loading ? <div className="bg-white rounded-2xl border p-12 text-center text-sm text-slate-400">Loading checklists...</div> : managers.length === 0 ? <div className="bg-white rounded-2xl border p-12 text-center text-sm text-slate-400">No managers found.</div> : <div className="space-y-3">
      {managers.map(u => {
        const cs = checklistsFor(u), uid = idOf(u), open = openUser === uid;
        const done = cs.filter(c => progress(entryFor(c,u)) === 100).length;
        return <div key={uid} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setOpenUser(open ? null : uid)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><UserRound className="w-5 h-5 text-slate-600" /></div><div><p className="font-semibold text-slate-900">{nameOf(u)}</p><p className="text-xs text-slate-500">{cs.length} checklist{cs.length !== 1 ? "s" : ""} · {done} completed</p></div></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{done}/{cs.length}</span>{open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}</div>
          </button>
          {open && <div className="border-t border-slate-100 p-4 space-y-3">
            {cs.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No checklist assigned to this user.</p> : cs.map(c => {
              const e = entryFor(c,u), pct = progress(e), items = Array.isArray(e?.items) ? e.items : (c?.items || []).map(x => ({ label:x?.label || "", done:false }));
              return <div key={idOf(c)} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-sm text-slate-900">{c?.name || "Checklist"}</p><p className="text-xs text-slate-400">{e ? "Checklist started" : "Not started"}</p></div><span className={`text-xs font-bold px-2 py-1 rounded-full ${pct === 100 ? "bg-green-100 text-green-700" : pct > 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{pct}%</span></div>
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-800 rounded-full" style={{width:`${pct}%`}} /></div>
                <div className="mt-3 space-y-2">{items.map((item,i) => <div key={i} className="flex items-center gap-2 text-sm">{item?.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock3 className="w-4 h-4 text-slate-300" />}<span className={item?.done ? "text-slate-700" : "text-slate-400"}>{item?.label || "Checklist item"}</span></div>)}</div>
              </div>;
            })}
          </div>}
        </div>;
      })}
    </div>}
  </div>;
}

function Summary({icon:Icon,label,value}) { return <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"><div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center mb-2"><Icon className="w-5 h-5" /></div><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>; }
