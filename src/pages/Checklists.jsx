import React, {
  useState,
  useEffect,
  useCallback,
} from "react";

import { apiFetch } from "@/api";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";

import {
  Plus,
  ListChecks,
} from "lucide-react";

import ChecklistForm from "@/components/checklists/ChecklistForm";
import ChecklistTickCard from "@/components/checklists/ChecklistTickCard";


export default function Checklists() {
  const { t } = useLang();
  const { can } = usePermissions();

  const [me, setMe] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [managers, setManagers] = useState([]);
  const [stores, setStores] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeStoreId, setActiveStoreId] = useState(
    localStorage.getItem("klassic_store") || "all"
  );


  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // --------------------------------------------------
      // CURRENT USER
      // --------------------------------------------------

      const meResponse = await apiFetch(
        "/api/auth/me"
      );

      const user =
        meResponse?.user ||
        meResponse;

      if (!user) {
        throw new Error(
          "Unable to load current user"
        );
      }

      setMe(user);

      const role =
        user?.role === "admin"
          ? "owner"
          : user?.role;


      // --------------------------------------------------
      // ACTIVE STORES
      // --------------------------------------------------

      try {
        const storeResponse =
          await apiFetch(
            "/api/stores?active=true&limit=50"
          );

        setStores(
          storeResponse?.items ||
          storeResponse?.stores ||
          []
        );
      } catch (storeError) {
        console.error(
          "Failed to load stores:",
          storeError
        );

        setStores([]);
      }


      // --------------------------------------------------
      // CHECKLISTS
      // --------------------------------------------------

      const params =
        new URLSearchParams();

      params.set(
        "active",
        "true"
      );


      if (role === "manager") {
        params.set(
          "manager_id",
          user?.id ||
          user?._id ||
          ""
        );

        params.set(
          "include_all_managers",
          "true"
        );
      }


      if (
        activeStoreId &&
        activeStoreId !== "all"
      ) {
        params.set(
          "store_id",
          activeStoreId
        );
      }


      params.set(
        "limit",
        role === "manager"
          ? "50"
          : "100"
      );

      params.set(
        "sort",
        "-createdAt"
      );


      const checklistResponse =
        await apiFetch(
          `/api/checklists?${params.toString()}`
        );


      setTemplates(
        checklistResponse?.items ||
        checklistResponse?.checklists ||
        []
      );


      // --------------------------------------------------
      // MANAGERS
      // --------------------------------------------------

      if (role !== "manager") {
        try {
          const userResponse =
            await apiFetch(
              "/api/users?role=manager&limit=100"
            );


          const managerUsers =
            userResponse?.items ||
            userResponse?.users ||
            [];


          setManagers(
            managerUsers.filter(
              (u) =>
                u?.role === "manager"
            )
          );

        } catch (userError) {
          console.error(
            "Failed to load managers:",
            userError
          );

          setManagers([]);
        }

      } else {
        setManagers([]);
      }

    } catch (error) {
      console.error(
        "Checklist loading failed:",
        error
      );

      setTemplates([]);

      setError(
        error?.message ||
        "Failed to load checklists"
      );

    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);


  useEffect(() => {
    load();
  }, [load]);


  // --------------------------------------------------
  // INITIAL LOADING
  // --------------------------------------------------

  if (!me && loading) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }


  // --------------------------------------------------
  // USER LOAD ERROR
  // --------------------------------------------------

  if (!me && error) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }


  // --------------------------------------------------
  // ROLE
  // --------------------------------------------------

  const role =
    me?.role === "admin"
      ? "owner"
      : me?.role;


  const isAdmin =
    ["owner", "mis"].includes(role);


  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="p-4 space-y-4">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <h2 className="text-xl font-bold text-slate-900">
          {t("checklists")}
        </h2>


        {(["owner", "mis"].includes(role) || can("checklists", "create")) && (
          <button
            onClick={() =>
              setShowForm(true)
            }
            className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />

            {t("newChecklist")}
          </button>
        )}

      </div>


      {/* CONTENT */}

      {loading ? (

        <div className="text-center text-slate-400 text-sm py-8">
          Loading...
        </div>

      ) : error ? (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          {error}

          <button
            onClick={load}
            className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>

      ) : templates.length === 0 ? (

        <div className="text-center py-12 text-slate-400">

          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />

          <p className="text-sm">
            No checklists
          </p>

        </div>

      ) : (

        <div className="space-y-3">

          {templates.map(
            (template) => (
              <ChecklistTickCard
                key={
                  template.id ||
                  template._id
                }
                template={template}
                me={me}
                isAdmin={isAdmin}
                onReload={load}
                onEdit={() =>
                  setEditing(template)
                }
              />
            )
          )}

        </div>
      )}


      {/* NEW CHECKLIST */}

      {showForm && (
        <ChecklistForm
          stores={stores}
          managers={managers}

          onClose={() =>
            setShowForm(false)
          }

          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}


      {/* EDIT CHECKLIST */}

      {editing && (
        <ChecklistForm
          stores={stores}
          managers={managers}
          editTemplate={editing}

          onClose={() =>
            setEditing(null)
          }

          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}

    </div>
  );
}