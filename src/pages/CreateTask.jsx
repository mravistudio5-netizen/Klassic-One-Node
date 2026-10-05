import React, { useState, useEffect } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { apiFetch } from "@/api";

import { useLang } from "@/lib/i18n";

import {

  ArrowLeft,

  X,

  Bot,

  Plus,

  Calendar,

  Bell,

  BellRing,

  Clock,

  ChevronDown,

  Sparkles,

  Users,

  Video,

  MapPin,

} from "lucide-react";

import { toast } from "sonner";



import UserAssignModal from "@/components/tasks/UserAssignModal";

import ChecklistBuilder from "@/components/tasks/ChecklistBuilder";

import AdvancedOptions from "@/components/tasks/AdvancedOptions";



const SHIFTS = [

  "None",

  "Morning",

  "Afternoon",

  "Opening",

  "Closing",

  "Nightly",

];



const REMINDER_OPTIONS = [

  { label: "No reminder", value: 0 },

  { label: "15 min before", value: 15 },

  { label: "30 min before", value: 30 },

  { label: "1 hour before", value: 60 },

  { label: "1 day before", value: 1440 },

];



function fmtLocal(date) {

  if (!date) return "";



  const d = new Date(date);

  const pad = (n) => String(n).padStart(2, "0");



  return `${d.getFullYear()}-${pad(

    d.getMonth() + 1

  )}-${pad(d.getDate())}T${pad(

    d.getHours()

  )}:${pad(d.getMinutes())}`;

}



