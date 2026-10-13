import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { supabase, hasSupabase } from "./lib/supabase";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const dateValue = (input) => new Date(`${input}T00:00:00`);
const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const toLocalDateTimeString = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatMinutes = (minutes) => {
  if (!minutes || Number(minutes) <= 0) return "0m";
  const totalMinutes = Math.round(Number(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
};
const formatSignedMinutes = (minutes) => {
  const totalMinutes = Math.round(Number(minutes || 0));
  if (totalMinutes === 0) return "0m";
  const absoluteMinutes = Math.abs(totalMinutes);
  const sign = totalMinutes > 0 ? "+" : "-";
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  if (hours && remainingMinutes) return `${sign}${hours}h ${remainingMinutes}m`;
  if (hours) return `${sign}${hours}h`;
  return `${sign}${remainingMinutes}m`;
};
const parseDelayMinutes = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  if (typeof value === "string") {
    const match = value.match(/(\d+)/g);
    if (!match) return 0;
    const numeric = Number(match[0]);
    return /hour/i.test(value) ? numeric * 60 : numeric;
  }
  return 0;
};
const getCurrentUserName = (session, profile) => {
  return profile?.name || profile?.full_name || profile?.display_name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email || "Current user";
};
const addDays = (date, offset) => {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
};
const getDateOffsetISO = (offsetDays = 0) => formatDateISO(addDays(new Date(), offsetDays));
const startOfWeek = (date) => {
  const current = new Date(date);
  const diff = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - diff);
  return current;
};
const monthDates = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const list = [];
  for (let i = 0; i < last.getDate(); i += 1) {
    list.push(addDays(first, i));
  }
  return list;
};
const toDateLabel = (date, mode = "short") =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: mode === "full" ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: mode === "full" ? "numeric" : undefined,
  }).format(date);
const toDateTimeLabel = (value) => new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));
const toTimeLabel = (hour) => `${String(hour).padStart(2, "0")}:00`;
const getAppBaseUrl = () => {
  const configured = import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL;
  if (configured && configured.trim()) return configured.trim();
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5173";
};

const initialResources = [
  { id: "101", name: "Asset 101", zone: "North wing", status: "Available" },
  { id: "102", name: "Asset 102", zone: "North wing", status: "Attention" },
  { id: "103", name: "Asset 103", zone: "North wing", status: "Available" },
  { id: "201", name: "Area 201", zone: "South wing", status: "Available" },
  { id: "202", name: "Area 202", zone: "South wing", status: "Attention" },
  { id: "203", name: "Team 203", zone: "South wing", status: "Available" },
];

const initialPeople = [
  { id: "Maria", name: "Maria", role: "Operations" },
  { id: "Nina", name: "Nina", role: "Operations" },
  { id: "Aidan", name: "Aidan", role: "Quality" },
  { id: "Declan", name: "Declan", role: "Maintenance" },
  { id: "Owen", name: "Owen", role: "Service" },
  { id: "Guest", name: "Customer", role: "Customer" },
];

const initialTasks = [
  { id: 1, resourceId: "101", title: "Customer allocation", type: "booking", person: "Customer", start: "2026-10-12T07:00", end: "2026-10-12T11:00", status: "scheduled", note: "Allocated slot to customer" },
  { id: 2, resourceId: "101", title: "Standard run", type: "cleaning", person: "Maria", start: "2026-10-12T11:00", end: "2026-10-12T13:00", status: "completed", note: "Standard processing complete" },
  { id: 3, resourceId: "101", title: "Quality review", type: "inspection", person: "Aidan", start: "2026-10-12T13:00", end: "2026-10-12T14:00", status: "scheduled", note: "Release asset after review" },
  { id: 4, resourceId: "102", title: "Customer allocation", type: "booking", person: "Customer", start: "2026-10-12T07:00", end: "2026-10-12T10:00", status: "scheduled", note: "Early release" },
  { id: 5, resourceId: "102", title: "Standard run", type: "cleaning", person: "Nina", start: "2026-10-12T10:00", end: "2026-10-12T12:00", status: "scheduled", note: "Issue raised during standard work" },
  { id: 6, resourceId: "102", title: "Valve fault", type: "issue", person: "Declan", start: "2026-10-12T12:00", end: "2026-10-12T15:00", status: "issue", note: "Maintenance notified, priority high", issueReason: "A system fault created a delay before the asset could be released for the next task.", issueActivity: "Repair investigation" },
  { id: 7, resourceId: "103", title: "Deep standard work", type: "cleaning", person: "Maria", start: "2026-10-12T08:00", end: "2026-10-12T11:00", status: "scheduled", note: "Monthly planned work" },
  { id: 8, resourceId: "103", title: "Customer allocation", type: "booking", person: "Customer", start: "2026-10-12T15:00", end: "2026-10-12T20:00", status: "scheduled", note: "Allocated from 15:00" },
  { id: 9, resourceId: "201", title: "Customer allocation", type: "booking", person: "Customer", start: "2026-10-12T07:00", end: "2026-10-12T12:00", status: "scheduled", note: "Allocated capacity" },
  { id: 10, resourceId: "201", title: "Standard run", type: "cleaning", person: "Nina", start: "2026-10-12T12:00", end: "2026-10-12T14:00", status: "scheduled", note: "Standard processing" },
  { id: 11, resourceId: "202", title: "System inspection", type: "issue", person: "Declan", start: "2026-10-12T09:00", end: "2026-10-12T12:00", status: "issue", note: "Area blocked until resolved", issueReason: "An operational issue extended the handover because the system required diagnostics before release.", issueActivity: "System diagnostics" },
  { id: 12, resourceId: "203", title: "Support delivery", type: "service", person: "Owen", start: "2026-10-12T08:00", end: "2026-10-12T10:00", status: "scheduled", note: "Restock and support" },
  { id: 13, resourceId: "203", title: "Customer allocation", type: "booking", person: "Customer", start: "2026-10-12T14:00", end: "2026-10-12T20:00", status: "scheduled", note: "Allocated stage slot" },
  { id: 14, resourceId: "101", title: "Late allocation", type: "booking", person: "Customer", start: "2026-10-11T20:00", end: "2026-10-12T02:00", status: "scheduled", note: "Late scheduled slot" },
  { id: 15, resourceId: "103", title: "Reset cycle", type: "cleaning", person: "Maria", start: "2026-10-13T09:00", end: "2026-10-13T11:00", status: "scheduled", note: "Follow-up standard work" },
];

const styles = {
  booking: "bg-indigo-100 text-indigo-900 border-indigo-300",
  cleaning: "bg-emerald-100 text-emerald-900 border-emerald-300",
  issue: "bg-rose-100 text-rose-900 border-rose-300",
  inspection: "bg-amber-100 text-amber-900 border-amber-300",
  service: "bg-sky-100 text-sky-900 border-sky-300",
  completed: "bg-slate-200 text-slate-700 border-slate-300",
};

const labels = {
  booking: "Booking",
  cleaning: "Cleaning",
  issue: "Issue",
  inspection: "Inspection",
  service: "Service",
};

const defaultWorkTypes = [
  { id: "booking", name: "Booking", minutes: 90 },
  { id: "cleaning", name: "Cleaning", minutes: 120 },
  { id: "inspection", name: "Inspection", minutes: 45 },
  { id: "issue", name: "Issue", minutes: 60 },
  { id: "service", name: "Service", minutes: 30 },
];

const getTaskStyleClass = (type) => {
  if (!type) return "bg-slate-100 text-slate-700 border-slate-300";
  return styles[type] || "bg-slate-100 text-slate-700 border-slate-300";
};

const toTimeInputValue = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const addTaskWindow = (task) => {
  const start = new Date(task.start);
  const end = new Date(task.end);
  return {
    start,
    end,
    startHour: start.getHours() + start.getMinutes() / 60,
    endHour: end.getHours() + end.getMinutes() / 60,
  };
};

const boardBorder = {
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#d7e1ea',
  boxSizing: 'border-box',
};

const normalizeTask = (task) => ({
  id: task.id,
  resourceId: task.resource_id ?? task.resourceId ?? "101",
  title: task.title ?? "Untitled task",
  type: task.type ?? "booking",
  person: task.person ?? "Unassigned",
start: task.start_at ?? task.start ?? new Date().toISOString(),
end: task.end_at ?? task.end ?? new Date().toISOString(),
  status: task.status ?? "scheduled",
  note: task.note ?? "",
  issueReason: task.issue_reason ?? task.issueReason ?? "",
  issueActivity: task.issue_activity ?? task.issueActivity ?? "",
delayMinutes: task.delay_minutes ?? task.delayMinutes ?? 0,
completed_at: task.completed_at ?? task.completedAt ?? null,
completed_by: task.completed_by ?? task.completedBy ?? null,
updated_at: task.updated_at ?? task.updatedAt ?? task.completed_at ?? task.completedAt ?? new Date().toISOString(),
updated_by: task.updated_by ?? task.updatedBy ?? task.completed_by ?? task.completedBy ?? "System",
});

const toSupabaseTask = (task) => ({
id: task.id,
resource_id: task.resourceId,
title: task.title,
type: task.type,
person: task.person,
start_at: task.start,
end_at: task.end,
status: task.status,
note: task.note,
issue_reason: task.issueReason || null,
issue_activity: task.issueActivity || null,
delay_minutes: task.delayMinutes ?? 0,
completed_at: task.completed_at ?? task.completedAt ?? null,
completed_by: task.completed_by ?? task.completedBy ?? null,
updated_at: task.updated_at ?? task.updatedAt ?? new Date().toISOString(),
updated_by: task.updated_by ?? task.updatedBy ?? (getCurrentUserName(null, null) || "System"),
});

