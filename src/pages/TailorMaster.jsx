import React, { useState, useEffect, useCallback } from "react";



import { apiFetch } from "@/api";



import { useLang } from "@/lib/i18n";



import { getCountdown, countdownColors, useNowTicker } from "@/lib/countdown";



import { usePermissions } from "@/hooks/usePermissions";



import { toast } from "sonner";



import { Plus, Search, X, Scissors, Pencil, Trash2, UserPlus } from "lucide-react";







export default function TailorMaster() {



  const { t } = useLang();



  const { can } = usePermissions();



  const [tab, setTab] = useState("alterations");



  const [me, setMe] = useState(null);



  const [storeId, setStoreId] = useState("");



  const [stores, setStores] = useState([]);



  const [showForm, setShowForm] = useState(null); // "alter" | "stitch"







  useEffect(() => {



    (async () => {



      try {



        const response = await apiFetch("/api/auth/me");



const user = response.user || response;



setMe(user);



        const sid = localStorage.getItem("klassic_store");



        setStoreId(sid || "all");



        const sr = await apiFetch("/api/tailor/stores");



        setStores(sr.items || []);



      } catch (e) { console.error(e); }



    })();



  }, []);







  const formStoreId = storeId && storeId !== "all" ? storeId : (stores[0]?.id || "");



  const [refreshKey, setRefreshKey] = useState(0);



  const onFormClose = () => { setShowForm(null); setRefreshKey((k) => k + 1); };







  const canAccess = me && ["owner", "admin", "tailoring_manager", "tailoring_operator"].includes(me.role);







  if (!canAccess && me) {



    return <div className="p-8 text-center text-slate-400 text-sm">You do not have access to this section.</div>;



  }



  if (!me) return <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>;







  return (



    <div className="p-4 space-y-4">



      <div className="flex items-center justify-between">



        <h2 className="text-xl font-bold text-slate-900">{t("tailor")}</h2>



        {tab !== "stats" && can("tailor", "create") && (



        <button onClick={() => setShowForm(tab === "alterations" ? "alter" : "stitch")} className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl">



          <Plus className="w-4 h-4" /> {t("newEntry")}



        </button>



        )}



      </div>







      {/* Tabs */}



      <div className="flex bg-slate-100 rounded-xl p-1">



        {[{ k: "alterations", l: t("alterations") }, { k: "stitching", l: t("pantStitching") }, { k: "tailors", l: t("tailorList") }, { k: "stats", l: "Tailor Stats" }].map((tb) => (



          <button



            key={tb.k}



            onClick={() => setTab(tb.k)}



            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${tab === tb.k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}



          >{tb.l}</button>



        ))}



      </div>







      {tab === "alterations" && <Alterations storeId={storeId} me={me} refreshKey={refreshKey} showForm={showForm === "alter"} setShowForm={setShowForm} />}



      {tab === "stitching" && <PantStitching storeId={storeId} me={me} refreshKey={refreshKey} showForm={showForm === "stitch"} setShowForm={setShowForm} />}



      {tab === "tailors" && <TailorList storeId={formStoreId} stores={stores} me={me} refreshKey={refreshKey} />}



      {tab === "stats" && <TailorStats storeId={storeId} />}







      {showForm && showForm !== "tailors" && (



        tab === "alterations"



          ? <AlterationForm storeId={formStoreId} stores={stores} me={me} onClose={onFormClose} />



          : <StitchForm storeId={formStoreId} stores={stores} me={me} onClose={onFormClose} />



      )}



    </div>



  );



}







/* ============ ALTERATIONS ============ */