export default function CreateTask() {

  const navigate = useNavigate();

  const { t } = useLang();

  const { id: editId } = useParams();



  const isTemplateMode =

    new URLSearchParams(window.location.search).get(

      "template"

    ) === "1";



  const [stores, setStores] = useState([]);

  const [managers, setManagers] = useState([]);

  const [templates, setTemplates] = useState([]);

  const [me, setMe] = useState(null);



  const [showDesc, setShowDesc] = useState(false);

  const [showAssign, setShowAssign] = useState(false);

  const [showRepeat, setShowRepeat] = useState(false);

  const [showReminder, setShowReminder] = useState(false);

  const [showTemplate, setShowTemplate] = useState(false);



  const [checklist, setChecklist] = useState([]);

  const [subtasks, setSubtasks] = useState([]);



  const [form, setForm] = useState({

    title: "",

    description: "",

    priority: "Medium",

    category: "General",



    store_id: "",

    assigned_to_id: "",

    assigned_to_name: "",

    location_tag: "",



    start_date: fmtLocal(new Date()),



    due_date: fmtLocal(

      new Date(Date.now() + 86400000)

    ),



    shift: "None",

    repeat_type: "None",

    repeat_days: [],



    must_finish_before_opening: false,

    buzzer: false,

    validations: [],



    reminder_minutes: 0,

    geo_fence: false,

    highlight: false,

    template_name: "",

    required_proof_photos: 0,



    require_video_proof: false,

    require_geo_tag_proof: false,

  });



  // --------------------------------------------------

  // Initial data

  // --------------------------------------------------



  useEffect(() => {

    let alive = true;



    const loadInitialData = async () => {

      try {

        const meResponse = await apiFetch(

          "/api/auth/me"

        );



        const user = meResponse.user;



        if (!alive) return;



        setMe(user);



        // -----------------------------

        // Stores

        // -----------------------------



        let storeItems = [];



        try {

          const storeResponse = await apiFetch(

            "/api/stores?active=true&limit=50"

          );



          storeItems =

            storeResponse.items || storeResponse.stores || [];



          if (alive) {

            setStores(storeItems);

          }

        } catch (storeError) {

          console.error(

            "Store loading failed:",

            storeError

          );



          if (alive) {

            setStores([]);

          }

        }



        // -----------------------------

        // Users available for assignment

        // -----------------------------



        let assignable = [];



        try {

          const userResponse = await apiFetch(

            "/api/users?limit=100"

          );



          const users =

            userResponse.items || userResponse.users || [];



          assignable = users.filter((u) =>

            [

              "manager",

              "tailoring_manager",

              "tailoring_operator",

              "admin",

            ].includes(u.role)

          );



          // -----------------------------

          // Manager cross-department

          // permission

          // -----------------------------



          if (user.role === "manager") {

            let cross = false;



            try {

              const permissionResponse =

                await apiFetch(

                  `/api/permissions/${user.role}`

                );



              cross = !!(

                permissionResponse.permission

                  ?.can_assign_cross_department

              );

            } catch (permissionError) {

              console.warn(

                "Cross department permission could not be loaded:",

                permissionError

              );

            }



            if (!cross) {

              assignable =

                assignable.filter(

                  (u) =>

                    (u.department || "") ===

                    (user.department || "")

                );

            }

          }



          if (alive) {

            setManagers(assignable);

          }

        } catch (userError) {

          console.error(

            "User loading failed:",

            userError

          );



          if (alive) {

            setManagers([]);

          }

        }



        // -----------------------------

        // Saved task templates

        // -----------------------------



        try {

          const templateResponse =

            await apiFetch(

              "/api/tasks/templates"

            );



          const templateItems =

            templateResponse.items || templateResponse.tasks || [];



          const seen = new Set();



          const uniqueTemplates =

            templateItems.filter((task) => {

              const templateName =

                task.template_name;



              if (

                !templateName ||

                seen.has(templateName)

              ) {

                return false;

              }



              seen.add(templateName);

              return true;

            });



          if (alive) {

            setTemplates(

              uniqueTemplates

            );

          }

        } catch (templateError) {

          console.error(

            "Template loading failed:",

            templateError

          );



          if (alive) {

            setTemplates([]);

          }

        }



        // -----------------------------

        // Restore selected store

        // -----------------------------



        const savedStore =

          localStorage.getItem(

            "klassic_store"

          );



        if (

          savedStore &&

          savedStore !== "all" &&

          storeItems.some(

            (store) =>

              (store.id || store._id) ===

              savedStore

          )

        ) {

          setForm((current) => ({

            ...current,

            store_id: savedStore,

          }));

        }

      } catch (error) {

        console.error(

          "CreateTask initialization failed:",

          error

        );

      }

    };



    loadInitialData();



    return () => {

      alive = false;

    };

  }, []);



  const set = (key, value) => {

    setForm((current) => ({

      ...current,

      [key]: value,

    }));

  };



  // --------------------------------------------------

  // Template mode

  // --------------------------------------------------



  useEffect(() => {

    if (

      isTemplateMode &&

      !editId

    ) {

      set(

        "repeat_type",

        "Daily"

      );

    }

  }, [isTemplateMode, editId]);



  // --------------------------------------------------

  // Load task for editing

  // --------------------------------------------------



  useEffect(() => {

    if (!editId) return;



    let alive = true;



    const loadTask = async () => {

      try {

        const response =

          await apiFetch(

            `/api/tasks/${editId}`

          );



        const task =

          response.item || response.task;



        if (!task || !alive) {

          return;

        }



        setForm({

          title: task.title || "",

          description:

            task.description || "",

          priority:

            task.priority || "Medium",

          category:

            task.category || "General",



          store_id:

            task.store_id || "",



          assigned_to_id:

            task.assigned_to_id || "",



          assigned_to_name:

            task.assigned_to_name || "",



          location_tag:

            task.location_tag || "",



          start_date: task.start_date

            ? fmtLocal(task.start_date)

            : "",



          due_date: task.due_date

            ? fmtLocal(task.due_date)

            : "",



          shift:

            task.shift || "None",



          repeat_type:

            task.repeat_type || "None",



          repeat_days:

            task.repeat_days || [],



          must_finish_before_opening:

            !!task.must_finish_before_opening,



          buzzer: !!task.buzzer,



          validations:

            task.validations || [],



          reminder_minutes:

            task.reminder_minutes || 0,



          geo_fence:

            !!task.geo_fence,



          highlight:

            !!task.highlight,



          template_name:

            task.template_name || "",



          required_proof_photos:

            task.required_proof_photos || 0,



          require_video_proof:

            !!task.require_video_proof,



          require_geo_tag_proof:

            !!task.require_geo_tag_proof,



          repeat_interval_months:

            task.repeat_interval_months,

        });



        setChecklist(

          task.checklist || []

        );



        setSubtasks(

          task.subtasks || []

        );



        setShowDesc(

          !!task.description

        );

      } catch (error) {

        console.error(

          "Could not load task:",

          error

        );



        toast.error(

          "Could not load task"

        );

      }

    };



    loadTask();



    return () => {

      alive = false;

    };

  }, [editId]);



  // --------------------------------------------------

  // Apply saved template

  // --------------------------------------------------



  const applyTemplate = async (

    templateName

  ) => {

    if (!templateName) {

      set("template_name", "");

      return;

    }



    try {

      const response =

        await apiFetch(

          `/api/tasks?template_name=${encodeURIComponent(

            templateName

          )}&limit=1`

        );



      const tpl =

        (response.items || response.tasks || [])?.[0];



      if (!tpl) return;



      setForm((current) => ({

        ...current,



        title:

          tpl.title ||

          current.title,



        description:

          tpl.description ||

          current.description,



        priority:

          tpl.priority ||

          current.priority,



        category:

          tpl.category ||

          current.category,



        validations:

          tpl.validations || [],



        buzzer:

          tpl.buzzer ??

          current.buzzer,



        geo_fence:

          tpl.geo_fence ??

          current.geo_fence,



        repeat_type:

          tpl.repeat_type ||

          "None",



        shift:

          tpl.shift ||

          "None",



        template_name:

          templateName,

      }));



      setChecklist(

        tpl.checklist || []

      );



      setSubtasks(

        tpl.subtasks || []

      );



      toast.success(

        "Template applied"

      );

    } catch (error) {

      console.error(

        "Template loading failed:",

        error

      );



      toast.error(

        "Could not load template"

      );

    }

  };



  // --------------------------------------------------

  // Save as template

  // --------------------------------------------------



  const saveAsTemplate = async () => {

    if (!form.title.trim()) {

      toast.error(

        "Enter a task name first"

      );

      return;

    }



    const name = window.prompt(

      "Template name",

      form.title

    );



    if (!name) return;



    set(

      "template_name",

      name

    );



    toast.success(

      "Template name set — it will be saved with this task"

    );

  };



  // --------------------------------------------------

  // Submit task

  // --------------------------------------------------



  const submit = async () => {

    if (!form.title.trim()) {

      toast.error(

        "Task name required"

      );

      return;

    }



    if (!form.store_id) {

      toast.error(

        "Store required"

      );

      return;

    }



    if (

      isTemplateMode &&

      !form.template_name?.trim()

    ) {

      toast.error(

        "Template name required"

      );

      return;

    }



    if (!me) {

      toast.error(

        "User session not available"

      );

      return;

    }



    try {

      const store =

        stores.find(

          (s) =>

            (s.id || s._id) ===

            form.store_id

        );



      const start = form.start_date

        ? new Date(

            form.start_date

          ).toISOString()

        : null;



      const due = form.due_date

        ? new Date(

            form.due_date

          ).toISOString()

        : null;



      const isRecurring =

        form.repeat_type !==

        "None";



      const payload = {

        ...form,



        store_name:

          store?.name || "",



        start_date: start,



        due_date: due,



        checklist,



        subtasks,



        recurring: isRecurring,



        active:

          isRecurring ||

          isTemplateMode,



        template_name:

          isRecurring

            ? form.template_name?.trim() ||

              form.title.trim()

            : form.template_name,

      };



      const userId =

        me.id || me._id;



      const userName =

        me.name ||

        me.full_name ||

        me.email ||

        "";



      // -----------------------------

      // Update existing task

      // -----------------------------



      if (editId) {

        await apiFetch(

          `/api/tasks/${editId}`,

          {

            method: "PATCH",

            body: JSON.stringify(

              payload

            ),

          }

        );



        toast.success(

          "Updated"

        );



        navigate(-1);



        return;

      }



      // -----------------------------

      // Create new task

      // -----------------------------



      const createResponse =

        await apiFetch(

          "/api/tasks",

          {

            method: "POST",

            body: JSON.stringify({

              ...payload,



              created_by_id:

                userId,



              created_by_name:

                userName,

            }),

          }

        );



      const createdTask =

        createResponse.item || createResponse.task;



      toast.success(

        isTemplateMode

          ? "Template created"

          : "Task created"

      );



      navigate(

        isTemplateMode

          ? "/task-admin"

          : "/tasks"

      );

    } catch (error) {

      console.error(

        "Task save failed:",

        error

      );



      toast.error(

        "Failed: " +

          (error.message ||

            "error")

      );

    }

  };



  const selectedStore =

    stores.find(

      (s) =>

        (s.id || s._id) ===

        form.store_id

    );



  const assignedUser =

    managers.find(

      (m) =>

        (m.id || m._id) ===

        form.assigned_to_id

    );



  return (

    <div className="min-h-screen bg-slate-50 pb-40">

      {/* Header */}

      <div className="sticky top-0 z-20 bg-green-50 border-b border-green-100 px-4 py-3">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

            <button

              onClick={() =>

                navigate(-1)

              }

              className="p-1.5 -ml-1.5 text-slate-600"

            >

              <ArrowLeft className="w-5 h-5" />

            </button>



            <h2 className="font-bold text-slate-900">

              {editId

                ? "Edit Task"

                : isTemplateMode

                  ? "Create Template"

                  : "Create Task"}

            </h2>

          </div>



          <div className="flex items-center gap-2">

            <div className="relative">

              <button

                onClick={() =>

                  setShowTemplate(

                    (value) => !value

                  )

                }

                className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-3 py-1.5"

              >

                Use Template



                <ChevronDown className="w-3.5 h-3.5" />

              </button>



              {showTemplate && (

                <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg w-48 max-h-60 overflow-y-auto z-30">

                  {templates.length ===

                    0 && (

                    <p className="text-xs text-slate-400 px-3 py-2">

                      No saved templates

                    </p>

                  )}



                  {templates.map(

                    (template) => (

                      <button

                        key={

                          template.id ||

                          template._id ||

                          template.template_name

                        }

                        onClick={() => {

                          applyTemplate(

                            template.template_name

                          );



                          setShowTemplate(

                            false

                          );

                        }}

                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate"

                      >

                        {

                          template.template_name

                        }

                      </button>

                    )

                  )}

                </div>

              )}

            </div>



            <button

              onClick={() =>

                navigate(-1)

              }

              className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500"

            >

              <X className="w-4 h-4" />

            </button>

          </div>

        </div>

      </div>



      <div className="p-4 space-y-4">

        {/* Task Name */}

        <Field label="Task Name\*">

          <div className="relative">

            <Bot className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />



            <input

              value={form.title}

              onChange={(e) =>

                set(

                  "title",

                  e.target.value

                )

              }

              placeholder="Enter task name"

              className="input pl-9"

            />

          </div>

        </Field>



        {/* Template Name */}

        {(isTemplateMode ||

          (editId &&

            !!form.template_name)) && (

          <Field label="Template Name\*">

            <input

              value={

                form.template_name

              }

              onChange={(e) =>

                set(

                  "template_name",

                  e.target.value

                )

              }

              placeholder="e.g. Morning Shift Checklist"

              className="input"

            />

          </Field>

        )}



        {/* Description */}

        {!showDesc ? (

          <button

            onClick={() =>

              setShowDesc(true)

            }

            className="text-sm font-semibold text-green-700 flex items-center gap-1"

          >

            <Plus className="w-4 h-4" />



            Add Description

            (optional)

          </button>

        ) : (

          <Field label="Description">

            <textarea

              value={form.description}

              onChange={(e) =>

                set(

                  "description",

                  e.target.value

                )

              }

              className="input min-h-[80px]"

              placeholder="Enter description"

            />

          </Field>

        )}



        {/* Dates */}

        <div className="grid grid-cols-2 gap-3">

          <Field label="Start date & time">

            <DateInput

              value={form.start_date}

              onChange={(value) =>

                set(

                  "start_date",

                  value

                )

              }

            />

          </Field>



          <Field label="End date & time">

            <DateInput

              value={form.due_date}

              onChange={(value) =>

                set(

                  "due_date",

                  value

                )

              }

            />

          </Field>

        </div>



        {/* Buzzer */}

        <div className="flex items-start justify-between bg-white rounded-xl border border-slate-200 p-3">

          <div className="flex items-start gap-2.5">

            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">

              {form.buzzer ? (

                <BellRing className="w-4 h-4 text-green-700" />

              ) : (

                <Bell className="w-4 h-4 text-slate-400" />

              )}

            </div>



            <div>

              <p className="text-sm font-semibold text-slate-800">

                Buzzer

              </p>



              <p className="text-[11px] text-slate-400 leading-tight max-w-[200px]">

                Sends full screen alerts to user when a task is assigned to them

              </p>

            </div>

          </div>



          <button

            onClick={() =>

              set(

                "buzzer",

                !form.buzzer

              )

            }

            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${

              form.buzzer

                ? "bg-green-600"

                : "bg-slate-300"

            }`}

          >

            <span

              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${

                form.buzzer

                  ? "translate-x-4"

                  : ""

              }`}

            />

          </button>

        </div>



        {/* Required Proof Photos */}

        <Field label="Required Proof Photos">

          <div className="flex items-center gap-1.5">

            {[0, 1, 2, 3, 4, 5].map(

              (number) => (

                <button

                  key={number}

                  type="button"

                  onClick={() =>

                    set(

                      "required_proof_photos",

                      number

                    )

                  }

                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${

                    form.required_proof_photos ===

                    number

                      ? "border-green-600 bg-green-50 text-green-700"

                      : "border-slate-200 bg-white text-slate-600"

                  }`}

                >

                  {number === 0

                    ? "Optional"

                    : number}

                </button>

              )

            )}

          </div>



          <p className="text-[11px] text-slate-400 mt-1">

            Optional = no compulsory

            photos. Assignee must upload

            this many photos before they

            can submit.

          </p>

        </Field>



        <ProofToggle

          icon={Video}

          label="Video Proof"

          desc="Require a video upload to complete the task."

          value={

            form.require_video_proof

          }

          onChange={(value) =>

            set(

              "require_video_proof",

              value

            )

          }

        />



        <ProofToggle

          icon={MapPin}

          label="Geo Tag Photo Proof"

          desc="Require a geo-tagged photo to complete the task."

          value={

            form.require_geo_tag_proof

          }

          onChange={(value) =>

            set(

              "require_geo_tag_proof",

              value

            )

          }

        />



        {/* Assign User */}

        <Field label="Assign User\*">

          <button

            onClick={() =>

              setShowAssign(true)

            }

            className="input text-left flex items-center justify-between"

          >

            <span

              className={

                assignedUser

                  ? "text-slate-800"

                  : "text-slate-400"

              }

            >

              {assignedUser

                ? assignedUser.name ||

                  assignedUser.full_name ||

                  assignedUser.email

                : "Select User"}

            </span>



            <Users className="w-4 h-4 text-slate-400" />

          </button>

        </Field>



        {/* Store + Location */}

        <div className="grid grid-cols-2 gap-3">

          <Field label="Store">

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



              {stores.map((store) => (

                <option

                  key={

                    store.id ||

                    store._id

                  }

                  value={

                    store.id ||

                    store._id

                  }

                >

                  {store.name}

                </option>

              ))}

            </select>

          </Field>



          {selectedStore && (

            <Field label="Location">

              <select

                value={

                  form.location_tag

                }

                onChange={(e) =>

                  set(

                    "location_tag",

                    e.target.value

                  )

                }

                className="input"

              >

                <option value="">

                  None

                </option>



                {(

                  selectedStore.locations ||

                  []

                ).map((location) => (

                  <option

                    key={location}

                    value={location}

                  >

                    {location}

                  </option>

                ))}

              </select>

            </Field>

          )}

        </div>



        {/* Action buttons */}

        <div className="grid grid-cols-2 gap-2">

          <ActionBtn

            icon={Clock}

            label="Repeat"

            active={

              form.repeat_type !==

              "None"

            }

            onClick={() =>

              setShowRepeat(true)

            }

          />



          <ActionBtn

            icon={Bell}

            label="Reminder"

            active={

              !!form.reminder_minutes

            }

            onClick={() =>

              setShowReminder(true)

            }

          />

        </div>



        {/* Checklist */}

        <ChecklistBuilder

          items={checklist}

          setItems={setChecklist}

        />



        {/* Sub-tasks */}

        <div>

          <div className="flex items-center justify-between mb-2">

            <span className="text-sm font-bold text-slate-800">

              Sub Tasks

            </span>



            <button

              onClick={() =>

                setSubtasks([

                  ...subtasks,

                  {

                    title: "",

                    done: false,

                  },

                ])

              }

              className="text-xs font-semibold text-green-700 flex items-center gap-1"

            >

              <Plus className="w-3.5 h-3.5" />



              Add Sub Task

            </button>

          </div>



          <div className="space-y-2">

            {subtasks.map(

              (subtask, index) => (

                <div

                  key={index}

                  className="flex items-center gap-2"

                >

                  <input

                    value={

                      subtask.title

                    }

                    onChange={(e) =>

                      setSubtasks(

                        subtasks.map(

                          (

                            current,

                            itemIndex

                          ) =>

                            itemIndex ===

                            index

                              ? {

                                  ...current,

                                  title:

                                    e.target

                                      .value,

                                }

                              : current

                        )

                      )

                    }

                    placeholder="Sub task title"

                    className="input flex-1"

                  />



                  <button

                    onClick={() =>

                      setSubtasks(

                        subtasks.filter(

                          (

                            _,

                            itemIndex

                          ) =>

                            itemIndex !==

                            index

                        )

                      )

                    }

                    className="text-slate-300 hover:text-red-500"

                  >

                    <X className="w-4 h-4" />

                  </button>

                </div>

              )

            )}

          </div>

        </div>



        {/* Shift + before opening */}

        <div className="grid grid-cols-2 gap-3 items-end">

          <Field label="Shift Template">

            <select

              value={form.shift}

              onChange={(e) =>

                set(

                  "shift",

                  e.target.value

                )

              }

              className="input"

            >

              {SHIFTS.map(

                (shift) => (

                  <option

                    key={shift}

                    value={shift}

                  >

                    {shift}

                  </option>

                )

              )}

            </select>

          </Field>



          <label className="flex items-center gap-2 text-xs text-slate-600 pb-3">

            <input

              type="checkbox"

              checked={

                form.must_finish_before_opening

              }

              onChange={(e) =>

                set(

                  "must_finish_before_opening",

                  e.target.checked

                )

              }

              className="w-4 h-4"

            />



            Before opening (10 AM)

          </label>

        </div>



        {/* Advanced options */}

        <AdvancedOptions

          form={form}

          set={set}

          onSaveTemplate={

            saveAsTemplate

          }

        />

      </div>



      {/* Footer */}

      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 px-4 py-3 flex gap-3 z-40">

        <button

          onClick={() =>

            navigate(-1)

          }

          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200"

        >

          Cancel

        </button>



        <button

          onClick={submit}

          className="flex-[1.5] py-3 rounded-xl text-sm font-semibold text-white bg-green-700 flex items-center justify-center gap-2"

        >

          <Sparkles className="w-4 h-4" />



          {editId

            ? "Update"

            : isTemplateMode

              ? "Save Template"

              : "Create"}

        </button>

      </div>



      {/* User assignment */}

      <UserAssignModal

        open={showAssign}

        onClose={() =>

          setShowAssign(false)

        }

        users={managers}

        selectedId={

          form.assigned_to_id

        }

        onAssign={(user) =>

          setForm((current) => ({

            ...current,

            assigned_to_id:

              user?.id ||

              user?._id ||

              "",

            assigned_to_name:

              user?.name ||

              user?.full_name ||

              user?.email ||

              "",

          }))

        }

      />



      {/* Repeat */}

      <RepeatModal

        open={showRepeat}

        onClose={() =>

          setShowRepeat(false)

        }

        form={form}

        set={set}

      />



      {/* Reminder */}

      <ReminderModal

        open={showReminder}

        onClose={() =>

          setShowReminder(false)

        }

        value={

          form.reminder_minutes

        }

        onChange={(value) =>

          set(

            "reminder_minutes",

            value

          )

        }

      />

    </div>

  );

}



function Field({

  label,

  children,

}) {

  return (

    <div>

      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">

        {label}

      </label>



      {children}

    </div>

  );

}



function DateInput({

  value,

  onChange,

}) {

  return (

    <div className="relative">

      <input

        type="datetime-local"

        value={value}

        onChange={(e) =>

          onChange(

            e.target.value

          )

        }

        className="input pr-9"

      />



      <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

    </div>

  );

}



function ActionBtn({

  icon: Icon,

  label,

  active,

  onClick,

}) {

  return (

    <button

      onClick={onClick}

      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border ${

        active

          ? "border-green-600 bg-green-50 text-green-700"

          : "border-slate-200 bg-white text-slate-600"

      }`}

    >

      <Icon className="w-4 h-4" />



      {label}

    </button>

  );

}



function ProofToggle({

  icon: Icon,

  label,

  desc,

  value,

  onChange,

}) {

  return (

    <div className="flex items-start justify-between bg-white rounded-xl border border-slate-200 p-3">

      <div className="flex items-start gap-2.5">

        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">

          <Icon className="w-4 h-4 text-green-700" />

        </div>



        <div>

          <p className="text-sm font-semibold text-slate-800">

            {label}

          </p>



          <p className="text-[11px] text-slate-400 leading-tight max-w-[200px]">

            {desc}

          </p>

        </div>

      </div>



      <button

        onClick={() =>

          onChange(!value)

        }

        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${

          value

            ? "bg-green-600"

            : "bg-slate-300"

        }`}

      >

        <span

          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${

            value

              ? "translate-x-4"

              : ""

          }`}

        />

      </button>

    </div>

  );

}



