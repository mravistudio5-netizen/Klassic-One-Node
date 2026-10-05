import React, {
  useState,
  useEffect,
} from "react";

import { apiFetch } from "@/lib/api";

import { useLang } from "@/lib/i18n";

import {
  X,
  Plus,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";


export default function ChecklistForm({
  stores,
  managers,
  editTemplate,
  onClose,
  onDone,
}) {
  const { t } = useLang();

  const [me, setMe] = useState(null);

  const [form, setForm] = useState(() =>
    editTemplate
      ? {
          name: editTemplate.name || "",

          store_id:
            editTemplate.store_id || "",

          manager_id:
            editTemplate.manager_id || "",

          all_managers:
            !!editTemplate.all_managers,

          items: (
            editTemplate.items || []
          ).map((item) => ({
            label: item.label || "",
            required: !!item.required,
          })),
        }
      : {
          name: "",
          store_id: "",
          manager_id: "",
          all_managers: false,

          items: [
            {
              label: "",
              required: false,
            },
          ],
        }
  );


  /* =====================================================
     LOAD CURRENT USER
     ===================================================== */

  useEffect(() => {
    let alive = true;

    const loadUser = async () => {
      try {
        const response = await apiFetch(
          "/api/auth/me"
        );

        if (alive) {
          setMe(
            response?.user || null
          );
        }
      } catch (error) {
        console.error(
          "Failed to load current user:",
          error
        );
      }
    };

    loadUser();

    return () => {
      alive = false;
    };
  }, []);


  /* =====================================================
     FORM HELPERS
     ===================================================== */

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };


  const updateItem = (
    index,
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,

      items: current.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [key]: value,
              }
            : item
      ),
    }));
  };


  const addItem = () => {
    setForm((current) => ({
      ...current,

      items: [
        ...current.items,

        {
          label: "",
          required: false,
        },
      ],
    }));
  };


  const removeItem = (index) => {
    setForm((current) => ({
      ...current,

      items: current.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  };


  /* =====================================================
     SAVE CHECKLIST
     ===================================================== */

  const save = async () => {
    /* -----------------------------
       VALIDATION
       ----------------------------- */

    if (!form.name.trim()) {
      toast.error("Name required");
      return;
    }

    if (!form.store_id) {
      toast.error("Store required");
      return;
    }

    const items = form.items
      .filter(
        (item) =>
          item.label &&
          item.label.trim()
      )
      .map((item) => ({
        label: item.label.trim(),
        required: !!item.required,
      }));

    if (items.length === 0) {
      toast.error(
        "At least one item required"
      );
      return;
    }


    try {
      /* -----------------------------
         STORE
         ----------------------------- */

      const store = (
        stores || []
      ).find(
        (item) =>
          String(
            item.id || item._id
          ) ===
          String(form.store_id)
      );


      /* -----------------------------
         MANAGER
         ----------------------------- */

      const manager = (
        managers || []
      ).find(
        (item) =>
          String(
            item.id || item._id
          ) ===
          String(form.manager_id)
      );


      const managerName =
        manager?.name ||
        manager?.full_name ||
        manager?.email ||
        "";


      /* -----------------------------
         CURRENT USER
         ----------------------------- */

      const userId =
        me?.id ||
        me?._id ||
        "";

      const userName =
        me?.name ||
        me?.full_name ||
        me?.email ||
        "";


      /* -----------------------------
         PAYLOAD
         ----------------------------- */

      const payload = {
        name: form.name.trim(),

        store_id: form.store_id,

        store_name:
          store?.name || "",

        manager_id:
          form.all_managers
            ? ""
            : form.manager_id || "",

        manager_name:
          form.all_managers
            ? ""
            : managerName,

        all_managers:
          !!form.all_managers,

        items,
      };


      /* =================================================
         UPDATE EXISTING CHECKLIST
         ================================================= */

      if (editTemplate) {
        const checklistId =
          editTemplate.id ||
          editTemplate._id;


        if (!checklistId) {
          throw new Error(
            "Checklist ID missing"
          );
        }


        /* -----------------------------
           UPDATE
           ----------------------------- */

        await apiFetch(
          `/api/checklists/${checklistId}`,
          {
            method: "PATCH",

            body: JSON.stringify(
              payload
            ),
          }
        );


        /* -----------------------------
           AUDIT LOG

           IMPORTANT:
           Audit fail झाला तरी
           checklist save fail होऊ नये.
           ----------------------------- */

        try {
          await apiFetch(
            "/api/tailor/audit",
            {
              method: "POST",

              body: JSON.stringify({
                module: "Checklists",

                action:
                  "Checklist Updated",

                entity_id:
                  checklistId,

                entity_name:
                  form.name.trim(),

                actor_id:
                  userId,

                actor_name:
                  userName,

                store_id:
                  form.store_id,

                details:
                  `${items.length} items · ${
                    form.all_managers
                      ? t("allManagers")
                      : managerName ||
                        "—"
                  }`,
              }),
            }
          );
        } catch (auditError) {
          console.warn(
            "Checklist update audit failed:",
            auditError
          );
        }


        toast.success(
          "Checklist updated"
        );
      }


      /* =================================================
         CREATE NEW CHECKLIST
         ================================================= */

      else {
        /* -----------------------------
           CREATE
           ----------------------------- */

        const response =
          await apiFetch(
            "/api/checklists",
            {
              method: "POST",

              body: JSON.stringify({
                ...payload,

                active: true,

                created_by_id:
                  userId,

                created_by_name:
                  userName,
              }),
            }
          );


        /* -----------------------------
           CREATED CHECKLIST
           ----------------------------- */

        const created =
          response?.item ||
          response?.checklist ||
          response?.data ||
          response;

        const createdId =
          created?.id ||
          created?._id ||
          "";


        /* -----------------------------
           AUDIT LOG

           IMPORTANT:
           Audit fail झाला तरी
           checklist save fail होऊ नये.
           ----------------------------- */

        try {
          await apiFetch(
            "/api/tailor/audit",
            {
              method: "POST",

              body: JSON.stringify({
                module: "Checklists",

                action:
                  "Checklist Created",

                entity_id:
                  createdId,

                entity_name:
                  form.name.trim(),

                actor_id:
                  userId,

                actor_name:
                  userName,

                store_id:
                  form.store_id,

                details:
                  `${items.length} items · ${
                    form.all_managers
                      ? t("allManagers")
                      : managerName ||
                        "—"
                  }`,
              }),
            }
          );
        } catch (auditError) {
          console.warn(
            "Checklist create audit failed:",
            auditError
          );
        }


        toast.success(
          "Checklist created"
        );
      }


      /* -----------------------------
         CLOSE + RELOAD
         ----------------------------- */

      onDone();

    } catch (error) {
      console.error(
        "Checklist save failed:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to save checklist"
      );
    }
  };


  /* =====================================================
     UI
     ===================================================== */

  return (
    <div
      className="
        fixed inset-0
        z-50
        flex
        items-end
        sm:items-center
        justify-center
        bg-black/40
      "
      onClick={onClose}
    >

      <div
        className="
          bg-white
          w-full
          max-w-md
          rounded-t-3xl
          sm:rounded-3xl
          p-5
          space-y-3
          max-h-[90vh]
          overflow-y-auto
        "
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* =========================================
            HEADER
            ========================================= */}

        <div className="
          flex
          items-center
          justify-between
          mb-1
        ">

          <h3 className="
            font-bold
            text-slate-900
          ">
            {editTemplate
              ? "Edit Checklist"
              : t("newChecklist")}
          </h3>


          <button
            type="button"
            onClick={onClose}
            className="
              text-slate-400
              hover:text-slate-700
            "
          >
            <X className="w-5 h-5" />
          </button>

        </div>


        {/* =========================================
            CHECKLIST NAME
            ========================================= */}

        <input
          value={form.name}
          onChange={(e) =>
            set(
              "name",
              e.target.value
            )
          }
          placeholder="
            Checklist name
            (e.g. Opening Checklist)
          "
          className="input"
        />


        {/* =========================================
            STORE
            ========================================= */}

        <select
          value={form.store_id}
          onChange={(e) =>
            set(
              "store_id",
              e.target.value
            )
          }
          className="input"
        >

          <option value="">
            Select store
          </option>

          {(stores || []).map(
            (store) => {
              const storeId =
                store.id ||
                store._id;

              return (
                <option
                  key={storeId}
                  value={storeId}
                >
                  {store.name}
                </option>
              );
            }
          )}

        </select>


        {/* =========================================
            ALL MANAGERS
            ========================================= */}

        <label className="
          flex
          items-center
          gap-2
          text-sm
          text-slate-700
        ">

          <input
            type="checkbox"
            checked={
              !!form.all_managers
            }
            onChange={(e) =>
              set(
                "all_managers",
                e.target.checked
              )
            }
            className="w-4 h-4"
          />

          {t("allManagers")}

        </label>


        {/* =========================================
            MANAGER
            ========================================= */}

        {!form.all_managers && (
          <select
            value={form.manager_id}
            onChange={(e) =>
              set(
                "manager_id",
                e.target.value
              )
            }
            className="input"
          >

            <option value="">
              Select manager
            </option>

            {(managers || []).map(
              (manager) => {
                const managerId =
                  manager.id ||
                  manager._id;

                return (
                  <option
                    key={managerId}
                    value={managerId}
                  >
                    {manager.name ||
                      manager.full_name ||
                      manager.email}
                  </option>
                );
              }
            )}

          </select>
        )}


        {/* =========================================
            CHECKLIST ITEMS
            ========================================= */}

        <div>

          <p className="
            text-xs
            font-semibold
            text-slate-500
            mb-1.5
          ">
            {t("checklist")}
          </p>


          <div className="space-y-2">

            {form.items.map(
              (item, index) => (

                <div
                  key={index}
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  {/* ITEM NAME */}

                  <input
                    value={
                      item.label
                    }
                    onChange={(e) =>
                      updateItem(
                        index,
                        "label",
                        e.target.value
                      )
                    }
                    placeholder="Item label"
                    className="
                      input
                      flex-1
                    "
                  />


                  {/* REQUIRED */}

                  <label className="
                    flex
                    items-center
                    gap-1
                    text-[10px]
                    text-slate-500
                    whitespace-nowrap
                  ">

                    <input
                      type="checkbox"
                      checked={
                        !!item.required
                      }
                      onChange={(e) =>
                        updateItem(
                          index,
                          "required",
                          e.target.checked
                        )
                      }
                      className="
                        w-4
                        h-4
                      "
                    />

                    REQ

                  </label>


                  {/* DELETE ITEM */}

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(index)
                    }
                    className="
                      text-slate-300
                      hover:text-red-500
                    "
                  >
                    <Trash2 className="
                      w-4
                      h-4
                    " />
                  </button>

                </div>

              )
            )}

          </div>


          {/* ADD ITEM */}

          <button
            type="button"
            onClick={addItem}
            className="
              mt-2
              text-xs
              font-semibold
              text-green-700
              flex
              items-center
              gap-1
            "
          >

            <Plus className="
              w-3.5
              h-3.5
            " />

            {t(
              "addChecklistItem"
            )}

          </button>

        </div>


        {/* =========================================
            SAVE
            ========================================= */}

        <button
          type="button"
          onClick={save}
          className="
            w-full
            bg-slate-900
            text-white
            text-sm
            font-semibold
            py-3.5
            rounded-xl
            hover:bg-slate-800
          "
        >
          {t("save")}
        </button>

      </div>

    </div>
  );
}