function Alterations({ storeId, me, refreshKey, showForm, setShowForm }) {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [assigning, setAssigning] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useNowTicker(1000);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (storeId && storeId !== "all") params.set("store_id", storeId);

      const active = await apiFetch(`/api/tailor/alterations?${params.toString()}`);

      const completedParams = new URLSearchParams(params);
      completedParams.set("status", "Completed");
      const done = await apiFetch(`/api/tailor/alterations?${completedParams.toString()}`);

      const tailorParams = new URLSearchParams();
      if (storeId && storeId !== "all") tailorParams.set("store_id", storeId);
      tailorParams.set("active", "true");
      const tailorResponse = await apiFetch(
        `/api/tailor/tailors?${tailorParams.toString()}`
      );

      const normalize = (item) => ({
        ...item,
        id: item.id || item._id?.toString(),
      });

      setItems(
        (active.items || [])
          .filter((x) => x.status === "Received")
          .map(normalize)
      );
      setCompleted((done.items || []).map(normalize));
      setTailors((tailorResponse.items || []).map(normalize));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const sorted = [...items].sort(
    (a, b) =>
      getCountdown(a.received_at, a.time_limit_hours).msLeft -
      getCountdown(b.received_at, b.time_limit_hours).msLeft
  );

  const filtered = sorted.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      it.bill_number?.toLowerCase().includes(q) ||
      it.customer_name?.toLowerCase().includes(q) ||
      it.mobile_number?.includes(q)
    );
  });

  const markCompleted = async (item) => {
    try {
      const now = new Date().toISOString();
      const onTime =
        new Date(now).getTime() <=
        new Date(item.received_at).getTime() +
          item.time_limit_hours * 3600000;

      await apiFetch(`/api/tailor/alterations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "Completed",
completed_at: now,
on_time: onTime,

completed_by_id: me.id,
completed_by_name: me.full_name,

operator_id: me.id,
operator_name: me.full_name,

$push: {
  history: {
    action: "Completed",
    by_id: me.id,
    by_name: me.full_name,
    at: now,
  },
},
        }),
      });

      await logAudit("Alteration Completed", item, me);
      toast.success(t("markCompleted"));
      load();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const markDelivered = async (item) => {
    if (!window.confirm(t("confirmDeliver"))) return;

    try {
      await apiFetch(`/api/tailor/alterations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "Delivered",
          delivered_at: new Date().toISOString(),
        }),
      });

      await logAudit("Alteration Delivered", item, me);
      toast.success(t("markDelivered"));
      load();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const assignExternalTailor = async (item, tailor) => {
    if (!tailor?.id) {
      toast.error("Select external tailor");
      return;
    }

    try {
      await apiFetch(`/api/tailor/alterations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          external_tailor_id: tailor.id,
          external_tailor_name: tailor.name,
          external_tailor_mobile: tailor.mobile || "",
          external_tailor_assigned_at: new Date().toISOString(),
          external_tailor_status: "Assigned",
        }),
      });

      await logAudit(
        "Alteration Assigned to External Tailor",
        {
          id: item.id,
          name: item.bill_number,
        },
        me,
        `${tailor.name} assigned`
      );

      toast.success(`Assigned to ${tailor.name}`);
      setAssigning(null);
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to assign tailor");
    }
  };

  return (
    <div className="space-y-3">
      <SearchBar value={search} onChange={setSearch} />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-8">
          Loading...
        </div>
      ) : (
        <>
          {filtered.length === 0 && <Empty />}

          {filtered.map((it) => {
            const cd = getCountdown(it.received_at, it.time_limit_hours);

            return (
              <div
                key={it.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      #{it.bill_number}
                    </p>
                    <p className="text-sm text-slate-600">
                      {it.customer_name} · {it.product} ×{it.quantity}
                    </p>

                    {it.alteration_note && (
                      <p className="text-xs text-slate-400 mt-1">
                        {it.alteration_note}
                      </p>
                    )}

                    {it.external_tailor_name && (
                      <p className="text-xs font-semibold text-indigo-600 mt-2">
                        ✂ External Tailor: {it.external_tailor_name}
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-base font-mono font-bold px-2.5 py-1 rounded-lg border ${countdownColors[cd.status]}`}
                  >
                    {cd.text}{" "}
                    {cd.status === "red" ? t("overdueMsg") : t("left")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => setAssigning(it)}
                    className="bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {it.external_tailor_name ? "Change Tailor" : "External Tailor"}
                  </button>

                  <button
                    onClick={() => markCompleted(it)}
                    className="bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl"
                  >
                    {t("markCompleted")}
                  </button>
                </div>
              </div>
            );
          })}

          {completed.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">
                {t("readyForPickup")}
              </h3>

              {completed.map((it) => (
                <div
                  key={it.id}
                  className="bg-white rounded-2xl p-4 border border-slate-100 mb-2 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      #{it.bill_number}
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.customer_name}
                    </p>
                    {it.external_tailor_name && (
                      <p className="text-[11px] text-indigo-600 font-medium">
                        ✂ {it.external_tailor_name}
                      </p>
                    )}
                    <p
                      className={`text-[11px] font-medium ${
                        it.on_time ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {it.on_time ? "On time" : "Late"}
                    </p>
                  </div>

                  <button
                    onClick={() => markDelivered(it)}
                    className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
                  >
                    {t("markDelivered")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {assigning && (
        <Modal
          title={`Assign External Tailor · #${assigning.bill_number}`}
          onClose={() => setAssigning(null)}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Select the external tailor who will handle this alteration.
            </p>

            {tailors.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No active tailor found for this store. Add a tailor from the
                Tailor List first.
              </div>
            ) : (
              <div className="space-y-2">
                {tailors.map((tailor) => (
                  <button
                    key={tailor.id}
                    onClick={() => assignExternalTailor(assigning, tailor)}
                    className="w-full text-left border border-slate-200 rounded-xl p-3 hover:bg-slate-50"
                  >
                    <p className="font-semibold text-slate-900">
                      {tailor.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tailor.mobile || "No mobile"} ·{" "}
                      {tailor.address || "No address"}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setAssigning(null)}
              className="w-full border border-slate-200 text-slate-600 text-sm font-semibold py-3 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ PANT STITCHING ============ */



function PantStitching({ storeId, me, refreshKey }) {



  const { t } = useLang();



  const [items, setItems] = useState([]);



  const [tab, setTab] = useState("Received");



  const [search, setSearch] = useState("");



  const [loading, setLoading] = useState(true);



  const [showGive, setShowGive] = useState(false);



  const [tailors, setTailors] = useState([]);



  useNowTicker(1000);







  const load = useCallback(async () => {



    try {



      const params = new URLSearchParams();

      if (storeId && storeId !== "all") params.set("store_id", storeId);



      const res = await apiFetch(`/api/tailor/pant-stitch?${params.toString()}`);

      const allowedStatuses = ["Received", "Given to Tailor", "Completed"];

      const normalize = (item) => ({ ...item, id: item.id || item._id?.toString() });

      setItems((res.items || []).filter((x) => allowedStatuses.includes(x.status)).map(normalize));



      const tailorParams = new URLSearchParams();

      if (storeId && storeId !== "all") tailorParams.set("store_id", storeId);

      tailorParams.set("active", "true");

      const tr = await apiFetch(`/api/tailor/tailors?${tailorParams.toString()}`);

      setTailors((tr.items || []).map(normalize));



    } catch (e) { console.error(e); }



    finally { setLoading(false); }



  }, [storeId]);







  useEffect(() => { load(); }, [load, refreshKey]);







  const byStatus = (s) => items.filter((it) => it.status === s)



    .sort((a, b) => getCountdown(a.received_at, a.time_limit_hours, a.completed_at).msLeft - getCountdown(b.received_at, b.time_limit_hours, b.completed_at).msLeft);







  const filtered = (list) => list.filter((it) => {



    if (!search) return true;



    const q = search.toLowerCase();



    return it.bill_number?.toLowerCase().includes(q) || it.customer_name?.toLowerCase().includes(q) || it.mobile_number?.includes(q);



  });







  const giveToTailor = async (tailorId) => {



    const selected = byStatus("Received").filter((it) => it._sel);



    if (!tailorId || selected.length === 0) { toast.error("Select tailor and items"); return; }



    const tailor = tailors.find((t) => t.id === tailorId);



    try {



      await apiFetch("/api/tailor/pant-stitch/bulk-update", {

        method: "POST",

        body: JSON.stringify({

          ids: selected.map((it) => it.id),

          update: {

            status: "Given to Tailor",

            tailor_id: tailorId,

            tailor_name: tailor?.name,

            given_to_tailor_at: new Date().toISOString(),

          },

        }),

      });



      await logAudit("Pants Given to Tailor", { id: tailorId, name: tailor?.name }, me, `${selected.length} pants`);



      toast.success("Given to tailor");



      setShowGive(false);



      load();



    } catch (e) { toast.error("Failed"); }



  };







  const markCompleted = async (it) => {



    try {



      const now = new Date().toISOString();



      const onTime = new Date(now).getTime() <= new Date(it.received_at).getTime() + it.time_limit_hours * 3600000;



      await apiFetch(`/api/tailor/pant-stitch/${it.id}`, {

        method: "PATCH",

        body: JSON.stringify({ status: "Completed", completed_at: now, on_time: onTime }),

      });



      await logAudit("Pant Completed", it, me);



      toast.success(t("markCompleted"));



      load();



    } catch (e) { toast.error("Failed"); }



  };







  const markDelivered = async (it) => {



    if (!window.confirm(t("confirmDeliver"))) return;



    try {



      await apiFetch(`/api/tailor/pant-stitch/${it.id}`, {

        method: "PATCH",

        body: JSON.stringify({ status: "Delivered", delivered_at: new Date().toISOString() }),

      });



      await logAudit("Pant Delivered", it, me);



      toast.success(t("markDelivered"));



      load();



    } catch (e) { toast.error("Failed"); }



  };







  const toggleSel = (id) => setItems((arr) => arr.map((it) => it.id === id ? { ...it, _sel: !it._sel } : it));







  const list = tab === "Received" ? filtered(byStatus("Received")) : tab === "Given to Tailor" ? filtered(byStatus("Given to Tailor")) : filtered(byStatus("Completed"));







  return (



    <div className="space-y-3">



      <SearchBar value={search} onChange={setSearch} />



      <div className="flex gap-2">



        {["Received", "Given to Tailor", "Completed"].map((s) => (



          <button key={s} onClick={() => setTab(s)} className={`text-xs px-3 py-1.5 rounded-full font-medium ${tab === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>



            {t(s.toLowerCase().replace(/\s/g, ""))} ({byStatus(s).length})



          </button>



        ))}



      </div>







      {tab === "Received" && byStatus("Received").length > 0 && (



        <button onClick={() => setShowGive(true)} className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">



          <Scissors className="w-4 h-4" /> Give to Tailor



        </button>



      )}







      {loading ? <div className="text-center text-slate-400 text-sm py-8">Loading...</div> : (



        <>



          {list.length === 0 && <Empty />}



          {list.map((it) => {



            const cd = getCountdown(it.received_at, it.time_limit_hours, it.completed_at);



            return (



              <div key={it.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">



                <div className="flex items-start justify-between">



                  <div className="flex items-start gap-2">



                    {tab === "Received" && (



                      <input type="checkbox" checked={it._sel || false} onChange={() => toggleSel(it.id)} className="w-5 h-5 mt-1" />



                    )}



                    <div>



                      <p className="text-lg font-bold text-slate-900">#{it.bill_number}</p>



                      <p className="text-sm text-slate-600">{it.customer_name}</p>



                      {it.tailor_name && <p className="text-xs text-slate-500 mt-0.5">✂ {it.tailor_name}</p>}



                      {it.fit_type && <p className="text-[11px] text-slate-400">{it.fit_type} · W{it.waist} L{it.length}</p>}



                    </div>



                  </div>



                  {it.status !== "Completed" && (



                    <span className={`text-base font-mono font-bold px-2.5 py-1 rounded-lg border ${countdownColors[cd.status]}`}>



                      {cd.text} {cd.status === "red" ? t("overdueMsg") : t("left")}



                    </span>



                  )}



                  {it.status === "Completed" && (



                    <span className={`text-[11px] font-bold ${it.on_time ? "text-green-600" : "text-red-600"}`}>{it.on_time ? "On time" : "Late"}</span>



                  )}



                </div>



                {it.status === "Given to Tailor" && (



                  <button onClick={() => markCompleted(it)} className="w-full mt-3 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl">{t("markCompleted")}</button>



                )}



                {it.status === "Completed" && (



                  <button onClick={() => markDelivered(it)} className="w-full mt-3 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl">{t("markDelivered")}</button>



                )}



              </div>



            );



          })}



        </>



      )}







      {showGive && (



        <Modal title="Give to Tailor" onClose={() => setShowGive(false)}>



          <GiveTailorForm tailors={tailors} onSubmit={giveToTailor} />



        </Modal>



      )}



    </div>



  );



}







function GiveTailorForm({ tailors, onSubmit }) {



  const [tailorId, setTailorId] = useState("");



  return (



    <div className="space-y-3">



      <select value={tailorId} onChange={(e) => setTailorId(e.target.value)} className="input">



        <option value="">Select tailor</option>



        {tailors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}



      </select>



      <p className="text-xs text-slate-500">All selected pants from Received list will be assigned.</p>



      <button onClick={() => onSubmit(tailorId)} className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl">Confirm</button>



    </div>



  );



}







/* ============ TAILOR LIST ============ */



function TailorList({ storeId, stores, me, refreshKey }) {
  const [tailors, setTailors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTailor, setEditingTailor] = useState(null);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (storeId && storeId !== "all") params.set("store_id", storeId);

      const res = await apiFetch(
        `/api/tailor/tailors?${params.toString()}`
      );

      setTailors(
        (res.items || []).map((item) => ({
          ...item,
          id: item.id || item._id?.toString(),
        }))
      );
    } catch (e) {
      console.error(e);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openAdd = () => {
    setEditingTailor(null);
    setForm({ name: "", mobile: "", address: "" });
    setShowForm(true);
  };

  const openEdit = (tailor) => {
    setEditingTailor(tailor);
    setForm({
      name: tailor.name || "",
      mobile: tailor.mobile || "",
      address: tailor.address || "",
    });
    setShowForm(true);
  };

  const saveTailor = async () => {
    if (!form.name.trim()) {
      toast.error("Name required");
      return;
    }

    try {
      if (editingTailor) {
        await apiFetch(`/api/tailor/tailors/${editingTailor.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            mobile: form.mobile.trim(),
            address: form.address.trim(),
          }),
        });

        await logAudit(
          "Tailor Modified",
          { id: editingTailor.id, name: form.name },
          me
        );

        toast.success("Tailor updated");
      } else {
        await apiFetch("/api/tailor/tailors", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            store_id: storeId,
            active: true,
          }),
        });

        await logAudit("Tailor Added", { name: form.name }, me);
        toast.success("Tailor added");
      }

      setForm({ name: "", mobile: "", address: "" });
      setEditingTailor(null);
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to save tailor");
    }
  };

  const toggleActive = async (tailor) => {
    try {
      await apiFetch(`/api/tailor/tailors/${tailor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !tailor.active }),
      });

      toast.success(tailor.active ? "Tailor deactivated" : "Tailor activated");
      load();
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  const deleteTailor = async (tailor) => {
    if (
      !window.confirm(
        `Delete ${tailor.name}? This tailor will no longer be available for new assignments.`
      )
    ) {
      return;
    }

    try {
      try {
        await apiFetch(`/api/tailor/tailors/${tailor.id}`, {
          method: "DELETE",
        });
      } catch (deleteError) {
        // Backward-compatible fallback if the current backend does not yet
        // have DELETE: deactivate the tailor instead.
        await apiFetch(`/api/tailor/tailors/${tailor.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: false }),
        });
      }

      await logAudit("Tailor Deleted", tailor, me);
      toast.success("Tailor deleted");
      load();
    } catch (e) {
      toast.error(e?.message || "Failed to delete tailor");
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={openAdd}
        className="w-full bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Tailor
      </button>

      {tailors.map((tailor) => (
        <div
          key={tailor.id}
          className="bg-white rounded-2xl p-4 border border-slate-100"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{tailor.name}</p>
              <p className="text-xs text-slate-500">
                {tailor.mobile || "No mobile"} ·{" "}
                {tailor.address || "No address"}
              </p>
            </div>

            <span
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                tailor.active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {tailor.active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => openEdit(tailor)}
              className="border border-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" /> Modify
            </button>

            <button
              onClick={() => toggleActive(tailor)}
              className="border border-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-xl"
            >
              {tailor.active ? "Deactivate" : "Activate"}
            </button>

            <button
              onClick={() => deleteTailor(tailor)}
              className="border border-red-200 text-red-600 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      ))}

      {tailors.length === 0 && <Empty />}

      {showForm && (
        <Modal
          title={editingTailor ? "Modify Tailor" : "Add Tailor"}
          onClose={() => {
            setShowForm(false);
            setEditingTailor(null);
          }}
        >
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Name"
              className="input"
            />

            <input
              value={form.mobile}
              onChange={(e) =>
                setForm({ ...form, mobile: e.target.value })
              }
              placeholder="Mobile"
              className="input"
            />

            <input
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
              placeholder="Address"
              className="input"
            />

            <button
              onClick={saveTailor}
              className="w-full bg-slate-900 text-white text-sm font-semibold py-3 rounded-xl"
            >
              {editingTailor ? "Update Tailor" : "Save Tailor"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============ TAILOR STATS ============ */



function TailorStats({ storeId }) {



  const [tailors, setTailors] = useState([]);



  const [current, setCurrent] = useState([]);



  const [monthly, setMonthly] = useState([]);



  const [loading, setLoading] = useState(true);







  useEffect(() => {



    (async () => {



      try {



        const params = new URLSearchParams();

        if (storeId && storeId !== "all") params.set("store_id", storeId);



        const res = await apiFetch(`/api/tailor/stats?${params.toString()}`);

        const normalize = (item) => ({ ...item, id: item.id || item._id?.toString() });

        setTailors((res.tailors || []).map(normalize));

        setCurrent(res.current || []);

        setMonthly(res.monthly || []);



      } catch (e) { console.error(e); }



      finally { setLoading(false); }



    })();



  }, [storeId]);







  const nameMap = {};



  tailors.forEach((t) => { nameMap[t.id] = t.name; });







  const currentRows = current.map((r) => ({ id: r.tailor_id, name: nameMap[r.tailor_id] || "Unassigned", count: r.count })).sort((a, b) => b.count - a.count);







  const months = {};



  monthly.forEach((r) => {



    const m = r.completed_at || "Unknown";



    if (!months[m]) months[m] = { month: m, rows: [] };



    months[m].rows.push({ id: r.tailor_id, name: nameMap[r.tailor_id] || "Unassigned", count: r.count });



  });



  const monthList = Object.values(months).sort((a, b) => b.month.localeCompare(a.month));



  monthList.forEach((m) => m.rows.sort((a, b) => b.count - a.count));







  if (loading) return <div className="text-center text-slate-400 text-sm py-8">Loading...</div>;







  return (



    <div className="space-y-4">



      <div>



        <h3 className="text-sm font-bold text-slate-800 mb-2">Currently With Tailors</h3>



        {currentRows.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">No pants currently assigned</p> : (



          <div className="space-y-2">



            {currentRows.map((r) => (



              <div key={r.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">



                <span className="text-sm font-semibold text-slate-800">{r.name}</span>



                <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">{r.count} pant{r.count !== 1 ? "s" : ""}</span>



              </div>



            ))}



          </div>



        )}



      </div>







      <div>



        <h3 className="text-sm font-bold text-slate-800 mb-2">Monthly Stitching by Tailor</h3>



        {monthList.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">No completed stitching yet</p> : (



          <div className="space-y-3">



            {monthList.map((m) => (



              <div key={m.month} className="bg-white rounded-2xl p-4 border border-slate-100">



                <p className="text-xs font-bold text-slate-500 mb-2">{m.month}</p>



                <div className="space-y-1.5">



                  {m.rows.map((r) => (



                    <div key={r.id + r.count} className="flex items-center justify-between text-sm">



                      <span className="text-slate-700">{r.name}</span>



                      <span className="font-semibold text-slate-900">{r.count}</span>



                    </div>



                  ))}



                </div>



              </div>



            ))}



          </div>



        )}



      </div>



    </div>



  );



}







/* ============ FORMS ============ */



function AlterationForm({ storeId, stores, me, onClose }) {



  const { t } = useLang();



  const [selStore, setSelStore] = useState(storeId || "");



  const [form, setForm] = useState({ bill_number: "", customer_name: "", mobile_number: "", product: "Pant", quantity: 1, alteration_note: "", time_limit_hours: 2 });







  const submit = async () => {



    if (!form.bill_number || !form.customer_name) { toast.error("Bill no & name required"); return; }



    try {



      const now = new Date().toISOString();



      await apiFetch("/api/tailor/alterations", {

        method: "POST",

        body: JSON.stringify({ ...form, store_id: selStore, status: "Received", received_at: now, operator_id: me.id, operator_name: me.full_name }),

      });



      await logAudit("Alteration Received", { name: form.bill_number }, me);



      toast.success("Saved");



      onClose();



    } catch (e) { toast.error("Failed"); }



  };







  return (



    <Modal title={t("alterations")} onClose={onClose}>



      {stores?.length > 1 && (



        <select value={selStore} onChange={(e) => setSelStore(e.target.value)} className="input">



          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}



        </select>



      )}



      <input value={form.bill_number} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} placeholder={t("billNumber")} className="input" />



      <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder={t("customerName")} className="input" />



      <input value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} placeholder={t("mobileNumber")} className="input" />



      <div className="flex gap-2">



        <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="input flex-1">



          {["Pant", "Shirt", "Jeans", "Kurta", "Blazer/Coat", "Other"].map((p) => <option key={p}>{p}</option>)}



        </select>



        <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} className="input w-20" />



      </div>



      <textarea value={form.alteration_note} onChange={(e) => setForm({ ...form, alteration_note: e.target.value })} placeholder={t("alterationNote")} className="input min-h-[70px]" />



      <div>



        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{t("timeLimit")}</label>



        <div className="grid grid-cols-4 gap-2">



          {[1, 2, 5, 15].map((h) => (



            <button key={h} onClick={() => setForm({ ...form, time_limit_hours: h })} className={`py-2.5 rounded-xl text-sm font-semibold ${form.time_limit_hours === h ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{h}h</button>



          ))}



        </div>



      </div>



      <button onClick={submit} className="w-full bg-slate-900 text-white text-sm font-semibold py-3.5 rounded-xl">{t("save")}</button>



    </Modal>



  );



}







function StitchForm({ storeId, stores, me, onClose }) {



  const { t } = useLang();



  const [selStore, setSelStore] = useState(storeId || "");



  const [form, setForm] = useState({ bill_number: "", customer_name: "", mobile_number: "", length: "", waist: "", seat_hip: "", thigh: "", knee: "", bottom: "", rise: "", fit_type: "Regular", notes: "", cloth_metres: "", time_limit_hours: 24 });







  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));







  const submit = async () => {



    if (!form.bill_number || !form.customer_name) { toast.error("Bill no & name required"); return; }



    try {



      const now = new Date().toISOString();



      const nums = ["length", "waist", "seat_hip", "thigh", "knee", "bottom", "rise", "cloth_metres"];



      const clean = { ...form };



      nums.forEach((n) => { if (clean[n] !== "") clean[n] = +clean[n]; else delete clean[n]; });



      await apiFetch("/api/tailor/pant-stitch", {

        method: "POST",

        body: JSON.stringify({ ...clean, store_id: selStore, status: "Received", received_at: now, operator_id: me.id, operator_name: me.full_name }),

      });



      await logAudit("Pant Stitch Received", { name: form.bill_number }, me);



      toast.success("Saved");



      onClose();



    } catch (e) { toast.error("Failed"); }



  };







  return (



    <Modal title={t("pantStitching")} onClose={onClose}>



      {stores?.length > 1 && (



        <select value={selStore} onChange={(e) => setSelStore(e.target.value)} className="input">



          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}



        </select>



      )}



      <input value={form.bill_number} onChange={(e) => set("bill_number", e.target.value)} placeholder={t("billNumber")} className="input" />



      <input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder={t("customerName")} className="input" />



      <input value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} placeholder={t("mobileNumber")} className="input" />



      <div className="grid grid-cols-3 gap-2">



        {["length", "waist", "seat_hip", "thigh", "knee", "bottom", "rise"].map((f) => (



          <input key={f} type="number" value={form[f]} onChange={(e) => set(f, e.target.value)} placeholder={`${f} (in)`} className="input" />



        ))}



      </div>



      <select value={form.fit_type} onChange={(e) => set("fit_type", e.target.value)} className="input">



        {["Slim", "Regular", "Relaxed"].map((f) => <option key={f}>{f}</option>)}



      </select>



      <input type="number" value={form.cloth_metres} onChange={(e) => set("cloth_metres", e.target.value)} placeholder="Cloth (metres)" className="input" />



      <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Special instructions" className="input min-h-[60px]" />



      <div>



        <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{t("timeLimit")}</label>



        <div className="grid grid-cols-4 gap-2">



          {[6, 12, 24, 48].map((h) => (



            <button key={h} onClick={() => set("time_limit_hours", h)} className={`py-2.5 rounded-xl text-sm font-semibold ${form.time_limit_hours === h ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{h}h</button>



          ))}



        </div>



      </div>



      <button onClick={submit} className="w-full bg-slate-900 text-white text-sm font-semibold py-3.5 rounded-xl">{t("save")}</button>



    </Modal>



  );



}







/* ============ SHARED ============ */



async function logAudit(action, entity, me, extra) {

  try {

    await apiFetch("/api/tailor/audit", {

      method: "POST",

      body: JSON.stringify({

        module: "Tailor",

        action,

        entity_id: entity?.id || entity?._id || "",

        entity_name: entity?.name || entity?.bill_number || "",

        actor_id: me?.id || me?._id || "",

        actor_name: me?.full_name || me?.name || "",

        details: extra || "",

      }),

    });

  } catch (error) {

    console.error("Audit log failed:", error);

  }

}







function SearchBar({ value, onChange }) {



  return (



    <div className="relative">



      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />



      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search bill, name, mobile" className="input pl-9" />



    </div>



  );



}







function Empty() {



  return <div className="text-center py-12 text-slate-400"><Scissors className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No entries</p></div>;



}







function Modal({ title, onClose, children }) {



  return (



    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>



      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>



        <div className="flex items-center justify-between mb-1">



          <h3 className="font-bold text-slate-900">{title}</h3>



          <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>



        </div>



        {children}



      </div>



    </div>



  );



}