function RepeatModal({

  open,

  onClose,

  form,

  set,

}) {

  if (!open) return null;



  const days = [

    "Mon",

    "Tue",

    "Wed",

    "Thu",

    "Fri",

    "Sat",

    "Sun",

  ];



  const toggleDay = (day) => {

    const current =

      form.repeat_days || [];



    set(

      "repeat_days",

      current.includes(day)

        ? current.filter(

            (item) => item !== day

          )

        : [...current, day]

    );

  };



  return (

    <div

      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"

      onClick={onClose}

    >

      <div

        className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3"

        onClick={(e) =>

          e.stopPropagation()

        }

      >

        <div className="flex items-center justify-between">

          <h3 className="font-bold text-slate-900">

            Repeat

          </h3>



          <button onClick={onClose}>

            <X className="w-5 h-5 text-slate-400" />

          </button>

        </div>



        <div className="flex gap-2 flex-wrap">

          {[

            "None",

            "Daily",

            "Weekdays",

            "Weekly",

            "Monthly",

            "Every N Months",

          ].map((repeat) => (

            <button

              key={repeat}

              onClick={() => {

                set(

                  "repeat_type",

                  repeat

                );



                set(

                  "recurring",

                  repeat !== "None"

                );

              }}

              className={`px-3 py-2 rounded-xl text-xs font-semibold ${

                form.repeat_type ===

                repeat

                  ? "bg-green-700 text-white"

                  : "bg-slate-100 text-slate-600"

              }`}

            >

              {repeat}

            </button>

          ))}

        </div>



        {form.repeat_type ===

          "Weekly" && (

          <div className="flex gap-1.5 flex-wrap">

            {days.map((day) => (

              <button

                key={day}

                onClick={() =>

                  toggleDay(day)

                }

                className={`w-9 h-9 rounded-lg text-xs font-semibold ${

                  (

                    form.repeat_days ||

                    []

                  ).includes(day)

                    ? "bg-green-700 text-white"

                    : "bg-slate-100 text-slate-500"

                }`}

              >

                {day}

              </button>

            ))}

          </div>

        )}



        {form.repeat_type ===

          "Every N Months" && (

          <input

            type="number"

            min={1}

            value={

              form.repeat_interval_months ||

              ""

            }

            onChange={(e) =>

              set(

                "repeat_interval_months",

                Number(

                  e.target.value

                )

              )

            }

            placeholder="Interval (months)"

            className="input"

          />

        )}



        <button

          onClick={onClose}

          className="w-full bg-green-700 text-white text-sm font-semibold py-3 rounded-xl"

        >

          Done

        </button>

      </div>

    </div>

  );

}



function ReminderModal({

  open,

  onClose,

  value,

  onChange,

}) {

  if (!open) return null;



  return (

    <div

      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"

      onClick={onClose}

    >

      <div

        className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-2"

        onClick={(e) =>

          e.stopPropagation()

        }

      >

        <div className="flex items-center justify-between">

          <h3 className="font-bold text-slate-900">

            Reminder

          </h3>



          <button onClick={onClose}>

            <X className="w-5 h-5 text-slate-400" />

          </button>

        </div>



        {REMINDER_OPTIONS.map(

          (reminder) => (

            <button

              key={

                reminder.value

              }

              onClick={() => {

                onChange(

                  reminder.value

                );



                onClose();

              }}

              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium ${

                value ===

                reminder.value

                  ? "bg-green-50 text-green-700 border border-green-600"

                  : "text-slate-600 hover:bg-slate-50"

              }`}

            >

              {reminder.label}

            </button>

          )

        )}

      </div>

    </div>

  );

}