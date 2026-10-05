import React, { useState, useEffect } from "react";
import { apiFetch } from "@/api";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSOPs({ stores = [], user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceStore, setSourceStore] = useState("all");
  const [destStore, setDestStore] = useState("");
  const [copying, setCopying] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch("/api/tasks/templates");
      setTemplates(res.items || []);
    } catch (error) {
      console.error("Failed to load SOP templates:", error);
      toast.error(
        "Failed to load templates: " +
          (error.message || "error")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sourceTemplates = templates.filter(
    (template) =>
      sourceStore === "all" ||
      template.store_id === sourceStore
  );

  const doCopy = async () => {
    if (!destStore) {
      toast.error("Select a destination store");
      return;
    }

    if (sourceTemplates.length === 0) {
      toast.error(
        "No templates to copy from source"
      );
      return;
    }

    const confirmed = window.confirm(
      `Copy ${sourceTemplates.length} template(s) to the selected store? Manager assignments will be cleared for the new store to assign its own.`
    );

    if (!confirmed) return;

    setCopying(true);

    try {
      const dest = stores.find(
        (store) => store.id === destStore
      );

      if (!dest) {
        throw new Error(
          "Destination store not found"
        );
      }

      await apiFetch("/api/tasks/templates/copy", {
        method: "POST",
        body: JSON.stringify({
          source_store_id: sourceStore,
          destination_store_id: dest.id,
          destination_store_name: dest.name,
        }),
      });

      toast.success(
        `Copied ${sourceTemplates.length} template(s) to ${dest.name}`
      );

      await load();
    } catch (error) {
      console.error("Copy failed:", error);

      toast.error(
        "Copy failed: " +
          (error.message || "error")
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Copy SOP templates to a store
        </h3>

        <p className="text-xs text-slate-500">
          Copy task templates from a source so a new
          store starts with your SOPs already loaded.
          Manager assignments are cleared for the new
          store to assign its own.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Source
            </label>

            <select
              value={sourceStore}
              onChange={(event) =>
                setSourceStore(event.target.value)
              }
              className="input"
            >
              <option value="all">
                All stores
              </option>

              {stores.map((store) => (
                <option
                  key={store.id}
                  value={store.id}
                >
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Destination
            </label>

            <select
              value={destStore}
              onChange={(event) =>
                setDestStore(event.target.value)
              }
              className="input"
            >
              <option value="">
                Select store
              </option>

              {stores.map((store) => (
                <option
                  key={store.id}
                  value={store.id}
                >
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={doCopy}
          disabled={copying}
          className="w-full bg-slate-900 text-white font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {copying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Copying...
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy {sourceTemplates.length} template(s)
            </>
          )}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Templates ({templates.length})
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">
            Loading...
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {template.template_name}
                  </p>

                  <p className="text-[11px] text-slate-400 truncate">
                    {template.title}
                  </p>
                </div>

                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
                  {template.store_name || "—"}
                </span>
              </div>
            ))}

            {templates.length === 0 && (
              <p className="text-sm text-slate-400">
                No templates yet. Save a task as a
                template first.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}