export default function StandardWorkBoard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [resources, setResources] = useState(initialResources);
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState("");
  const [query, setQuery] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [currentPage, setCurrentPage] = useState("board");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authEmail, setAuthEmail] = useState("bryan@bowarrowanalytics.ie");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [membershipsLoadedFor, setMembershipsLoadedFor] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [demoAccess, setDemoAccess] = useState(false);
  const [demoRoleOverride, setDemoRoleOverride] = useState(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState("");
  const [timingFilter, setTimingFilter] = useState("all");
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [viewMode, setViewMode] = useState("day");
  const [laneMode, setLaneMode] = useState("resource");
  const [selectedDate, setSelectedDate] = useState(() => getDateOffsetISO());
  const [customStart, setCustomStart] = useState(() => getDateOffsetISO(-3));
  const [customEnd, setCustomEnd] = useState(() => getDateOffsetISO(3));
  const [kpiPreset, setKpiPreset] = useState("7d");
  const [kpiStart, setKpiStart] = useState(() => getDateOffsetISO(-6));
  const [kpiEnd, setKpiEnd] = useState(() => getDateOffsetISO());
  const [kpiFocus, setKpiFocus] = useState(null);
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftIssue, setDraftIssue] = useState({ category: "Delay", reason: "", impact: "30 minutes", delayMinutes: "30" });
  const [resourcesConfig, setResourcesConfig] = useState(() => {
    const defaults = [
      { id: "101", name: "Asset 101", zone: "North wing", type: "asset", status: "Available" },
      { id: "102", name: "Asset 102", zone: "North wing", type: "asset", status: "Attention" },
      { id: "103", name: "Asset 103", zone: "North wing", type: "asset", status: "Available" },
      { id: "201", name: "Area 201", zone: "South wing", type: "area", status: "Available" },
      { id: "202", name: "Area 202", zone: "South wing", type: "area", status: "Attention" },
      { id: "203", name: "Team 203", zone: "South wing", type: "team", status: "Available" },
    ];

    if (typeof window === "undefined") return defaults;

    try {
      const saved = window.localStorage.getItem("standard-work-business-config");
      if (!saved) return defaults;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed?.resourcesConfig) && parsed.resourcesConfig.length) {
        return parsed.resourcesConfig;
      }
    } catch (error) {
      // Ignore invalid cached config and keep the defaults.
    }

    return defaults;
  });
  const [workTypes, setWorkTypes] = useState(() => {
    const defaults = defaultWorkTypes;

    if (typeof window === "undefined") return defaults;

    try {
      const saved = window.localStorage.getItem("standard-work-business-config");
      if (!saved) return defaults;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed?.workTypes) && parsed.workTypes.length) {
        return parsed.workTypes.map((type) => ({
          id: String(type.id || type.value || type.name || "custom-work-type"),
          name: type.name || type.label || "Custom work type",
          minutes: Number(type.minutes) || 60,
        }));
      }
    } catch (error) {
      // Ignore invalid cached config and keep the defaults.
    }

    return defaults;
  });
  const [standardTimings, setStandardTimings] = useState(() => {
    const defaults = Object.fromEntries(defaultWorkTypes.map((type) => [type.id, type.minutes]));

    if (typeof window === "undefined") return defaults;

    try {
      const saved = window.localStorage.getItem("standard-work-business-config");
      if (!saved) return defaults;

      const parsed = JSON.parse(saved);
      if (parsed?.standardTimings) {
        return { ...defaults, ...parsed.standardTimings };
      }
    } catch (error) {
      // Ignore invalid cached config and keep the defaults.
    }

    return defaults;
  });
  const [form, setForm] = useState(() => ({
    resourceId: "101",
    title: "Turnover clean",
    type: "cleaning",
    person: "Maria",
    start: `${getDateOffsetISO()}T10:00`,
    end: `${getDateOffsetISO()}T11:00`,
    note: "",
  }));

  useEffect(() => {
    setResources(resourcesConfig);
    if (resourcesConfig.length && !resourcesConfig.some((resource) => resource.id === form.resourceId)) {
      setForm((current) => ({ ...current, resourceId: resourcesConfig[0].id }));
    }
  }, [resourcesConfig]);

  useEffect(() => {
    setStandardTimings((current) => {
      const next = { ...current };
      workTypes.forEach((type) => {
        next[type.id] = Number(next[type.id] ?? type.minutes ?? 60) || 60;
      });
      return next;
    });
  }, [workTypes]);

  useEffect(() => {
    if (!workTypes.length) return;
    if (!workTypes.some((type) => type.id === form.type)) {
      setForm((current) => ({ ...current, type: workTypes[0].id }));
    }
  }, [workTypes, form.type]);

  const typeLabels = useMemo(
    () => ({ ...labels, ...Object.fromEntries(workTypes.map((type) => [type.id, type.name])) }),
    [workTypes]
  );

  const personLanes = useMemo(() => {
    const map = new Map(
      initialPeople
        .filter((person) => person.id !== "Guest")
        .map((person) => [person.id, person])
    );
    tasks.forEach((task) => {
      if (!task.person || task.person === "Guest" || task.person === "Customer") return;
      if (!map.has(task.person)) {
        map.set(task.person, { id: task.person, name: task.person, role: "Team member" });
      }
    });
    return [...map.values()];
  }, [tasks]);

  const laneItems = laneMode === "resource" ? resources : personLanes;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error") || params.get("error_code");
      const oauthErrorDetail = params.get("error_description");

      if (oauthError || oauthErrorDetail) {
        const detail = oauthErrorDetail ? decodeURIComponent(oauthErrorDetail.replace(/\+/g, " ")) : "The sign-in provider returned an OAuth error.";
        setAuthMessage(`${detail} Please check your Microsoft/Google provider configuration and redirect URLs.`);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBoardData = async () => {
      setIsLoading(true);
      setSyncMessage("");

      try {
        if (!hasSupabase || !supabase || demoAccess) {
          setTasks(initialTasks);
          setResources(resourcesConfig);
          return;
        }

        setTasks([]);
        setResources([]);

        if (!activeOrgId) {
          return;
        }

        const [
          { data: resourceData, error: resourceError },
          { data: taskData, error: taskError },
          { data: settingsData },
        ] = await Promise.all([
          supabase.from("standard_work_resources").select("*").eq("org_id", activeOrgId).order("name"),
          supabase.from("standard_work_tasks").select("*").eq("org_id", activeOrgId).order("start_at"),
          supabase.from("organisation_settings").select("*").eq("id", activeOrgId).maybeSingle(),
        ]);

        if (resourceError) throw resourceError;
        if (taskError) throw taskError;

        if (isMounted) {
          const loadedResources = (resourceData || []).map((resource) => ({
            id: resource.id,
            name: resource.name,
            zone: resource.zone ?? "Operations",
            status: resource.status ?? "Available",
            role: resource.role ?? "",
          }));
          setResources(loadedResources);
          setResourcesConfig(loadedResources.map((resource) => ({
            id: resource.id,
            name: resource.name,
            zone: resource.zone,
            type: resource.role,
            status: resource.status,
          })));
          setTasks((taskData || []).map(normalizeTask));

          const savedWorkTypes = Array.isArray(settingsData?.work_types) && settingsData.work_types.length
            ? settingsData.work_types.map((type) => ({
                id: String(type.id || type.value || type.name || "custom-work-type"),
                name: type.name || type.label || "Custom work type",
                minutes: Number(type.minutes) || 60,
              }))
            : defaultWorkTypes;
          setWorkTypes(savedWorkTypes);
          setStandardTimings({
            ...Object.fromEntries(defaultWorkTypes.map((type) => [type.id, type.minutes])),
            ...(settingsData?.standard_timings || {}),
          });
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setResources([]);
          setSyncMessage("Could not load this organisation's board. Check your connection and access.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBoardData();
    return () => {
      isMounted = false;
    };
  }, [activeOrgId, demoAccess]);

  useEffect(() => {
    if (!hasSupabase || !supabase || demoAccess || !activeOrgId) return undefined;

    const orgFilter = `org_id=eq.${activeOrgId}`;
    const channel = supabase
      .channel(`standard-work-board-live-${activeOrgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standard_work_tasks",
          filter: orgFilter,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const nextTask = normalizeTask(payload.new);
            setTasks((currentTasks) => {
              const existingIndex = currentTasks.findIndex((task) => task.id === nextTask.id);
              if (existingIndex >= 0) {
                const updatedTasks = [...currentTasks];
                updatedTasks[existingIndex] = nextTask;
                return updatedTasks;
              }
              return [...currentTasks, nextTask];
            });
          }

          if (payload.eventType === "DELETE") {
            setTasks((currentTasks) => currentTasks.filter((task) => task.id !== payload.old.id));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standard_work_resources",
          filter: orgFilter,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const nextResource = {
              id: payload.new.id,
              name: payload.new.name,
              zone: payload.new.zone ?? "Operations",
              status: payload.new.status ?? "Available",
              role: payload.new.role ?? "",
            };

            setResources((currentResources) => {
              const existingIndex = currentResources.findIndex((resource) => resource.id === nextResource.id);
              if (existingIndex >= 0) {
                const updatedResources = [...currentResources];
                updatedResources[existingIndex] = nextResource;
                return updatedResources;
              }
              return [...currentResources, nextResource];
            });
          }

          if (payload.eventType === "DELETE") {
            setResources((currentResources) => currentResources.filter((resource) => resource.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrgId, demoAccess]);

  useEffect(() => {
    let isMounted = true;

    const loadAuthProfile = async () => {
      if (!hasSupabase || !supabase) {
        setSession(null);
        setProfile({ role: "admin" });
        setAuthReady(true);
        return;
      }

      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(activeSession);

        if (activeSession?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", activeSession.user.id)
            .maybeSingle();

          if (isMounted) {
            setProfile(profileData || { role: "viewer" });
          }
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    loadAuthProfile();

    if (hasSupabase && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);

        if (nextSession?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", nextSession.user.id)
            .maybeSingle();

          setProfile(profileData || { role: "viewer" });
        } else {
          setProfile(null);
        }

        setAuthReady(true);
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    if (!hasSupabase || !supabase || demoAccess || !sessionUserId) {
      setMemberships([]);
      setActiveOrgId(null);
      setMembershipsLoadedFor(null);
      return undefined;
    }

    const loadMemberships = async () => {
      const [membershipResult, adminResult] = await Promise.all([
        supabase
          .from("organisation_memberships")
          .select("org_id, role, status, organisations(id, name, slug)")
          .eq("user_id", sessionUserId)
          .eq("status", "active"),
        supabase.from("platform_admins").select("user_id").eq("user_id", sessionUserId).maybeSingle(),
      ]);

      if (!isMounted) return;

      let rows = membershipResult.error ? [] : (membershipResult.data || []).filter((row) => row.organisations);

      if (adminResult.data) {
        const { data: allOrgs } = await supabase.from("organisations").select("id, name, slug").order("name");
        if (!isMounted) return;
        rows = (allOrgs || []).map((org) => ({ org_id: org.id, role: "admin", status: "active", organisations: org }));
      }
      setMemberships(rows);

      let stored = null;
      try {
        stored = window.localStorage.getItem(`standard-work-active-org:${sessionUserId}`);
      } catch (storageError) {
        stored = null;
      }

      const storedMatch = rows.find((row) => row.org_id === stored);
      if (storedMatch) {
        setActiveOrgId(storedMatch.org_id);
      } else if (rows.length === 1) {
        setActiveOrgId(rows[0].org_id);
      } else {
        setActiveOrgId(null);
      }

      setMembershipsLoadedFor(sessionUserId);
    };

    loadMemberships();

    return () => {
      isMounted = false;
    };
  }, [sessionUserId, demoAccess]);

  const activeMembership = useMemo(
    () => memberships.find((row) => row.org_id === activeOrgId) || null,
    [memberships, activeOrgId],
  );
  const activeOrgName = activeMembership?.organisations?.name || "";

  const selectOrganisation = (orgId) => {
    if (sessionUserId) {
      try {
        if (orgId) {
          window.localStorage.setItem(`standard-work-active-org:${sessionUserId}`, orgId);
        } else {
          window.localStorage.removeItem(`standard-work-active-org:${sessionUserId}`);
        }
      } catch (storageError) {
        // Remembering the choice is optional.
      }
    }
    setDemoRoleOverride(null);
    setCurrentPage("board");
    setSettingsOpen(false);
    setActiveOrgId(orgId);
  };

  const rangeDates = useMemo(() => {
    const currentDate = dateValue(selectedDate);
    if (viewMode === "day") return [currentDate];
    if (viewMode === "week") {
      const start = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    if (viewMode === "month") return monthDates(currentDate);
    const start = dateValue(customStart);
    const end = dateValue(customEnd);
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return Array.from({ length: total }, (_, index) => addDays(start, index));
  }, [viewMode, selectedDate, customStart, customEnd]);

  const kpiRange = useMemo(() => {
    const end = new Date();
    if (kpiPreset === "24h") {
      return {
        start: addDays(end, -1),
        end,
        label: "Last 24 hours",
      };
    }
    if (kpiPreset === "7d") {
      return {
        start: addDays(end, -6),
        end,
        label: "Last 7 days",
      };
    }
    if (kpiPreset === "14d") {
      return {
        start: addDays(end, -13),
        end,
        label: "Last 14 days",
      };
    }
    if (kpiPreset === "30d") {
      return {
        start: addDays(end, -29),
        end,
        label: "Last 30 days",
      };
    }
    return {
      start: dateValue(kpiStart),
      end: dateValue(kpiEnd),
      label: `${toDateLabel(dateValue(kpiStart), "short")} – ${toDateLabel(dateValue(kpiEnd), "short")}`,
    };
  }, [kpiPreset, kpiStart, kpiEnd]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "day") return toDateLabel(dateValue(selectedDate), "full");
    if (viewMode === "week") {
      const start = rangeDates[0];
      const end = rangeDates[rangeDates.length - 1];
      return `${toDateLabel(start, "short")} – ${toDateLabel(end, "short")}`;
    }
    if (viewMode === "month") return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(dateValue(selectedDate));
    return `${toDateLabel(dateValue(customStart), "short")} – ${toDateLabel(dateValue(customEnd), "short")}`;
  }, [viewMode, selectedDate, customStart, customEnd, rangeDates]);

  const locationOptions = useMemo(
    () => [...new Set(resourcesConfig.map((resource) => resource.zone).filter(Boolean))],
    [resourcesConfig]
  );

  const visibleTasks = useMemo(() => {
    const selectedRangeKeys = new Set(rangeDates.map((date) => formatDateISO(date)));
    return tasks.filter((task) => {
      const start = new Date(task.start);
      const end = new Date(task.end);
      const startKey = formatDateISO(start);
      const endKey = formatDateISO(end);
      const matchesLocation = locationFilter === "all" || (resources.find((resource) => resource.id === task.resourceId)?.zone || "") === locationFilter;
      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "issue"
          ? task.type === "issue" || task.status === "issue"
          : task.status === statusFilter;
      return matchesLocation && matchesStatus && (selectedRangeKeys.has(startKey) || selectedRangeKeys.has(endKey) || (start < rangeDates[0] && end > rangeDates[rangeDates.length - 1]));
    });
  }, [locationFilter, rangeDates, resources, statusFilter, tasks]);

  const filteredVisibleTasks = useMemo(() => {
    const byType = workTypeFilter === "all" ? visibleTasks : visibleTasks.filter((task) => task.type === workTypeFilter);
    if (locationFilter === "all") return byType;
    const byLocation = byType.filter((task) => (resources.find((resource) => resource.id === task.resourceId)?.zone || "") === locationFilter);
    return byLocation;
  }, [locationFilter, resources, visibleTasks, workTypeFilter]);

  const openIssues = tasks.filter((task) => task.status !== "completed" && (task.type === "issue" || task.status === "issue")).length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  const kpiTasks = useMemo(() => {
    const rangeStart = kpiRange.start.getTime();
    const rangeEnd = kpiRange.end.getTime();
    return tasks.filter((task) => {
      const start = new Date(task.start).getTime();
      const end = new Date(task.end).getTime();
      return start <= rangeEnd && end >= rangeStart;
    });
  }, [tasks, kpiRange]);

  const roomUtilRows = useMemo(() => {
    const rangeStart = kpiRange.start.getTime();
    const rangeEnd = kpiRange.end.getTime();
    const totalMinutes = Math.max(1, (rangeEnd - rangeStart) / 60000);

    return resources.map((resource) => {
      const roomTasks = tasks.filter((task) => task.resourceId === resource.id && task.status !== "completed");
      const scheduledMinutes = roomTasks.reduce((sum, task) => {
        const taskStart = new Date(task.start).getTime();
        const taskEnd = new Date(task.end).getTime();
        const overlapStart = Math.max(taskStart, rangeStart);
        const overlapEnd = Math.min(taskEnd, rangeEnd);
        if (overlapEnd <= overlapStart) return sum;
        return sum + (overlapEnd - overlapStart) / 60000;
      }, 0);

      const utilisation = Math.min(100, Math.round((scheduledMinutes / totalMinutes) * 100));
      const issues = roomTasks.filter((task) => task.type === "issue" || task.status === "issue").length;
      const completedInRange = tasks.filter((task) => task.resourceId === resource.id && task.status === "completed" && new Date(task.end).getTime() >= rangeStart && new Date(task.end).getTime() <= rangeEnd).length;

      return {
        id: resource.id,
        name: resource.name,
        floor: resource.zone,
        utilisation,
        completed: completedInRange,
        issues,
      };
    });
  }, [tasks, kpiRange, resources]);

  const floorUtilRows = useMemo(() => {
    const floorMap = new Map();
    roomUtilRows.forEach((row) => {
      const existing = floorMap.get(row.floor) || { floor: row.floor, utilisation: 0, completed: 0, issues: 0, rooms: 0 };
      existing.utilisation += row.utilisation;
      existing.completed += row.completed;
      existing.issues += row.issues;
      existing.rooms += 1;
      floorMap.set(row.floor, existing);
    });

    return [...floorMap.values()].map((row) => ({
      floor: row.floor,
      utilisation: Math.round(row.utilisation / row.rooms),
      completed: row.completed,
      issues: row.issues,
    }));
  }, [roomUtilRows]);

  const completedByType = useMemo(() => {
    const map = new Map();
    kpiTasks
      .filter((task) => task.status === "completed")
      .forEach((task) => {
        const key = task.type || "activity";
        map.set(key, (map.get(key) || 0) + 1);
      });
    return [...map.entries()].map(([type, count]) => ({ type: typeLabels[type] || labels[type] || type, count }));
  }, [kpiTasks, typeLabels]);

  const issueBreakdown = useMemo(() => {
    return kpiTasks
      .filter((task) => task.type === "issue" || task.status === "issue")
      .map((task) => ({
        title: task.title,
        raisedBy: task.person || "Unassigned",
        room: resources.find((resource) => resource.id === task.resourceId)?.name || "Unassigned",
        delayMinutes: Number(task.delayMinutes ?? 0),
      }));
  }, [kpiTasks, resources]);

  const delayPareto = useMemo(() => {
    const map = new Map();
    kpiTasks
      .filter((task) => task.type === "issue" || task.status === "issue")
      .forEach((task) => {
        const key = task.title || "Unlabelled issue";
        const current = map.get(key) || {
          title: task.title || "Unlabelled issue",
          raisedBy: task.person || "Unassigned",
          room: resources.find((resource) => resource.id === task.resourceId)?.name || "Unassigned",
          count: 0,
          delayMinutes: 0,
        };
        current.count += 1;
        current.delayMinutes += Number(task.delayMinutes ?? 0);
        map.set(key, current);
      });

    return [...map.values()].sort((a, b) => b.delayMinutes - a.delayMinutes || b.count - a.count);
  }, [kpiTasks, resources]);

  const issueCategoryPareto = useMemo(() => {
    const map = new Map();
    kpiTasks
      .filter((task) => task.type === "issue" || task.status === "issue")
      .forEach((task) => {
        const category = task.issueActivity || task.type || "Unspecified";
        const current = map.get(category) || { category, totalDelayMinutes: 0 };
        current.totalDelayMinutes += Number(task.delayMinutes ?? 0);
        map.set(category, current);
      });

    return [...map.values()]
      .map((item) => ({ category: item.category, delayMinutes: item.totalDelayMinutes }))
      .sort((a, b) => b.delayMinutes - a.delayMinutes);
  }, [kpiTasks]);

  const issueTitlePareto = useMemo(() => {
    const map = new Map();
    kpiTasks
      .filter((task) => task.type === "issue" || task.status === "issue")
      .forEach((task) => {
        const title = (task.title || "Unlabelled issue").replace(/^Issue:\s*/i, "");
        const current = map.get(title) || { title, totalDelayMinutes: 0 };
        current.totalDelayMinutes += Number(task.delayMinutes ?? 0);
        map.set(title, current);
      });

    return [...map.values()]
      .map((item) => ({ title: item.title, delayMinutes: item.totalDelayMinutes }))
      .sort((a, b) => b.delayMinutes - a.delayMinutes);
  }, [kpiTasks]);

  const totalDelayMinutes = useMemo(() => delayPareto.reduce((sum, item) => sum + item.delayMinutes, 0), [delayPareto]);

  const totalUtilisation = useMemo(() => {
    if (!roomUtilRows.length) return 0;
    return Math.round(roomUtilRows.reduce((sum, row) => sum + row.utilisation, 0) / roomUtilRows.length);
  }, [roomUtilRows]);

  const normalizeRole = (role) => (["org_admin", "super_admin", "site_admin"].includes(role) ? "admin" : role);
  const membershipRole = activeMembership ? normalizeRole(activeMembership.role) : null;
  const isRealSession = hasSupabase && !demoAccess;
  const canPreviewRoles = demoAccess || membershipRole === "admin";
  const currentRole = (canPreviewRoles && demoRoleOverride)
    || (isRealSession ? (membershipRole || "viewer") : "admin");
  const cleanerDisplayName = useMemo(() => {
    const candidateNames = [
      profile?.name,
      profile?.full_name,
      profile?.display_name,
      session?.user?.user_metadata?.full_name,
      session?.user?.user_metadata?.name,
      session?.user?.email ? session.user.email.split("@")[0] : "",
    ].filter(Boolean);

    const knownNames = personLanes.map((person) => person.name || person.id);

    for (const candidate of candidateNames) {
      const normalized = String(candidate).trim();
      const lowered = normalized.toLowerCase();
      const match = knownNames.find((name) => name.toLowerCase() === lowered || name.toLowerCase().startsWith(lowered) || lowered.includes(name.toLowerCase()));
      if (match) return match;
      const token = normalized.split(/[._-\s]+/).find(Boolean);
      if (token && knownNames.some((name) => name.toLowerCase() === token.toLowerCase())) {
        return knownNames.find((name) => name.toLowerCase() === token.toLowerCase());
      }
    }

    return null;
  }, [personLanes, profile, session]);
  const cleanerDisplayNameValue = cleanerDisplayName || profile?.name || profile?.full_name || session?.user?.email?.split("@")[0] || "Cleaner";
  const cleanerAssignedResourceIds = useMemo(() => {
    if (currentRole !== "cleaner") return [];

    const normalizedCleanerName = cleanerDisplayNameValue.toLowerCase();
    const assignedIds = new Set();

    resources.forEach((resource) => {
      const candidateOwners = [resource.assignedTo, resource.owner, resource.person, resource.name].filter(Boolean);
      candidateOwners.forEach((owner) => {
        if (String(owner).toLowerCase() === normalizedCleanerName) {
          assignedIds.add(resource.id);
        }
      });
    });

    tasks.forEach((task) => {
      if (task.person && task.person.toLowerCase() === normalizedCleanerName) {
        if (task.resourceId) assignedIds.add(task.resourceId);
      }
    });

    return [...assignedIds];
  }, [cleanerDisplayNameValue, currentRole, resources, tasks]);
  const isAuthenticated = Boolean(session || demoAccess);
  const isAdmin = currentRole === "admin";
  const canManageSettings = isAdmin;
  const canAddWorkItem = ["admin", "manager", "operations", "cleaner"].includes(currentRole);
  const canEditTasks = ["admin", "manager", "operations", "cleaner"].includes(currentRole);
  const canViewKpis = ["admin", "manager", "operations"].includes(currentRole);
  const canViewPerformance = ["admin", "manager"].includes(currentRole);

  const handleDemoAccess = () => {
    setDemoAccess(true);
    setDemoRoleOverride("admin");
    setProfile({ role: "admin" });
    setSession({ user: { email: "demo@local.dev" } });
    setAuthMessage("Demo access enabled. You can use the app without sending an email link.");
  };

  const handleOAuthSignIn = async (provider) => {
    if (!hasSupabase || !supabase) {
      setAuthMessage("SSO is not configured yet. Use demo access until your provider is wired up.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const redirectTarget = new URL("/", getAppBaseUrl()).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTarget,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setAuthMessage(error.message.includes("rate") || error.message.includes("limit")
        ? "Email link requests are rate-limited. Use Microsoft/Google SSO or continue in demo mode."
        : error.message);
    }

    setAuthLoading(false);
  };

  const handleMagicLinkSignIn = async () => {
    if (!hasSupabase || !supabase) {
      setAuthMessage("Supabase is not configured yet. Use demo access until SSO is enabled.");
      return;
    }

    const email = authEmail.trim();
    if (!email) {
      setAuthMessage("Enter your email address first.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAppBaseUrl(),
      },
    });

    if (error) {
      const isRateLimited = /rate|limit/i.test(error.message || "");
      setAuthMessage(
        isRateLimited
          ? "Email link requests are rate-limited. Please use Microsoft/Google SSO or continue in demo mode instead."
          : error.message
      );
    } else {
      setAuthMessage("Magic link sent. Check your inbox and return here after signing in.");
    }

    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (hasSupabase && supabase) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setSession(null);
    setMemberships([]);
    setActiveOrgId(null);
    setDemoRoleOverride(null);
    setDemoAccess(false);
    setAuthMessage("");
  };

  const persistBusinessSettings = async () => {
    const payload = { resourcesConfig, standardTimings, workTypes };
    setResources(resourcesConfig);

    if (!hasSupabase || !supabase || demoAccess) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("standard-work-business-config", JSON.stringify(payload));
      }
      return;
    }

    if (!activeOrgId) return;

    try {
      const results = await Promise.all([
        supabase.from("organisation_settings").upsert({
          id: activeOrgId,
          org_id: activeOrgId,
          resource_config: resourcesConfig,
          standard_timings: standardTimings,
          work_types: workTypes,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" }),
        supabase.from("standard_work_resources").upsert(
          resourcesConfig.map((resource) => ({
            id: resource.id,
            org_id: activeOrgId,
            name: resource.name,
            zone: resource.zone,
            role: resource.type || "",
            status: resource.status,
          })),
          { onConflict: "org_id,id" }
        ),
        supabase.from("standard_task_timings").upsert(
          Object.entries(standardTimings).map(([type, minutes]) => ({
            id: `${activeOrgId}:${type}`,
            org_id: activeOrgId,
            work_type: type,
            standard_minutes: minutes,
          })),
          { onConflict: "id" }
        ),
      ]);

      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;
    } catch (error) {
      setNotice("Could not save settings to the server. Check your access and try again.");
      setTimeout(() => setNotice(""), 2500);
    }
  };

  const handleExportCsv = () => {
    const headers = ["id", "resourceId", "title", "type", "person", "start", "end", "status", "note", "issueReason", "issueActivity", "delayMinutes", "completed_at", "completed_by", "updated_at", "updated_by"];
    const rows = tasks.map((task) => headers.map((header) => {
      const value = task[header] ?? "";
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }));

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `standard-work-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice("CSV export downloaded.");
    setTimeout(() => setNotice(""), 2200);
  };

  const navigateDate = (direction) => {
    const current = dateValue(selectedDate);
    const step = viewMode === "day" ? 1 : viewMode === "week" ? 7 : viewMode === "month" ? 30 : 1;
    setSelectedDate(formatDateISO(addDays(current, direction * step)));
  };

  const laneMatches = (task) => (laneMode === "resource" ? task.resourceId : task.person);
  const getLaneName = (lane) => lane.name || lane.id;
  const getResourceState = (lane) => {
    if (!lane || laneMode !== "resource") {
      return { label: "Resource available / in use", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }

    const activeTasks = tasks.filter((task) => laneMatches(task) === lane.id && task.status !== "completed");
    const hasIssue = activeTasks.some((task) => task.type === "issue" || task.status === "issue");
    if (hasIssue) {
      return { label: "Resource unavailable / issue", tone: "bg-rose-100 text-rose-800 border-rose-200" };
    }

    const guestStays = activeTasks.filter((task) => task.type === "booking" && task.person === "Guest");
    // Only block a room before a guest stay if there is still outstanding work scheduled before arrival.
    // Work after the guest check-in is acceptable because the room is already occupied or in use.
    const blockingPreGuestWork = activeTasks.some((task) => {
      if (task.type === "booking" && task.person === "Guest") return false;
      const taskStart = new Date(task.start).getTime();
      return guestStays.some((guestStay) => taskStart < new Date(guestStay.start).getTime());
    });

    if (blockingPreGuestWork) {
      return { label: "Resource unavailable / issue", tone: "bg-rose-100 text-rose-800 border-rose-200" };
    }

    return { label: "Resource available / in use", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  };
  const renderTaskStatusIndicator = (task) => {
    if (task.type === "issue" || task.status === "issue") {
      return (
        <span className="grid h-4 w-4 place-items-center rounded-full border border-rose-500 bg-white text-rose-600">
          <X size={10} strokeWidth={2.5} />
        </span>
      );
    }

    if (task.status === "completed") {
      return (
        <span className="grid h-4 w-4 place-items-center rounded-full border border-emerald-600 bg-white text-emerald-700">
          <Check size={10} strokeWidth={2.5} />
        </span>
      );
    }

    return null;
  };

  const handleTaskDragStart = (event, task) => {
    if (!task) return;
    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(task.id));
  };

  const handleTaskDrop = (event, laneId, dateKey, hour = 9) => {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData("text/plain")) || draggedTaskId;
    const taskToMove = tasks.find((task) => task.id === taskId);
    if (!taskToMove || !taskId) return;

    const originalStart = new Date(taskToMove.start);
    const originalEnd = new Date(taskToMove.end);
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const targetStart = dateValue(dateKey);
    targetStart.setHours(hour, 0, 0, 0);
    const targetEnd = new Date(targetStart.getTime() + durationMs);

    setPendingMove({
      taskId: taskToMove.id,
      title: taskToMove.title,
      from: `${toDateTimeLabel(taskToMove.start)} (${laneMode === "resource" ? taskToMove.resourceId : taskToMove.person})`,
      to: `${toDateTimeLabel(targetStart)} (${laneId})`,
      targetLaneId: laneId,
      targetStart,
      targetEnd,
      originalStart,
      originalEnd,
    });
    setDraggedTaskId(null);
  };

  const updatePendingMoveTime = (field, value) => {
    setPendingMove((current) => {
      if (!current) return current;
      const durationMs = new Date(current.originalEnd).getTime() - new Date(current.originalStart).getTime();
      const currentDate = formatDateISO(new Date(current.targetStart));
      const startDateTime = new Date(`${currentDate}T${toTimeInputValue(current.targetStart)}:00`);
      const endDateTime = new Date(`${currentDate}T${toTimeInputValue(current.targetEnd)}:00`);

      if (field === "date") {
        const nextStart = new Date(`${value}T${toTimeInputValue(current.targetStart)}:00`);
        const nextEnd = new Date(nextStart.getTime() + durationMs);
        return {
          ...current,
          targetStart: nextStart,
          targetEnd: nextEnd,
          to: `${toDateTimeLabel(nextStart)} (${current.targetLaneId})`,
        };
      }

      if (field === "start") {
        const nextStart = new Date(`${currentDate}T${value}:00`);
        const nextEnd = new Date(nextStart.getTime() + durationMs);
        return {
          ...current,
          targetStart: nextStart,
          targetEnd: nextEnd,
          to: `${toDateTimeLabel(nextStart)} (${current.targetLaneId})`,
        };
      }

      const nextEnd = new Date(`${currentDate}T${value}:00`);
      const nextStart = new Date(nextEnd.getTime() - durationMs);
      return {
        ...current,
        targetStart: nextStart,
        targetEnd: nextEnd,
        to: `${toDateTimeLabel(nextStart)} (${current.targetLaneId})`,
      };
    });
  };

  const confirmPendingMove = async () => {
    if (!pendingMove) return;

    const taskToMove = tasks.find((task) => task.id === pendingMove.taskId);
    if (!taskToMove) {
      setPendingMove(null);
      return;
    }

    const movedStart = new Date(pendingMove.targetStart);
    const movedEnd = new Date(pendingMove.targetEnd);
    const durationMs = new Date(taskToMove.end).getTime() - new Date(taskToMove.start).getTime();
    const updatedTask = {
      ...taskToMove,
      resourceId: laneMode === "resource" ? pendingMove.targetLaneId : taskToMove.resourceId,
      person: laneMode === "person" ? pendingMove.targetLaneId : taskToMove.person,
      start: toLocalDateTimeString(movedStart),
      end: toLocalDateTimeString(new Date(movedStart.getTime() + durationMs)),
      updated_at: new Date().toISOString(),
      updated_by: getCurrentUserName(session, profile),
    };

    setTasks((current) => current.map((task) => (task.id === pendingMove.taskId ? updatedTask : task)));
    setPendingMove(null);
    setNotice(`Moved "${updatedTask.title}" to ${toDateTimeLabel(updatedTask.start)}.`);
    setTimeout(() => setNotice(""), 2200);

    if (hasSupabase && supabase) {
      await persistTaskUpdate(updatedTask);
    }
  };

  const taskIsOpen = (task) => task.status !== "completed" && task.type !== "issue";
  const todayKey = formatDateISO(new Date());
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const currentHourPercent = (currentHour / 24) * 100;
  const showLiveTimeMarker = viewMode === "day" || rangeDates.some((date) => formatDateISO(date) === todayKey);
  const showTimeGrid = viewMode === "day" || (viewMode === "custom" && rangeDates.length <= 7);
  const isTodayDate = (dateInput) => formatDateISO(new Date(dateInput)) === todayKey;

  const persistTaskUpdate = async (task) => {
    if (!hasSupabase || !supabase || demoAccess || !activeOrgId) return;
    const { error } = await supabase.from("standard_work_tasks").upsert({ ...toSupabaseTask(task), org_id: activeOrgId }, { onConflict: "id" });
    if (error) {
      setSyncMessage("Supabase update failed, but the local board was updated.");
    }
  };

  const getCompletionMeta = (task) => {
    if (task.status !== "completed") return null;

    const completedAtText = task.completed_at ?? task.completedAt ?? null;
    const completedAt = completedAtText ? new Date(completedAtText) : null;
    const completedBy = task.completed_by || task.completedBy ||
      profile?.name ||
      profile?.full_name ||
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      session?.user?.email ||
      "Current user";

    return {
      when: completedAt && Number.isFinite(completedAt.getTime())
        ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(completedAt)
        : "Unknown time",
      by: completedBy,
    };
  };

  const getUpdatedMeta = (task) => {
    const updatedAtText = task.updated_at || task.updatedAt || task.completed_at || task.completedAt || task.start;
    const updatedAt = updatedAtText ? new Date(updatedAtText) : null;
    return {
      when: updatedAt && Number.isFinite(updatedAt.getTime())
        ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(updatedAt)
        : "Unknown time",
      by: task.updated_by || task.updatedBy || getCurrentUserName(session, profile),
    };
  };

  const toggleComplete = async (taskId) => {
    const nextTask = tasks.find((task) => task.id === taskId);
    if (!nextTask) return;

    const isCompleting = nextTask.status !== "completed";
    const completedAt = isCompleting ? new Date().toISOString() : null;
    const completedBy = isCompleting ? getCurrentUserName(session, profile) : null;
    const now = new Date().toISOString();

    const updatedTask = {
      ...nextTask,
      status: isCompleting ? "completed" : "scheduled",
      completed_at: completedAt,
      completed_by: completedBy,
      updated_at: now,
      updated_by: getCurrentUserName(session, profile),
    };

    setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));

    if (hasSupabase && supabase) {
      await persistTaskUpdate(updatedTask);
    }

    setNotice("Task status updated.");
    setTimeout(() => setNotice(""), 2200);
  };

  const deleteTask = async (taskId) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!taskToDelete) return;

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setSelectedTask(null);

    if (hasSupabase && supabase && !demoAccess && activeOrgId) {
      const { error } = await supabase.from("standard_work_tasks").delete().eq("id", taskId).eq("org_id", activeOrgId);
      if (error) {
        setSyncMessage("Task was removed locally, but Supabase deletion failed.");
      }
    }

    setNotice("Task removed from the board.");
    setTimeout(() => setNotice(""), 2200);
  };

  const addTask = async () => {
    if (!form.title.trim() || !form.person.trim() || new Date(form.end) <= new Date(form.start)) {
      setNotice("Add a valid assignee and a start/end time that makes sense.");
      return;
    }

    const newTask = {
      id: Date.now(),
      resourceId: form.resourceId,
      title: form.title,
      type: form.type,
      person: form.person,
      start: form.start,
      end: form.end,
      status: "scheduled",
      note: form.note,
      updated_at: new Date().toISOString(),
      updated_by: getCurrentUserName(session, profile),
    };

    setTasks((current) => [...current, newTask]);

    if (hasSupabase && supabase && !demoAccess && activeOrgId) {
      const { error } = await supabase.from("standard_work_tasks").insert({ ...toSupabaseTask(newTask), org_id: activeOrgId });
      if (error) {
        setSyncMessage("The task was added locally, but Supabase insert failed.");
      }
    }

    setShowCreate(false);
    setNotice("Work item added to the live board.");
    setTimeout(() => setNotice(""), 2200);
  };

  const raiseIssue = async () => {
    if (!selectedTask || !draftIssue.reason.trim()) {
      setNotice("Add a clear reason for the delay or issue.");
      return;
    }
    const delayMinutes = Number(parseDelayMinutes(draftIssue.impact));
    const issueTask = {
      id: Date.now(),
      resourceId: selectedTask.resourceId,
      title: `Issue: ${selectedTask.title}`,
      type: "issue",
      person: selectedTask.person,
      start: selectedTask.start,
      end: selectedTask.end,
      status: "issue",
      note: `Impact: ${draftIssue.impact}. Category: ${draftIssue.category}. Delay: ${formatMinutes(delayMinutes)}.`,
      issueReason: draftIssue.reason,
      issueActivity: draftIssue.category,
      delayMinutes,
      updated_at: new Date().toISOString(),
      updated_by: getCurrentUserName(session, profile),
    };
    setTasks((current) => [...current, issueTask]);

    if (hasSupabase && supabase && !demoAccess && activeOrgId) {
      const { error } = await supabase.from("standard_work_tasks").insert({ ...toSupabaseTask(issueTask), org_id: activeOrgId });
      if (error) {
        setSyncMessage("Issue logged locally, but Supabase sync failed.");
      }
    }

    setShowIssue(false);
    setSelectedTask(null);
    setDraftIssue({ category: "Delay", reason: "", impact: "30 minutes", delayMinutes: "30" });
    setNotice("Issue raised and visible to the team.");
    setTimeout(() => setNotice(""), 2200);
  };

  const queryMatches = (lane) => {
    const text = `${lane.name || lane.id} ${lane.role || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  };

  const boardLanes = useMemo(() => {
    const locationScopedLanes = laneMode === "resource"
      ? laneItems.filter((lane) => locationFilter === "all" || (lane.zone || "") === locationFilter)
      : laneItems;
    const baseLanes = locationScopedLanes.filter(queryMatches);
    if (currentRole !== "cleaner") return baseLanes;

    if (laneMode === "person") {
      const cleanerLaneId = cleanerDisplayNameValue || "Cleaner";
      return baseLanes.filter((lane) => {
        const laneText = getLaneName(lane).toLowerCase();
        return laneText === cleanerLaneId.toLowerCase() || laneText.includes(cleanerLaneId.toLowerCase());
      });
    }

    return baseLanes.filter((lane) => {
      const laneId = String(lane.id || "");
      return cleanerAssignedResourceIds.length
        ? cleanerAssignedResourceIds.some((resourceId) => String(resourceId).toLowerCase() === laneId.toLowerCase())
        : true;
    });
  }, [cleanerAssignedResourceIds, cleanerDisplayNameValue, currentRole, laneItems, laneMode, locationFilter, query]);

  const taskConflictMap = useMemo(() => {
    const conflicts = new Set();
    const taskList = tasks.filter((task) => task.status !== "completed");

    for (let index = 0; index < taskList.length; index += 1) {
      const first = taskList[index];
      const firstStart = new Date(first.start).getTime();
      const firstEnd = new Date(first.end).getTime();

      for (let nextIndex = index + 1; nextIndex < taskList.length; nextIndex += 1) {
        const second = taskList[nextIndex];
        const secondStart = new Date(second.start).getTime();
        const secondEnd = new Date(second.end).getTime();
        const sameResource = first.resourceId === second.resourceId;
        const samePerson = first.person && second.person && first.person === second.person;

        if (!sameResource && !samePerson) continue;
        const overlaps = firstStart < secondEnd && secondStart < firstEnd;
        if (overlaps) {
          conflicts.add(first.id);
          conflicts.add(second.id);
        }
      }
    }

    return conflicts;
  }, [tasks]);

  const operationalAlerts = useMemo(() => {
    const issueCount = tasks.filter((task) => task.type === "issue" || task.status === "issue").length;
    const overdueCount = tasks.filter((task) => task.status !== "completed" && !(task.type === "issue" || task.status === "issue") && new Date(task.end).getTime() < Date.now()).length;
    const conflictCount = tasks.filter((task) => taskConflictMap.has(task.id)).length;

    return [
      ...(issueCount > 0 ? [{ type: "issue", message: `Issue ${issueCount}`, taskId: "issues" }] : []),
      ...(overdueCount > 0 ? [{ type: "overdue", message: `Overdue ${overdueCount}`, taskId: "overdue" }] : []),
      ...(conflictCount > 0 ? [{ type: "conflict", message: `Conflict ${conflictCount}`, taskId: "conflict" }] : []),
    ];
  }, [taskConflictMap, tasks]);

  const visibleBoardTasks = useMemo(() => {
    if (currentRole !== "cleaner") return filteredVisibleTasks;

    const cleanerNames = new Set([
      cleanerDisplayNameValue.toLowerCase(),
      (profile?.name || "").toLowerCase(),
      (profile?.full_name || "").toLowerCase(),
      (session?.user?.user_metadata?.full_name || "").toLowerCase(),
      (session?.user?.user_metadata?.name || "").toLowerCase(),
      (session?.user?.email || "").split("@")[0].toLowerCase(),
    ].filter(Boolean));

    return filteredVisibleTasks.filter((task) => {
      const isOwnedByCleaner = Boolean(task.person && cleanerNames.has(String(task.person).toLowerCase()));
      const isAssignedResource = cleanerAssignedResourceIds.length > 0 && cleanerAssignedResourceIds.includes(task.resourceId);
      return isOwnedByCleaner || isAssignedResource;
    });
  }, [cleanerAssignedResourceIds, cleanerDisplayNameValue, currentRole, filteredVisibleTasks, profile, session]);

  const getTaskCompletionVarianceMinutes = (task) => {
    if (task.status !== "completed") return 0;
    const scheduledCompletionTime = new Date(task.end).getTime();
    const completionCandidates = [task.completed_at, task.completedAt, task.updated_at, task.updatedAt]
      .map((value) => {
        const date = value ? new Date(value) : null;
        return date && Number.isFinite(date.getTime()) ? date.getTime() : null;
      })
      .filter((value) => value !== null);
    const completionTimestamp = completionCandidates.length ? completionCandidates[completionCandidates.length - 1] : Date.now();
    return Math.round((completionTimestamp - scheduledCompletionTime) / 60000);
  };

  const getTaskVarianceDisplayMinutes = (task) => {
    const varianceMinutes = getTaskCompletionVarianceMinutes(task);
    if (varianceMinutes <= -15) return Math.abs(varianceMinutes);
    if (Math.abs(varianceMinutes) <= 15) return 0;
    return -Math.abs(varianceMinutes);
  };

  const getTaskCompletionTiming = (task) => {
    if (task.status !== "completed") return null;
    const varianceMinutes = getTaskCompletionVarianceMinutes(task);

    if (varianceMinutes <= -15) return { label: "early", varianceMinutes };
    if (Math.abs(varianceMinutes) <= 15) return { label: "on_time", varianceMinutes };
    return { label: "late", varianceMinutes };
  };

  const teamPerformanceRows = useMemo(() => {
    const rows = new Map();

    kpiTasks.forEach((task) => {
      const person = task.person || "Unassigned";
      if (["Guest", "Customer", "Unassigned"].includes(person)) return;

      const current = rows.get(person) || {
        person,
        plannedCount: 0,
        completedCount: 0,
        plannedMinutes: 0,
        completedMinutes: 0,
        issueCount: 0,
        earlyCount: 0,
        onTimeCount: 0,
        lateCount: 0,
        earlyVarianceMinutes: 0,
        lateVarianceMinutes: 0,
        varianceMinutes: 0,
      };

      const durationMinutes = Math.max(0, (new Date(task.end).getTime() - new Date(task.start).getTime()) / 60000);
      const timing = getTaskCompletionTiming(task);
      const displayVarianceMinutes = task.status === "completed" ? getTaskVarianceDisplayMinutes(task) : 0;
      current.plannedCount += 1;
      current.plannedMinutes += durationMinutes;
      if (task.status === "completed") {
        current.completedCount += 1;
        current.completedMinutes += durationMinutes;
        if (timing?.label === "early") {
          current.earlyCount += 1;
          current.earlyVarianceMinutes += Math.abs(timing.varianceMinutes);
          current.varianceMinutes += displayVarianceMinutes;
        }
        if (timing?.label === "on_time") {
          current.onTimeCount += 1;
        }
        if (timing?.label === "late") {
          current.lateCount += 1;
          current.lateVarianceMinutes += Math.abs(timing.varianceMinutes);
          current.varianceMinutes += displayVarianceMinutes;
        }
      }
      if (task.type === "issue" || task.status === "issue") {
        current.issueCount += 1;
      }
      rows.set(person, current);
    });

    return [...rows.values()]
      .map((row) => ({
        ...row,
        completionRate: row.plannedCount ? Math.round((row.completedCount / row.plannedCount) * 100) : 0,
      }))
      .sort((a, b) => b.completedCount - a.completedCount || b.plannedCount - a.plannedCount);
  }, [kpiTasks]);

  useEffect(() => {
    if (!teamPerformanceRows.length) {
      setSelectedTeamMember("");
      return;
    }
    if (!selectedTeamMember || !teamPerformanceRows.some((row) => row.person === selectedTeamMember)) {
      setSelectedTeamMember(teamPerformanceRows[0].person);
    }
  }, [teamPerformanceRows, selectedTeamMember]);

  const completionTimingBreakdown = useMemo(() => {
    const totals = { early: 0, on_time: 0, late: 0 };
    kpiTasks
      .filter((task) => task.status === "completed")
      .forEach((task) => {
        const timing = getTaskCompletionTiming(task);
        if (timing) totals[timing.label] += 1;
      });
    return totals;
  }, [kpiTasks]);

  const highestOutputRow = teamPerformanceRows.length
    ? teamPerformanceRows.reduce((best, row) => (row.completedMinutes > best.completedMinutes ? row : best), teamPerformanceRows[0])
    : null;
  const lowestOutputRow = teamPerformanceRows.length
    ? teamPerformanceRows.reduce((worst, row) => (row.completedMinutes < worst.completedMinutes ? row : worst), teamPerformanceRows[0])
    : null;
  const selectedTeamRow = teamPerformanceRows.find((row) => row.person === selectedTeamMember) || teamPerformanceRows[0] || null;

  const filteredTimingRows = useMemo(() => {
    if (timingFilter === "all") return teamPerformanceRows;
    return teamPerformanceRows.filter((row) => {
      if (timingFilter === "early") return row.earlyCount > 0;
      if (timingFilter === "on_time") return row.onTimeCount > 0;
      return row.lateCount > 0;
    });
  }, [teamPerformanceRows, timingFilter]);

  const kpiCards = [
    { key: "overall", label: "Overall utilisation", value: `${totalUtilisation}%`, sub: `Across ${kpiRange.label}` },
    { key: "completed", label: "Completed tasks", value: `${kpiTasks.filter((task) => task.status === "completed").length}`, sub: "Within the selected window" },
    { key: "issues", label: "Open issues", value: `${kpiTasks.filter((task) => task.status !== "completed" && (task.type === "issue" || task.status === "issue")).length}`, sub: "Requires follow-up" },
    { key: "delay", label: "Downtime / delay", value: formatMinutes(totalDelayMinutes), sub: "Across issue events" },
    { key: "rooms", label: "Resources in use", value: `${roomUtilRows.filter((row) => row.utilisation > 0).length}`, sub: "Of all resources" },
  ];

  const activeKpiTable = (() => {
    const tableMap = {
      overall: {
        title: "Resource utilisation",
        badge: "By resource",
        columns: ["Resource", "Zone", "Utilisation", "Completed", "Issues", "Issue title"],
        rows: roomUtilRows.map((row) => {
          const issueTitles = kpiTasks
            .filter((task) => task.resourceId === row.id && (task.type === "issue" || task.status === "issue"))
            .map((task) => task.title);

          return {
            key: row.id,
            cells: [row.name, row.floor, `${row.utilisation}%`, row.completed, row.issues, issueTitles.length ? issueTitles.join(", ") : ""],
          };
        }),
      },
      completed: {
        title: "Completed activity mix",
        badge: kpiRange.label,
        columns: ["Type", "Completed"],
        rows: completedByType.map((row) => ({ key: row.type, cells: [row.type, row.count] })),
      },
      issues: {
        title: "Open issue summary",
        badge: "By issue",
        columns: ["Issue", "Raised by", "Resource"],
        rows: issueBreakdown.map((row) => ({ key: `${row.room}-${row.title}-${row.raisedBy}`, cells: [row.title, row.raisedBy, row.room] })),
      },
      delay: {
        title: "Issue delay Pareto",
        badge: "By disruption",
        columns: ["Issue", "Raised by", "Resource", "Count", "Delay"],
        rows: delayPareto.map((row) => ({
          key: `${row.room}-${row.title}-${row.raisedBy}`,
          cells: [row.title, row.raisedBy, row.room, row.count, formatMinutes(row.delayMinutes)],
        })),
      },
      rooms: {
        title: "Floor breakdown",
        badge: "By floor",
        columns: ["Floor", "Utilisation", "Completed", "Issues"],
        rows: floorUtilRows.map((row) => ({ key: row.floor, cells: [row.floor, `${row.utilisation}%`, row.completed, row.issues] })),
      },
    };

    return tableMap[kpiFocus] || tableMap.overall;
  })();

  const renderPerformancePage = () => {
    const teamPlannedTotal = teamPerformanceRows.reduce((sum, row) => sum + row.plannedCount, 0);
    const teamCompletedTotal = teamPerformanceRows.reduce((sum, row) => sum + row.completedCount, 0);
    const teamCompletionRate = teamPlannedTotal ? Math.round((teamCompletedTotal / teamPlannedTotal) * 100) : 0;
    const teamPlannedMinutes = teamPerformanceRows.reduce((sum, row) => sum + row.plannedMinutes, 0);
    const teamCompletedMinutes = teamPerformanceRows.reduce((sum, row) => sum + row.completedMinutes, 0);

    return (
      <main className="mx-auto max-w-[1700px] p-6">
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Team performance</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Planned vs completed activity</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
              {kpiRange.label}
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Planned activity", value: teamPlannedTotal, sub: "Total assigned tasks" },
            { label: "Completed activity", value: teamCompletedTotal, sub: "Closed and finished" },
            { label: "Completion rate", value: `${teamCompletionRate}%`, sub: "Across the team" },
            { label: "Planned time", value: formatMinutes(teamPlannedMinutes), sub: "Allocated effort" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
            </div>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completion timing</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Early vs on time vs late delivery</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-1">
                {['24h', '7d', '14d', '30d', 'custom'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setKpiPreset(preset)}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${kpiPreset === preset ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    {preset === '24h' ? '24h' : preset === '7d' ? '7d' : preset === '14d' ? '14d' : preset === '30d' ? '30d' : 'custom'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                View
                <select
                  value={timingFilter}
                  onChange={(event) => setTimingFilter(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                >
                  <option value="all">All</option>
                  <option value="early">Early</option>
                  <option value="on_time">On time</option>
                  <option value="late">Late</option>
                </select>
              </label>
            </div>
          </div>
          {kpiPreset === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-600"><span>From</span><input type="date" value={kpiStart} onChange={(e) => setKpiStart(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><span>To</span><input type="date" value={kpiEnd} onChange={(e) => setKpiEnd(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            {[
              { key: "early", label: "Early", value: completionTimingBreakdown.early, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
              { key: "on_time", label: "On time", value: completionTimingBreakdown.on_time, tone: "border-sky-200 bg-sky-50 text-sky-800" },
              { key: "late", label: "Late", value: completionTimingBreakdown.late, tone: "border-rose-200 bg-rose-50 text-rose-800" },
            ].map((item) => (
              <div key={item.key} className={`rounded-xl border p-3 ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs opacity-80">Completed activities</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Member selector</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Compare output</span>
            </div>

            <label className="block text-sm text-slate-700">
              Team member
              <select
                value={selectedTeamMember}
                onChange={(event) => setSelectedTeamMember(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-700"
              >
                {teamPerformanceRows.map((row) => (
                  <option key={row.person} value={row.person}>{row.person}</option>
                ))}
              </select>
            </label>

            {selectedTeamRow && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Selected member</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedTeamRow.person}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedTeamRow.completedCount} completed / {selectedTeamRow.plannedCount} planned</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Completion rate</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedTeamRow.completionRate}%</p>
                  <p className="mt-1 text-sm text-slate-600">{formatMinutes(selectedTeamRow.completedMinutes)} completed</p>
                </div>
              </div>
            )}

            {selectedTeamRow && (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Early</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedTeamRow.earlyCount}</p>
                  <p className="mt-1 text-xs text-emerald-700">{selectedTeamRow.earlyCount ? `+${formatMinutes(selectedTeamRow.earlyVarianceMinutes)}` : "0m"}</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">On time</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedTeamRow.onTimeCount}</p>
                  <p className="mt-1 text-xs text-sky-700">0m variance</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">Late</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{selectedTeamRow.lateCount}</p>
                  <p className="mt-1 text-xs text-rose-700">{selectedTeamRow.lateCount ? `-${formatMinutes(selectedTeamRow.lateVarianceMinutes)}` : "0m"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">Variance</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatSignedMinutes(selectedTeamRow.varianceMinutes)}</p>
                  <p className="mt-1 text-xs text-slate-700">Net minutes</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Output range</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">High / low</span>
            </div>

            <div className="space-y-3">
              {highestOutputRow && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Highest output</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{highestOutputRow.person}</p>
                  <p className="text-sm text-slate-700">{highestOutputRow.completedCount} completed tasks · {formatMinutes(highestOutputRow.completedMinutes)}</p>
                </div>
              )}

              {lowestOutputRow && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Lowest output</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{lowestOutputRow.person}</p>
                  <p className="text-sm text-slate-700">{lowestOutputRow.completedCount} completed tasks · {formatMinutes(lowestOutputRow.completedMinutes)}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team breakdown</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Member view</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Team member</th>
                  <th className="px-3 py-2 font-semibold">Planned</th>
                  <th className="px-3 py-2 font-semibold">Completed</th>
                  <th className="px-3 py-2 font-semibold">Completion</th>
                  <th className="px-3 py-2 font-semibold">Early</th>
                  <th className="px-3 py-2 font-semibold">On time</th>
                  <th className="px-3 py-2 font-semibold">Late</th>
                  <th className="px-3 py-2 font-semibold">Variance</th>
                  <th className="px-3 py-2 font-semibold">Issues</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimingRows.length ? filteredTimingRows.map((row) => (
                  <tr key={row.person} className="border-t border-slate-200">
                    <td className="px-3 py-3 font-medium text-slate-800">{row.person}</td>
                    <td className="px-3 py-3 text-slate-700">{row.plannedCount}</td>
                    <td className="px-3 py-3 text-slate-700">{row.completedCount}</td>
                    <td className="px-3 py-3 text-slate-700">{row.completionRate}%</td>
                    <td className="px-3 py-3 text-slate-700">{row.earlyCount}</td>
                    <td className="px-3 py-3 text-slate-700">{row.onTimeCount}</td>
                    <td className="px-3 py-3 text-slate-700">{row.lateCount}</td>
                    <td className="px-3 py-3 text-slate-700">{formatSignedMinutes(row.varianceMinutes)}</td>
                    <td className="px-3 py-3 text-slate-700">{row.issueCount}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-slate-500">No team activity recorded for the selected range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    );
  };

  const renderKpiPage = () => (
    <main className="mx-auto max-w-[1700px] p-6">
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operational KPI summary</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Performance overview</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['24h', '7d', '14d', '30d', 'custom'].map((preset) => (
              <button
                key={preset}
                onClick={() => setKpiPreset(preset)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${kpiPreset === preset ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                {preset === '24h' ? '24h' : preset === '7d' ? '7d' : preset === '14d' ? '14d' : preset === '30d' ? '30d' : 'custom'}
              </button>
            ))}
          </div>
        </div>
        {kpiPreset === "custom" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-600"><span>From</span><input type="date" value={kpiStart} onChange={(e) => setKpiStart(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><span>To</span><input type="date" value={kpiEnd} onChange={(e) => setKpiEnd(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
          </div>
        )}
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-4">
        {kpiCards.map(({ key, label, value, sub }) => (
          <button
            key={key}
            type="button"
            onClick={() => setKpiFocus((current) => (current === key ? null : key))}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${kpiFocus === key ? "border-slate-400 bg-slate-50 shadow-inner" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </button>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Issue category Pareto</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">By cause</span>
          </div>
          <div className="space-y-3">
            {issueCategoryPareto.length ? (() => { const max = Math.max(...issueCategoryPareto.map((item) => item.delayMinutes)); return issueCategoryPareto.map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>{item.category}</span>
                  <span className="font-semibold">{formatMinutes(item.delayMinutes)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${(item.delayMinutes / max) * 100}%` }} />
                </div>
              </div>
            )); })() : <p className="text-sm text-slate-500">No issue categories in this range.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Issue title Pareto</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">By title</span>
          </div>
          <div className="space-y-3">
            {issueTitlePareto.length ? (() => { const max = Math.max(...issueTitlePareto.map((item) => item.delayMinutes)); return issueTitlePareto.map((item) => (
              <div key={item.title}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm text-slate-700">
                  <span className="truncate">{item.title}</span>
                  <span className="font-semibold">{formatMinutes(item.delayMinutes)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(item.delayMinutes / max) * 100}%` }} />
                </div>
              </div>
            )); })() : <p className="text-sm text-slate-500">No issue titles in this range.</p>}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{activeKpiTable.title}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{activeKpiTable.badge}</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {activeKpiTable.columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-semibold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeKpiTable.rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-200">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.key}-${index}`} className="px-3 py-2 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );

  const renderSettingsPage = () => (
    <main className="mx-auto max-w-[1400px] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Business configuration</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Resources & standard timings</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            persistBusinessSettings();
            setSettingsOpen(false);
            setNotice("Business settings saved.");
            setTimeout(() => setNotice(""), 2200);
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Save settings
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Resources</h3>
            <button
              type="button"
              onClick={() => setResourcesConfig((current) => [
                ...current,
                { id: `resource-${Date.now()}`, name: "New resource", zone: "Unassigned", type: "resource", status: "Available" },
              ])}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-100"
            >
              <Plus size={15} /> Add resource
            </button>
          </div>

          <div className="space-y-3">
            {resourcesConfig.map((resource, resourceIndex) => (
              <div key={resourceIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                    {resource.type || "resource"}
                  </span>
                  <button type="button" onClick={() => setResourcesConfig((current) => current.filter((_, index) => index !== resourceIndex))} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 hover:bg-rose-100">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Resource name
                    <input
                      value={resource.name}
                      onChange={(event) => setResourcesConfig((current) => current.map((item, index) => index === resourceIndex ? { ...item, name: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    />
                  </label>

                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Resource id
                    <input
                      value={resource.id}
                      onChange={(event) => setResourcesConfig((current) => current.map((item, index) => index === resourceIndex ? { ...item, id: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Location
                    <input
                      value={resource.zone}
                      onChange={(event) => setResourcesConfig((current) => current.map((item, index) => index === resourceIndex ? { ...item, zone: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    />
                  </label>

                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Type
                    <select
                      value={resource.type || "resource"}
                      onChange={(event) => setResourcesConfig((current) => current.map((item, index) => index === resourceIndex ? { ...item, type: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    >
                      <option value="area">Area</option>
                      <option value="team">Team</option>
                      <option value="asset">Asset</option>
                      <option value="resource">Resource</option>
                    </select>
                  </label>
                </div>

              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Work types</h3>
              <p className="mt-1 text-sm text-slate-500">Create reusable types for your operation and then tune default run times below.</p>
            </div>
            <button
              type="button"
              onClick={() => setWorkTypes((current) => [
                ...current,
                { id: `custom-${Date.now()}`, name: `Custom type ${current.length + 1}`, minutes: 60 },
              ])}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-100"
            >
              <Plus size={15} /> Add work type
            </button>
          </div>

          <div className="space-y-3">
            {workTypes.map((type) => (
              <div key={type.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Work type name
                    <input
                      value={type.name}
                      onChange={(event) => setWorkTypes((current) => current.map((item) => item.id === type.id ? { ...item, name: event.target.value } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setWorkTypes((current) => current.filter((item) => item.id !== type.id))}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Type id
                    <input
                      value={type.id}
                      onChange={(event) => setWorkTypes((current) => current.map((item) => item.id === type.id ? { ...item, id: event.target.value.trim() || type.id } : item))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                    />
                  </label>

                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    Default duration
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        value={type.minutes}
                        onChange={(event) => {
                          const nextMinutes = Number(event.target.value) || 5;
                          setWorkTypes((current) => current.map((item) => item.id === type.id ? { ...item, minutes: nextMinutes } : item));
                          setStandardTimings((current) => ({ ...current, [type.id]: nextMinutes }));
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                      />
                      <span className="text-sm text-slate-500">mins</span>
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Standard timings</h3>
          <p className="mt-1 text-sm text-slate-500">Default durations used when planning work items and issue recovery.</p>

          <div className="mt-4 space-y-3">
            {Object.entries(standardTimings).map(([type, minutes]) => (
              <label key={type} className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                {typeLabels[type] || type}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    value={minutes}
                    onChange={(event) => setStandardTimings((current) => ({ ...current, [type]: Number(event.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700"
                  />
                  <span className="text-sm text-slate-500">minutes</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );

  const renderAuthGate = () => (
    <div className="min-h-screen bg-[#f4f6f2] text-slate-900">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#103c2d] text-lime-300 shadow-sm">
              <Sparkles size={28} />
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Bow & Arrow Analytics</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900">Sign in required</h2>
          <p className="mt-3 text-center text-sm text-slate-600">Until someone is signed in, the operations board remains hidden.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("azure")}
              disabled={authLoading}
              className="rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Microsoft
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={authLoading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Continue in demo mode
            </button>
          </div>

          {authMessage && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
              {authMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderOrgScreen = () => {
    const loading = membershipsLoadedFor !== sessionUserId;
    return (
      <div className="min-h-screen bg-[#f4f6f2] text-slate-900">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700">Bow & Arrow Analytics</p>
            {loading ? (
              <h2 className="mt-3 text-center text-xl font-semibold text-slate-700">Loading your organisations...</h2>
            ) : memberships.length === 0 ? (
              <>
                <h2 className="mt-3 text-center text-3xl font-bold text-slate-900">No access yet</h2>
                <p className="mt-3 text-center text-sm text-slate-600">
                  You are signed in, but you have not been added to an organisation. Ask your administrator to grant you access.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-center text-3xl font-bold text-slate-900">Choose an organisation</h2>
                <div className="mt-6 grid gap-3">
                  {memberships.map((membership) => (
                    <button
                      key={membership.org_id}
                      type="button"
                      onClick={() => selectOrganisation(membership.org_id)}
                      className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50"
                    >
                      <span>{membership.organisations?.name || membership.org_id}</span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{membership.role}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={handleSignOut} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (hasSupabase && authReady && !isAuthenticated) return renderAuthGate();
  if (hasSupabase && session && !demoAccess && !activeOrgId) return renderOrgScreen();

  return (
    <div className="min-h-screen bg-[#f4f6f2] text-slate-900">
      <header className="border-b border-slate-200 bg-[#103c2d] text-white">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-300 text-[#103c2d]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lime-200">Bow & Arrow Analytics</p>
              <h1 className="text-xl font-semibold">Standard Work Control Board</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 p-1">
              <button onClick={() => setCurrentPage("board")} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${currentPage === "board" ? "bg-lime-300 text-[#103c2d]" : "text-white/80"}`}>
                Board
              </button>
              {canViewKpis && (
                <button onClick={() => setCurrentPage("kpis")} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${currentPage === "kpis" ? "bg-lime-300 text-[#103c2d]" : "text-white/80"}`}>
                  KPI Summary
                </button>
              )}
              {canViewPerformance && (
                <button onClick={() => setCurrentPage("performance")} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${currentPage === "performance" ? "bg-lime-300 text-[#103c2d]" : "text-white/80"}`}>
                  Team Performance
                </button>
              )}
            </div>
            {currentPage === "board" && canAddWorkItem && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 font-semibold text-[#103c2d] shadow-sm hover:bg-lime-200">
                <Plus size={18} /> Add work item
              </button>
            )}
            <button type="button" onClick={handleExportCsv} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-white/10">
              Export CSV
            </button>
            {canManageSettings && (
              <button type="button" onClick={() => setSettingsOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10" aria-label="Open settings">
                <Settings size={18} />
              </button>
            )}
            {hasSupabase && (
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1.5">
                {session && !demoAccess && (
                  memberships.length > 1 ? (
                    <select
                      value={activeOrgId || ""}
                      onChange={(event) => selectOrganisation(event.target.value)}
                      aria-label="Organisation"
                      className="rounded-md border border-white/10 bg-[#0d1f1c] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white outline-none"
                    >
                      {memberships.map((membership) => (
                        <option key={membership.org_id} value={membership.org_id}>
                          {membership.organisations?.name || membership.org_id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-100">{activeOrgName}</span>
                  )
                )}
                {canPreviewRoles && (
                  <>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-lime-100">Role</span>
                    <select
                      value={demoRoleOverride === null ? currentRole : demoRoleOverride}
                      onChange={(event) => setDemoRoleOverride(event.target.value)}
                      className="rounded-md border border-white/10 bg-[#0d1f1c] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="operations">Operations</option>
                      <option value="cleaner">Cleaner</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </>
                )}
                {session && (
                  <button type="button" onClick={handleSignOut} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10">
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {settingsOpen && canManageSettings ? (
        renderSettingsPage()
      ) : currentPage === "kpis" ? (
        renderKpiPage()
      ) : currentPage === "performance" ? (
        canViewPerformance ? renderPerformancePage() : renderKpiPage()
      ) : (
        <>
          <main className="mx-auto max-w-[1700px] p-6">
        {syncMessage && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {syncMessage}
          </div>
        )}

        {hasSupabase && !isAuthenticated && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Sign in to access the live app</p>
                <p className="text-xs text-slate-500">Use your company identity provider for single sign-on. Email links are disabled in the default flow to avoid rate limits during setup.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("azure")}
                  disabled={authLoading}
                  className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue with Microsoft
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={authLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Continue in demo mode
                </button>
              </div>
            </div>
            {authMessage && (
              <p className="mt-3 text-sm text-slate-600">{authMessage}</p>
            )}
          </div>
        )}

        {isLoading && hasSupabase && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Loading board data from Supabase…
          </div>
        )}

        <section className="mb-5 grid gap-4 lg:grid-cols-4">
          {[
            [Users, "Lanes", `${boardLanes.length || laneItems.length}`, "Live resources"],
            [CheckCircle2, "Open tasks", tasks.filter((task) => task.status !== "completed" && task.type !== "issue").length, "Across the plan"],
            [AlertTriangle, "Open issues", openIssues, openIssues ? "Requires attention" : "No blockers"],
            [Check, "Completed", completedCount, "Closed tasks"],
          ].map(([Icon, label, value, sub]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800"><Icon size={20} /></div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigateDate(-1)} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronLeft size={17} /></button>
              <button onClick={() => navigateDate(1)} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronRight size={17} /></button>
              <div className="flex min-w-[260px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"><CalendarDays size={16} /> {rangeLabel}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-1">
                {['day', 'week', 'month', 'custom'].map((mode) => (
                  <button key={mode} onClick={() => setViewMode(mode)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${viewMode === mode ? 'bg-[#103c2d] text-white' : 'text-slate-600'}`}>
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-1">
                {['resource', 'person'].map((mode) => (
                  <button key={mode} onClick={() => setLaneMode(mode)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${laneMode === mode ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}>
                    {mode}
                  </button>
                ))}
              </div>
              <div className="relative">
                <select value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-700 sm:w-[180px]">
                  <option value="all">All work types</option>
                  {workTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-700 sm:w-[150px]">
                  <option value="all">All status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="issue">Issues</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
              </div>
              <div className="relative">
                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-700 sm:w-[180px]">
                  <option value="all">All locations</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lanes..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-700 sm:w-56" />
              </div>
            </div>
          </div>

          {viewMode === "custom" && (
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-sm text-slate-600"><span>From</span><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><span>To</span><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border bg-white px-2 py-1.5" /></label>
            </div>
          )}

          {operationalAlerts.length > 0 && (
            <div className="border-b border-slate-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">Ops alerts</span>
                {operationalAlerts.map((alert, index) => (
                  <span
                    key={`${alert.type}-${alert.taskId}-${index}`}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${alert.type === "issue" ? "border-rose-200 bg-rose-100 text-rose-800" : alert.type === "overdue" ? "border-orange-200 bg-orange-100 text-orange-800" : "border-sky-200 bg-sky-100 text-sky-800"}`}
                  >
                    {alert.message}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {showTimeGrid ? (
              <div className="min-w-[1480px]">
                <div className="grid bg-slate-50" style={{ gridTemplateColumns: `240px repeat(${HOURS.length}, minmax(58px, 1fr))`, ...boardBorder }}>
                  <div className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={boardBorder}>Resource / location</div>
                  {HOURS.map((hour) => (
                    <div key={hour} className="p-3 text-center text-[11px] font-semibold text-slate-500" style={boardBorder}>{toTimeLabel(hour)}</div>
                  ))}
                </div>

                {boardLanes.map((lane) => {
                  const roomState = laneMode === "resource" ? getResourceState(lane) : null;
                  return (
                  <div key={lane.id} className="grid min-h-[140px]" style={{ gridTemplateColumns: `240px repeat(${HOURS.length}, minmax(58px, 1fr))`, ...boardBorder }}>
                    <div className="flex items-center justify-between gap-3 bg-white p-4" style={boardBorder}>
                      <div>
                        <p className="font-semibold">{getLaneName(lane)}</p>
                        <p className="text-xs text-slate-500">{lane.role || lane.zone}</p>
                      </div>
                      {roomState && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${roomState.tone}`}>
                          {roomState.label}
                        </span>
                      )}
                    </div>

                    <div className="relative col-span-24 grid" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(58px, 1fr))`, ...boardBorder }}>
                      {showLiveTimeMarker && (
                        <div
                          className="pointer-events-none absolute inset-y-0 z-10 w-[2px] bg-amber-500/80 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
                          style={{ left: `${currentHourPercent}%` }}
                        />
                      )}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          style={boardBorder}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleTaskDrop(event, lane.id, selectedDate, hour)}
                        />
                      ))}
                      {visibleBoardTasks
                        .filter((task) => laneMatches(task) === lane.id)
                        .filter((task) => {
                          const startDate = formatDateISO(new Date(task.start));
                          const endDate = formatDateISO(new Date(task.end));
                          return startDate === selectedDate || endDate === selectedDate || (selectedDate >= startDate && selectedDate <= endDate);
                        })
                        .map((task) => {
                          const window = addTaskWindow(task);
                          const startsAt = Math.max(window.startHour, 0);
                          const endsAt = Math.min(window.endHour, 24);
                          const left = (startsAt / 24) * 100;
                          const width = Math.max(((endsAt - startsAt) / 24) * 100, 8);

                          return (
                            <button
                              key={task.id}
                              draggable
                              onDragStart={(event) => handleTaskDragStart(event, task)}
                              onClick={() => setSelectedTask(task)}
                              style={{ left: `${left}%`, width: `${width}%`, lineHeight: '1.15' }}
                              className={`absolute top-2 h-[78px] overflow-hidden rounded-xl border px-2.5 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md whitespace-normal break-words leading-tight ${task.status === "completed" ? styles.completed : styles[task.type] || styles.booking} ${taskConflictMap.has(task.id) ? "ring-2 ring-rose-300" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-[11px] font-bold leading-tight break-words">{task.title}</p>
                                {renderTaskStatusIndicator(task)}
                              </div>
                              <p className="mt-1 text-[10px] opacity-80 leading-tight break-words">{task.person}</p>
                              <p className="mt-0.5 text-[10px] opacity-70 leading-tight break-words">{toTimeLabel(Math.floor(startsAt))}–{toTimeLabel(Math.ceil(endsAt))}</p>
                              {task.status === "completed" && (() => {
                                const completion = getCompletionMeta(task);
                                return completion ? (
                                  <p className="mt-1 text-[9px] opacity-80 leading-tight break-words">{completion.when} · {completion.by}</p>
                                ) : null;
                              })()}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="min-w-[1200px]">
                <div className="grid bg-slate-50" style={{ gridTemplateColumns: `240px repeat(${rangeDates.length}, minmax(90px, 1fr))`, ...boardBorder }}>
                <div className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={boardBorder}>{laneMode === "resource" ? "Resource / location" : "People"}</div>
                  {rangeDates.map((date) => {
                    const currentDay = isTodayDate(date);
                    return (
                      <div
                        key={formatDateISO(date)}
                        className={`relative p-3 text-center text-[11px] font-semibold ${currentDay ? "bg-amber-50 text-amber-800" : "text-slate-500"}`}
                        style={{
                          ...boardBorder,
                          boxShadow: currentDay ? "inset 0 0 0 1px rgba(251, 191, 36, 0.65)" : "none",
                        }}
                      >
                        {currentDay && <span className="absolute inset-y-0 left-0 w-[2px] bg-amber-500" />}
                        {toDateLabel(date, "short")}
                      </div>
                    );
                  })}
                </div>

                {boardLanes.map((lane) => {
                  const roomState = laneMode === "resource" ? getResourceState(lane) : null;
                  return (
                  <div key={lane.id} className="grid" style={{ gridTemplateColumns: `240px repeat(${rangeDates.length}, minmax(90px, 1fr))`, ...boardBorder }}>
                  <div className="flex items-center justify-between gap-3 bg-white p-4" style={boardBorder}>
                      <div>
                        <p className="font-semibold">{getLaneName(lane)}</p>
                        <p className="text-xs text-slate-500">{lane.role || lane.zone}</p>
                      </div>
                      {roomState && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${roomState.tone}`}>
                          {roomState.label}
                        </span>
                      )}
                    </div>

                    {rangeDates.map((date) => {
                      const key = formatDateISO(date);
                      const matches = visibleBoardTasks.filter((task) => {
                        if (laneMatches(task) !== lane.id) return false;
                        const startDate = formatDateISO(new Date(task.start));
                        const endDate = formatDateISO(new Date(task.end));
                        return key >= startDate && key <= endDate;
                      });
                      const isCurrentDay = key === todayKey;

                      return (
                        <div
                          key={`${lane.id}-${key}`}
                          className="relative min-h-[120px] bg-slate-50 p-2"
                          style={{
                            ...boardBorder,
                            backgroundColor: isCurrentDay ? "#fff7ed" : "#f8fafc",
                            boxShadow: isCurrentDay ? "inset 0 0 0 1px rgba(251, 191, 36, 0.6)" : "none",
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleTaskDrop(event, lane.id, key, 9)}
                        >
                          {isCurrentDay && <span className="absolute inset-y-0 left-0 w-[2px] bg-amber-500" />}
                          <div className="flex min-h-[110px] flex-col gap-1.5">
                            {matches.filter((task) => workTypeFilter === "all" || task.type === workTypeFilter).map((task) => (
                              <button
                                key={task.id}
                                draggable
                                onDragStart={(event) => handleTaskDragStart(event, task)}
                                onClick={() => setSelectedTask(task)}
                                className={`flex min-h-[32px] w-full items-center rounded-lg border px-2 py-1 text-left text-[10px] font-medium leading-tight whitespace-normal overflow-hidden ${task.status === "completed" ? styles.completed : styles[task.type] || styles.booking} ${taskConflictMap.has(task.id) ? "ring-1 ring-rose-300" : ""}`}
                                style={{
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                  lineHeight: '1.2',
                                  boxSizing: 'border-box',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  textOverflow: 'ellipsis',
                                  wordBreak: 'break-word',
                                }}
                              >
                                <span className="block max-w-full overflow-hidden text-ellipsis break-words">{task.title}</span>
                                {renderTaskStatusIndicator(task)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 border-t bg-slate-50 px-4 py-3">
            {workTypes.map((type) => (
              <div key={type.id} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={`h-3 w-3 rounded border ${getTaskStyleClass(type.id)}`} />
                {type.name}
              </div>
            ))}
          </div>
        </section>
      </main>

      {notice && <div className="fixed bottom-5 right-5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">{notice}</div>}

      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setPendingMove(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Move activity</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">Move "{pendingMove.title}"?</h3>
            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold">From:</span> {pendingMove.from}</p>
              <p><span className="font-semibold">To:</span> {pendingMove.to}</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-700">
                Date
                <input
                  type="date"
                  value={formatDateISO(pendingMove.targetStart)}
                  onChange={(event) => updatePendingMoveTime("date", event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm text-slate-700">
                Start time
                <input
                  type="time"
                  step="300"
                  value={toTimeInputValue(pendingMove.targetStart)}
                  onChange={(event) => updatePendingMoveTime("start", event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="text-sm text-slate-700">
                End time
                <input
                  type="time"
                  step="300"
                  value={toTimeInputValue(pendingMove.targetEnd)}
                  onChange={(event) => updatePendingMoveTime("end", event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5"
                />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setPendingMove(null)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={confirmPendingMove} className="flex-1 rounded-xl bg-[#103c2d] px-4 py-3 font-semibold text-white hover:bg-emerald-900">
                Confirm move
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedTask.status === "completed" ? styles.completed : styles[selectedTask.type] || styles.booking}`}>
                  {selectedTask.status === "completed" ? "Completed" : typeLabels[selectedTask.type] || labels[selectedTask.type] || selectedTask.type}
                </span>
                <h2 className="mt-3 text-xl font-bold">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="flex items-center gap-2"><BedDouble size={16} /><b>Location:</b> {laneMode === "resource" ? `Resource ${selectedTask.resourceId}` : selectedTask.resourceId}</p>
              <p className="flex items-center gap-2"><Users size={16} /><b>Assigned:</b> {selectedTask.person}</p>
              <p className="flex items-center gap-2"><Clock3 size={16} /><b>Time:</b> {new Date(selectedTask.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(selectedTask.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              {(() => {
                const updated = getUpdatedMeta(selectedTask);
                return (
                  <p className="flex items-center gap-2"><Clock3 size={16} /><b>Updated:</b> {updated.when} · {updated.by}</p>
                );
              })()}
              {taskConflictMap.has(selectedTask.id) && (
                <p className="flex items-center gap-2 text-rose-700"><AlertTriangle size={16} /><b>Conflict:</b> This activity overlaps another task for the same resource or person.</p>
              )}
              {selectedTask.status === "completed" && (() => {
                const completion = getCompletionMeta(selectedTask);
                if (!completion) return null;
                return (
                  <>
                    <p className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5" /><span><b>Completed on:</b> {completion.when}</span></p>
                    <p className="flex items-start gap-2"><Users size={16} className="mt-0.5" /><span><b>Completed by:</b> {completion.by}</span></p>
                  </>
                );
              })()}
              <p className="flex items-start gap-2"><Wrench size={16} className="mt-0.5" /><span><b>Notes:</b> {selectedTask.note || "No notes"}</span></p>
              {selectedTask.issueReason && (
                <p className="flex items-start gap-2"><Flag size={16} className="mt-0.5" /><span><b>Issue reason:</b> {selectedTask.issueReason}</span></p>
              )}
              {selectedTask.delayMinutes > 0 && (
                <p className="flex items-start gap-2"><Clock3 size={16} className="mt-0.5" /><span><b>Delay logged:</b> {formatMinutes(selectedTask.delayMinutes)}</span></p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  toggleComplete(selectedTask.id);
                  setSelectedTask(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#103c2d] px-4 py-3 font-semibold text-white hover:bg-emerald-900"
              >
                {selectedTask.status === "completed" ? <Undo2 size={18} /> : <Check size={18} />}
                {selectedTask.status === "completed" ? "Undo completion" : "Mark complete"}
              </button>
              <button
                onClick={() => deleteTask(selectedTask.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-semibold text-rose-700 hover:bg-rose-100"
              >
                <X size={18} /> Delete activity
              </button>
              <button
                onClick={() => {
                  setDraftIssue({ category: "Delay", reason: "", impact: selectedTask.delayMinutes ? formatMinutes(selectedTask.delayMinutes) : "30 minutes", delayMinutes: String(selectedTask.delayMinutes || 30) });
                  setShowIssue(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-semibold text-rose-700 hover:bg-rose-100"
              >
                <AlertTriangle size={18} /> Raise issue / delay reason
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssue && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setShowIssue(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Issue log</p>
                <h2 className="text-xl font-bold">Add delay or activity reason</h2>
              </div>
              <button onClick={() => setShowIssue(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-slate-700">Reason category
                <select value={draftIssue.category} onChange={(e) => setDraftIssue({ ...draftIssue, category: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5">
                  {['Delay', 'Equipment', 'Staffing', 'Guest request', 'Quality', 'Maintenance'].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">Impact on time
                <select value={draftIssue.impact} onChange={(e) => setDraftIssue({ ...draftIssue, impact: e.target.value, delayMinutes: String(parseDelayMinutes(e.target.value)) })} className="mt-1 w-full rounded-lg border p-2.5">
                  {['15 minutes', '30 minutes', '45 minutes', '1 hour', '2+ hours'].map((impact) => (
                    <option key={impact} value={impact}>{impact}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">Reason / activity recorded
                <textarea value={draftIssue.reason} onChange={(e) => setDraftIssue({ ...draftIssue, reason: e.target.value })} rows={4} placeholder="Example: This resource needed a second operational pass because a previous task overran and created downstream delay." className="mt-1 w-full rounded-lg border p-2.5" />
              </label>
            </div>

            <button onClick={raiseIssue} className="mt-5 w-full rounded-xl bg-[#103c2d] px-4 py-3 font-semibold text-white hover:bg-emerald-900">Raise issue for the team</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">New assignment</p>
                <h2 className="text-xl font-bold">Add work to the board</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700">Resource<select value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5">{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label>
              <label className="text-sm text-slate-700">Work type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5">{workTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label className="text-sm sm:col-span-2 text-slate-700">Task<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
              <label className="text-sm sm:col-span-2 text-slate-700">Assigned person<input value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })} placeholder="e.g. Maria" className="mt-1 w-full rounded-lg border p-2.5" /></label>
              <label className="text-sm text-slate-700">Start<input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
              <label className="text-sm text-slate-700">End<input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
              <label className="text-sm sm:col-span-2 text-slate-700">Notes<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border p-2.5" /></label>
            </div>

            <button onClick={addTask} className="mt-5 w-full rounded-xl bg-[#103c2d] px-4 py-3 font-semibold text-white hover:bg-emerald-900">Add to live board</button>
          </div>
        </div>
      )}
       </>
      )}
    </div>
  );
}
