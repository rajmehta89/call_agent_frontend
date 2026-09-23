"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Check,
  Clock3,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Target,
  UserX,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/OmniPage";
import {
  ActionButton,
  api,
  apiWithRetry,
  DataState,
  MetricGrid,
  StatusBadge,
  Toolbar,
} from "@/components/PlatformUI";

type Policy = {
  approval_required: boolean;
  timezone: string;
  approval_start_hour: number;
  approval_end_hour: number;
  send_start_hour: number;
  send_end_hour: number;
  approval_start_time: string;
  approval_end_time: string;
  send_start_time: string;
  send_end_time: string;
  send_days: number[];
  approval_window_open?: boolean;
  send_window_open?: boolean;
};
type Draft = {
  _id: string;
  company_name: string;
  recipient_email: string;
  website?: string;
  company_context?: string;
  campaign_name?: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  sent_at?: string;
  source?: string;
  template_name?: string;
};
type EmailTemplate = {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  built_in?: boolean;
  active?: boolean;
  variables?: string[];
};
type Campaign = {
  status: "running" | "paused" | "stopped";
  max_emails: number;
  interval_minutes: number;
  daily_limit: number;
  rate_used: number;
  rate_remaining: number;
  daily_used: number;
  daily_remaining: number;
  daily_limit_reached?: boolean;
  daily_reset_at?: string;
  can_process: boolean;
  discovery_enabled?: boolean;
  discovery_query?: string;
  discovery_location?: string;
  approval_window_open?: boolean;
  send_window_open?: boolean;
};
type CampaignDefinition = {
  id: string;
  name: string;
  type: string;
  status: string;
  audience?: string;
  description?: string;
  goal?: string;
  scrape_intent?: string;
  context_mode?: "brain" | "campaign";
  campaign_context?: string;
  steps?: string[];
  scrape?: {
    query: string;
    location: string;
    max_results: number;
    create_drafts: boolean;
    template_id?: string;
  };
  last_scrape?: any;
};

const defaultPolicy: Policy = {
  approval_required: true,
  timezone: "Asia/Kolkata",
  approval_start_hour: 9,
  approval_end_hour: 18,
  approval_start_time: "09:00",
  approval_end_time: "18:00",
  send_start_hour: 9,
  send_end_hour: 18,
  send_start_time: "09:00",
  send_end_time: "18:00",
  send_days: [0, 1, 2, 3, 4],
};
const defaultCampaign: Campaign = {
  status: "stopped",
  max_emails: 20,
  interval_minutes: 60,
  daily_limit: 450,
  rate_used: 0,
  rate_remaining: 20,
  daily_used: 0,
  daily_remaining: 450,
  can_process: false,
  discovery_enabled: true,
  discovery_query: "AI automation for home services",
  discovery_location: "United States",
};
const emptyForm = {
  company_name: "",
  recipient_email: "",
  website: "",
  context: "",
  template_id: "",
};
const predefinedTemplateVariables = [
  { name: "company_name", meaning: "The prospect's business name; use it in the subject or greeting." },
  { name: "company_context", meaning: "AI-generated, evidence-based context about this specific business." },
  { name: "website", meaning: "The prospect's public website; use it when relevant to the message." },
  { name: "campaign_goal", meaning: "The selected campaign's goal or audience objective." },
  { name: "shared_context", meaning: "Shared sender/company context supplied for this campaign." },
  { name: "recipient_email", meaning: "The recipient address; usually useful for internal routing, not the email body." },
  { name: "name", meaning: "The contact's first name when it is available." },
];
const emptyTemplate = { name: "", description: "", subject: "", body: "", variables: [] as string[], variable_descriptions: {} as Record<string, string> };
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CampaignsPage() {
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [discovery, setDiscovery] = useState<any>({});
  const [campaign, setCampaign] = useState<Campaign>(defaultCampaign);
  const [campaignDefinitions, setCampaignDefinitions] = useState<
    CampaignDefinition[]
  >([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("usa-ai-automation-outreach");
  const [campaignTypes, setCampaignTypes] = useState<
    Record<string, { label: string; description: string; channel: string }>
  >({});
  const [gmail, setGmail] = useState<any>({});
  const [form, setForm] = useState(emptyForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState("all");
  const [queueTemplate, setQueueTemplate] = useState("all");
  const [queueDate, setQueueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [reviewingTemplate, setReviewingTemplate] = useState(false);
  const [templateReview, setTemplateReview] = useState<{ subject: string; body: string; suggestions: string[] } | null>(null);
  const [customVariable, setCustomVariable] = useState("");
  const [customVariableMeaning, setCustomVariableMeaning] = useState("");
  const [generatingContext, setGeneratingContext] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryForm, setDiscoveryForm] = useState({
    query: "AI automation for home services",
    location: "United States",
    max_results: 20,
  });
  const [error, setError] = useState("");
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    type: "email_outreach",
    audience: "",
    description: "",
    goal: "",
    scrape_intent: "",
    context_mode: "brain" as "brain" | "campaign",
    campaign_context: "",
  });
  const [scrapeForms, setScrapeForms] = useState<
    Record<
      string,
      {
        query: string;
        location: string;
        max_results: number;
        create_drafts: boolean;
        template_id: string;
      }
    >
  >({});
  const [scrapingId, setScrapingId] = useState("");
  const [editingCampaignId, setEditingCampaignId] = useState("");
  const [savingCampaignId, setSavingCampaignId] = useState("");
  const [campaignEdit, setCampaignEdit] = useState<any>({});
  const [openLocationPicker, setOpenLocationPicker] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<{ value: string; label: string }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCampaignLocations = async (query: string) => {
    setLocationSearch(query);
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
    if (query.trim().length < 2) {
      setLocationSuggestions([]);
      setLocationSearching(false);
      return;
    }
    setLocationSearching(true);
    locationSearchTimer.current = setTimeout(async () => {
      try {
        const result = await apiWithRetry<any>(`/api/platform/campaign-locations?query=${encodeURIComponent(query.trim())}`);
        setLocationSuggestions(result.data || []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 350);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        policyResult,
        draftsResult,
        gmailResult,
        templatesResult,
        campaignResult,
        discoveryResult,
        registryResult,
      ] = await Promise.all([
        apiWithRetry<any>("/api/platform/email-policy"),
        apiWithRetry<any>("/api/platform/email-outbox"),
        apiWithRetry<any>("/api/platform/gmail/status"),
        apiWithRetry<any>("/api/platform/email-templates"),
        apiWithRetry<any>("/api/platform/email-campaign"),
        apiWithRetry<any>("/api/platform/prospects/discovery-status"),
        apiWithRetry<any>("/api/platform/campaigns"),
      ]);
      setPolicy(policyResult.data || defaultPolicy);
      setDrafts(draftsResult.data || []);
      setGmail(gmailResult.data || {});
      setTemplates(templatesResult.data || []);
      setCampaign(campaignResult.data || defaultCampaign);
      setDiscovery(discoveryResult.data || {});
      setCampaignDefinitions(registryResult.data?.campaigns || []);
      setCampaignTypes(registryResult.data?.types || {});
      setScrapeForms(
        Object.fromEntries(
          (registryResult.data?.campaigns || []).map(
            (item: CampaignDefinition) => [
              item.id,
              item.scrape || {
                query: "",
                location: "United States",
                max_results: 20,
                create_drafts: true,
              },
            ],
          ),
        ),
      );
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Unable to load campaign workspace",
      );
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim()) return toast.error("Add a campaign name");
    try {
      const result = await api("/api/platform/campaigns", {
        method: "POST",
        body: JSON.stringify({
          value: {
            ...newCampaign,
            steps:
              newCampaign.type === "email_outreach"
                ? ["Find prospects", "Personalise message", "Review and send"]
                : [
                    "Choose audience",
                    "Configure channel",
                    "Launch and measure",
                  ],
          },
        }),
      });
      setCampaignDefinitions((current) => [...current, result.data]);
      setNewCampaign({
        name: "",
        type: "email_outreach",
        audience: "",
        description: "",
        goal: "",
        scrape_intent: "",
        context_mode: "brain",
        campaign_context: "",
      });
      setShowCampaignForm(false);
      toast.success("Campaign added");
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to create campaign",
      );
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!window.confirm("Remove this campaign definition?")) return;
    try {
      await api(`/api/platform/campaigns/${campaignId}`, { method: "DELETE" });
      setCampaignDefinitions((current) =>
        current.filter((item) => item.id !== campaignId),
      );
      toast.success("Campaign removed");
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to remove campaign",
      );
    }
  };

  const startCampaignEdit = (item: CampaignDefinition) => {
    setEditingCampaignId(item.id);
    setCampaignEdit({ name: item.name, audience: item.audience || "", description: item.description || "", goal: item.goal || "", scrape_intent: item.scrape_intent || "", context_mode: item.context_mode || "brain", campaign_context: item.campaign_context || "" });
    setScrapeForms((current) => ({ ...current, [item.id]: current[item.id] || { query: item.scrape?.query || "", location: item.scrape?.location || "United States", max_results: item.scrape?.max_results || 20, create_drafts: item.scrape?.create_drafts ?? true, template_id: item.scrape?.template_id || "" } }));
  };

  const saveCampaignDefinition = async (item: CampaignDefinition) => {
    setSavingCampaignId(item.id);
    try {
      const scrape = scrapeForms[item.id] || { query: item.scrape?.query || "", location: item.scrape?.location || "United States", max_results: item.scrape?.max_results || 20, create_drafts: item.scrape?.create_drafts ?? true, template_id: item.scrape?.template_id || "" };
      const result = await api<any>(`/api/platform/campaigns/${item.id}`, { method: "PUT", body: JSON.stringify({ value: { ...campaignEdit, scrape } }) });
      setCampaignDefinitions((current) => current.map((campaign) => campaign.id === item.id ? result.data : campaign));
      setEditingCampaignId("");
      toast.success("Campaign settings saved");
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : "Unable to save campaign settings");
    } finally {
      setSavingCampaignId("");
    }
  };

  const saveScrapeSettings = async (item: CampaignDefinition) => {
    setSavingCampaignId(item.id);
    try {
      const scrape = scrapeForms[item.id] || { query: item.scrape?.query || "", location: item.scrape?.location || "United States", max_results: item.scrape?.max_results || 20, create_drafts: item.scrape?.create_drafts ?? true, template_id: item.scrape?.template_id || "" };
      const result = await api<any>(`/api/platform/campaigns/${item.id}`, { method: "PUT", body: JSON.stringify({ value: { ...item, scrape } }) });
      setCampaignDefinitions((current) => current.map((campaign) => campaign.id === item.id ? result.data : campaign));
      toast.success("Scraping settings saved");
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : "Unable to save scraping settings");
    } finally {
      setSavingCampaignId("");
    }
  };

  const scrapeCampaign = async (item: CampaignDefinition) => {
    const form = scrapeForms[item.id] || {
      query: item.scrape?.query || "",
      location: item.scrape?.location || "United States",
      max_results: item.scrape?.max_results || 20,
      create_drafts: item.scrape?.create_drafts ?? true,
      template_id: item.scrape?.template_id || "",
    };
    if (!form.query.trim())
      return toast.error("Add a search query before scraping");
    setScrapingId(item.id);
    try {
      const result = await apiWithRetry<any>(
        `/api/platform/campaigns/${item.id}/scrape`,
        { method: "POST", body: JSON.stringify({ value: form }) },
      );
      const data = result.data || {};
      setCampaignDefinitions((current) =>
        current.map((campaign) =>
          campaign.id === item.id ? data.campaign : campaign,
        ),
      );
      toast.success(
        `Scraping complete: ${data.result?.found || 0} businesses found, ${data.result?.drafts_created || 0} drafts created`,
      );
    } catch (exception) {
      toast.error(
        exception instanceof Error ? exception.message : "Scraping failed",
      );
    } finally {
      setScrapingId("");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedDraftId) {
      window.setTimeout(() => {
        document
          .getElementById("outreach-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 0);
    }
  }, [selectedDraftId]);

  const savePolicy = async (next: Policy) => {
    try {
      const result = await api<any>("/api/platform/email-policy", {
        method: "PUT",
        body: JSON.stringify({ value: next }),
      });
      setPolicy(result.data);
      toast.success(
        next.approval_required
          ? "Approval is required before sending"
          : "Approval disabled; send window still applies",
      );
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to save email policy",
      );
    }
  };

  const createDraft = async () => {
    if (!form.company_name.trim() || !form.recipient_email.trim())
      return toast.error("Add the company and recipient email");
    setSaving(true);
    try {
      await api("/api/platform/email-outbox", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          campaign_name: "USA AI automation outreach",
        }),
      });
      setForm(emptyForm);
      setShowCreate(false);
      toast.success("Personalized draft added to approval queue");
      await load();
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to create draft",
      );
    } finally {
      setSaving(false);
    }
  };

  const generateContext = async () => {
    if (!form.company_name.trim())
      return toast.error("Add the company name first");
    setGeneratingContext(true);
    try {
      const result = await apiWithRetry<any>(
        "/api/platform/email-outbox/context-preview",
        {
          method: "POST",
          body: JSON.stringify({
            value: {
              company_name: form.company_name,
              website: form.website,
              context: form.context,
            },
          }),
        },
      );
      setForm((current) => ({
        ...current,
        context: result.data?.context || current.context,
      }));
      toast.success("AI outreach context added");
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to generate AI context",
      );
    } finally {
      setGeneratingContext(false);
    }
  };

  const createTemplate = async () => {
    if (
      !templateForm.name.trim() ||
      !templateForm.subject.trim() ||
      !templateForm.body.trim()
    )
      return toast.error("Add a template name, subject, and body");
    setSavingTemplate(true);
    try {
      const result = await api<any>("/api/platform/email-templates", {
        method: "POST",
        body: JSON.stringify(templateForm),
      });
      setTemplates((current) => [...current, result.data]);
      setTemplateForm(emptyTemplate);
      setShowTemplateForm(false);
      toast.success("Email template saved");
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to save email template",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const addTemplateVariable = (rawName: string, meaning = "") => {
    const name = rawName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) return;
    setTemplateForm((current) => ({
      ...current,
      variables: Array.from(new Set([...current.variables, name])),
      variable_descriptions: { ...current.variable_descriptions, [name]: meaning || current.variable_descriptions[name] || "User-defined value for this outreach." },
      body: current.body.includes(`{{${name}}}`) ? current.body : `${current.body}${current.body ? "\n" : ""}{{${name}}}`,
    }));
    setCustomVariable("");
    setCustomVariableMeaning("");
  };

  const reviewTemplate = async () => {
    const selectedCampaign = campaignDefinitions.find((item) => item.id === selectedCampaignId);
    if ((!templateForm.subject.trim() || !templateForm.body.trim()) && !selectedCampaign) {
      return toast.error("Select a campaign or add a subject and body before asking AI to review it");
    }
    setReviewingTemplate(true);
    try {
      const result = await api<any>("/api/platform/email-templates/review", {
        method: "POST",
        body: JSON.stringify({
          value: {
            ...templateForm,
            name: templateForm.name || `${selectedCampaign?.name || "Campaign"} outreach template`,
            campaign_goal: selectedCampaign?.description || "",
            campaign_audience: selectedCampaign?.audience || "",
            scrape_intent: selectedCampaign?.scrape_intent || "",
            campaign_context_mode: selectedCampaign?.context_mode || "brain",
          },
        }),
      });
      setTemplateReview(result.data);
      if (!templateForm.name.trim() && selectedCampaign) setTemplateForm((current) => ({ ...current, name: `${selectedCampaign.name} outreach template` }));
      toast.success("AI review is ready");
    } catch (exception) {
      toast.error(exception instanceof Error ? exception.message : "Unable to review template");
    } finally {
      setReviewingTemplate(false);
    }
  };

  const templatePreview = (
    value: string,
    context: { company_name?: string; context?: string; website?: string; name?: string } = {},
  ) =>
    value
      .replace(
        /{{company_name}}/g,
        context.company_name || "{{company_name}}",
      )
      .replace(
        /{{company_context}}/g,
        context.context || "{{company_context}}",
      )
      .replace(/{{website}}/g, context.website || "{{website}}")
      .replace(/{{name}}/g, context.name || "{{name}}");

  const cleanWebsite = (value: string) => {
    if (!value) return "";
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
    } catch {
      return value.split(/[?#]/)[0].replace(/\/$/, "");
    }
  };

  const cleanOutreachText = (value: string) =>
    value.replace(/https?:\/\/[^\s)]+/g, (url) => cleanWebsite(url.replace(/[.,]$/, "")));

  const useTemplate = (template: EmailTemplate) => {
    setForm((current) => ({ ...current, template_id: template.id }));
    setShowCreate(true);
    toast.success(`${template.name} selected for the next draft`);
  };

  const saveCampaign = async (next: Campaign) => {
    try {
      const result = await api<any>("/api/platform/email-campaign", {
        method: "PUT",
        body: JSON.stringify({
          value: {
            max_emails: next.max_emails,
            interval_minutes: next.interval_minutes,
            daily_limit: next.daily_limit,
            discovery_enabled: next.discovery_enabled,
            discovery_query: next.discovery_query,
            discovery_location: next.discovery_location,
          },
        }),
      });
      setCampaign(result.data);
      toast.success("Campaign rate limit saved");
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to save campaign settings",
      );
    }
  };

  const campaignAction = async (
    action: "start" | "pause" | "resume" | "stop",
  ) => {
    try {
      const result = await api<any>("/api/platform/email-campaign/action", {
        method: "POST",
        body: JSON.stringify({ value: { action } }),
      });
      setCampaign(result.data);
      await load();
      toast.success(
        action === "start"
          ? "Campaign started"
          : action === "resume"
            ? "Campaign resumed"
            : action === "pause"
              ? "Campaign paused"
              : "Campaign stopped",
      );
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to update campaign",
      );
    }
  };

  const decide = async (draft: Draft, decision: "approve" | "exclude") => {
    try {
      const result = await api<any>(
        `/api/platform/email-outbox/${draft._id}/decision`,
        { method: "PUT", body: JSON.stringify({ value: { decision } }) },
      );
      if (decision === "approve" && result.data?.status === "error") {
        toast.error(
          "Approved, but Gmail delivery failed. Configure Gmail API on Render before retrying.",
        );
      } else {
        toast.success(
          decision === "approve"
            ? result.data?.status === "sent"
              ? "Email sent"
              : "Approved; waiting for campaign capacity"
            : "Company excluded; it will never be mailed",
        );
      }
      await load();
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to update draft",
      );
    }
  };

  const notifyOwner = async () => {
    setNotifying(true);
    try {
      const result = await api<any>("/api/platform/email-outbox/notify", {
        method: "POST",
        body: JSON.stringify({ value: {} }),
      });
      toast.success(
        result.data?.message ||
          `Review digest sent to ${gmail.address || "your Gmail"}`,
      );
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to send review digest",
      );
    } finally {
      setNotifying(false);
    }
  };

  const discoverProspects = async () => {
    if (!discoveryForm.query.trim())
      return toast.error("Enter the type of USA business to find");
    setDiscovering(true);
    try {
      const result = await apiWithRetry<any>(
        "/api/platform/prospects/discover",
        { method: "POST", body: JSON.stringify(discoveryForm) },
      );
      const summary = result.data || {};
      toast.success(
        `Found ${summary.found || 0} businesses and created ${summary.drafts_created || 0} email drafts`,
      );
      await load();
    } catch (exception) {
      toast.error(
        exception instanceof Error
          ? exception.message
          : "Unable to discover prospects",
      );
    } finally {
      setDiscovering(false);
    }
  };

  const pending = useMemo(
    () => drafts.filter((draft) => draft.status === "pending_approval"),
    [drafts],
  );
  const selectedTemplate =
    templates.find((template) => template.id === form.template_id) ||
    templates.find((template) => template.active !== false) ||
    null;
  const selectedCampaignDefinition = campaignDefinitions.find((item) => item.id === selectedCampaignId) || null;
  const selectedCampaignTemplateId = scrapeForms[selectedCampaignId]?.template_id || selectedCampaignDefinition?.scrape?.template_id || "";
  const libraryTemplate =
    selectedCampaignTemplateId
      ? templates.find((template) => template.id === selectedCampaignTemplateId) || null
      : expandedTemplateId
        ? templates.find((template) => template.id === expandedTemplateId) || null
        : null;
  const selectedDraft =
    drafts.find((draft) => draft._id === selectedDraftId) || null;
  const filteredDrafts = useMemo(
    () =>
      drafts.filter((draft) => {
        const needle = queueSearch.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          [
            draft.company_name,
            draft.recipient_email,
            draft.website,
            draft.subject,
            draft.body,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(needle),
          );
        const matchesStatus =
          queueStatus === "all" || draft.status === queueStatus;
        const matchesTemplate =
          queueTemplate === "all" ||
          (draft.template_name || "Automatic template") === queueTemplate;
        const activityDate = String(draft.sent_at || draft.created_at || "").slice(0, 10);
        const matchesDate = !queueDate || activityDate === queueDate;
        return matchesSearch && matchesStatus && matchesTemplate && matchesDate;
      }),
    [drafts, queueSearch, queueStatus, queueTemplate, queueDate],
  );
  const sent = drafts.filter((draft) => draft.status === "sent").length;
  const excluded = drafts.filter((draft) => draft.status === "excluded").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Campaigns"
        description="Create different outreach and nurture campaigns, then configure each channel as it becomes available."
        actionLabel="AI Tools"
        actionHref="/brain/tools"
      />
      <Toolbar onRefresh={load}>
        <span
          title="New outreach is reviewed before it can be sent to a prospect."
          className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500"
        >
          <ShieldCheck className="h-4 w-4 text-[#16805c]" />
          Review-first outreach
        </span>
      </Toolbar>
      <DataState loading={loading} error={error} onRetry={load}>
        <section className="surface-panel rounded-[24px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Zap className="h-5 w-5 text-[#5a67b1]" />
                Campaign workspace
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Keep multiple campaigns organised by goal. Email outreach is
                connected now; WhatsApp, voice, and nurture campaigns are ready
                to configure next.
              </p>
            </div>
            <ActionButton
              title="Create a separate campaign with its own audience and scraping settings."
              primary
              onClick={() => setShowCampaignForm((current) => !current)}
              icon={<Plus className="h-4 w-4" />}
            >
              {showCampaignForm ? "Close" : "New campaign"}
            </ActionButton>
          </div>
          {showCampaignForm && (
            <div className="mt-5 grid gap-3 rounded-2xl border border-[#d9def7] bg-[#f8f9ff] p-5 md:grid-cols-2">
              <label
                title="A clear name helps you identify this campaign later."
                className="text-xs font-semibold text-slate-600"
              >
                Campaign name
                <input
                  value={newCampaign.name}
                  onChange={(event) =>
                    setNewCampaign({ ...newCampaign, name: event.target.value })
                  }
                  placeholder="e.g. WhatsApp demo follow-up"
                  className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                />
              </label>
              <label
                title="The channel or workflow this campaign will eventually run."
                className="text-xs font-semibold text-slate-600"
              >
                Campaign type
                <select
                  value={newCampaign.type}
                  onChange={(event) =>
                    setNewCampaign({ ...newCampaign, type: event.target.value })
                  }
                  className="campaign-select mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                >
                  {Object.entries(campaignTypes).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                title="Describe who this campaign should target."
                className="text-xs font-semibold text-slate-600"
              >
                Audience
                <input
                  value={newCampaign.audience}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      audience: event.target.value,
                    })
                  }
                  placeholder="e.g. Leads who requested a demo"
                  className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                />
              </label>
              <label
                title="Explain what this campaign is for, how the outreach should approach the audience, and what outcome it should achieve. AI uses this brief to generate the template and guide scraping."
                className="text-xs font-semibold text-slate-600"
              >
                Campaign brief: goal and approach
                <textarea
                  value={newCampaign.description}
                  onChange={(event) =>
                    setNewCampaign({
                      ...newCampaign,
                      description: event.target.value,
                    })
                  }
                  placeholder="What is this campaign for? Who should it reach? What problem or outcome should the outreach focus on?"
                  className="mt-2 min-h-20 w-full rounded-lg border-slate-200 bg-white text-sm"
                />
                <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-400">Write this like an instruction for the campaign AI. Example: Reach US home-service businesses that miss calls or enquiries and introduce a practical Voice AI appointment-booking workflow.</span>
              </label>
              <label title="The outcome this campaign should achieve. AI uses this to shape the message and call to action." className="text-xs font-semibold text-slate-600">
                Outreach goal
                <textarea value={newCampaign.goal} onChange={(event) => setNewCampaign({ ...newCampaign, goal: event.target.value })} placeholder="What result should this outreach create?" className="mt-2 min-h-20 w-full rounded-lg border-slate-200 bg-white text-sm" />
              </label>
              <label title="Describe what kind of lead can genuinely benefit from the offer. This guides prospect scraping and filtering." className="text-xs font-semibold text-slate-600">
                Lead-finding intent
                <textarea value={newCampaign.scrape_intent} onChange={(event) => setNewCampaign({ ...newCampaign, scrape_intent: event.target.value })} placeholder="Which businesses should we find because they may benefit? Include signals such as calls, enquiries, estimates, or appointments." className="mt-2 min-h-20 w-full rounded-lg border-slate-200 bg-white text-sm" />
              </label>
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600">Shared context source</div>
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                  Choose whether this campaign should use the existing AI Brain or its own campaign-specific context.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label title="Use the approved company profile, services, website positioning, and knowledge already stored in AI Brain." className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs ${newCampaign.context_mode === "brain" ? "border-[#d97706] bg-[#fff7ed]" : "border-slate-200"}`}>
                    <input type="radio" name="campaign-context-mode" checked={newCampaign.context_mode === "brain"} onChange={() => setNewCampaign({ ...newCampaign, context_mode: "brain" })} />
                    <span><span className="block font-semibold text-slate-800">Use AI Brain context</span><span className="mt-1 block text-[11px] font-normal leading-4 text-slate-500">Recommended for normal outreach.</span></span>
                  </label>
                  <label title="Use context written specifically for this campaign instead of the shared AI Brain context." className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs ${newCampaign.context_mode === "campaign" ? "border-[#d97706] bg-[#fff7ed]" : "border-slate-200"}`}>
                    <input type="radio" name="campaign-context-mode" checked={newCampaign.context_mode === "campaign"} onChange={() => setNewCampaign({ ...newCampaign, context_mode: "campaign" })} />
                    <span><span className="block font-semibold text-slate-800">Use campaign-specific context</span><span className="mt-1 block text-[11px] font-normal leading-4 text-slate-500">Useful for a different offer or positioning.</span></span>
                  </label>
                </div>
                {newCampaign.context_mode === "campaign" && (
                  <textarea value={newCampaign.campaign_context} onChange={(event) => setNewCampaign({ ...newCampaign, campaign_context: event.target.value })} placeholder="Describe the offer, positioning, proof points, and sender details for this campaign." className="mt-3 min-h-24 w-full rounded-lg border-slate-200 bg-white text-sm" />
                )}
              </div>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {campaignTypes[newCampaign.type]?.description ||
                    "Choose a campaign type."}
                </p>
                <ActionButton
                  title="Save this campaign definition."
                  primary
                  onClick={createCampaign}
                >
                  Create campaign
                </ActionButton>
              </div>
            </div>
          )}
        </section>
        <section className="surface-panel mt-6 rounded-[24px] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-bold text-slate-900">
                Campaign scraping
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Enter the search parameters for each campaign, then start a
                scrape. Results and generated drafts are saved under that
                campaign.
              </p>
            </div>
            <span title="Scraping finds businesses and checks their public websites for contact details.">
              <Target className="h-5 w-5 text-[#5a67b1]" />
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {campaignDefinitions.map((item) => {
              const meta = campaignTypes[item.type];
              const Icon =
                item.type === "whatsapp_followup"
                  ? MessageCircle
                  : item.type === "voice_outreach"
                    ? Phone
                    : item.type === "lead_nurture"
                      ? Zap
                      : Mail;
              const scrape = scrapeForms[item.id] || {
                query: item.scrape?.query || "",
                location: item.scrape?.location || "United States",
                max_results: item.scrape?.max_results || 20,
                create_drafts: item.scrape?.create_drafts ?? true,
                template_id: item.scrape?.template_id || "",
              };
              const selectedLocations = (scrape.location || "United States").split(/[\n,;]+/).map((location) => location.trim()).filter(Boolean);
              const updateScrape = (next: Partial<typeof scrape>) =>
                setScrapeForms((current) => ({
                  ...current,
                  [item.id]: { ...scrape, ...next },
                }));
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 transition ${selectedCampaignId === item.id ? "border-[#d97706] ring-2 ring-[#fed7aa]" : "border-slate-200"}`}
                >
                  <div role="button" tabIndex={0} onClick={() => setSelectedCampaignId(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedCampaignId(item.id); }} className="flex w-full items-start justify-between gap-3 text-left" aria-pressed={selectedCampaignId === item.id}>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4ff] text-[#5a67b1]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {item.name}
                        </div>
                        <div
                          title={meta?.description}
                          className="mt-1 text-[10px] uppercase tracking-wider text-slate-400"
                        >
                          {meta?.label || item.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button title="Edit this campaign definition and its scraping settings." type="button" onClick={() => editingCampaignId === item.id ? setEditingCampaignId("") : startCampaignEdit(item)} className="text-xs font-semibold text-[#5a67b1] hover:text-[#394784]">{editingCampaignId === item.id ? "Close edit" : "Edit"}</button>
                      {item.id !== "usa-ai-automation-outreach" && <button title="Remove this campaign definition." type="button" onClick={() => deleteCampaign(item.id)} className="text-xs text-slate-400 hover:text-rose-600">Remove</button>}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                    <div><span className="font-bold text-slate-500">Campaign description:</span> <span className="leading-5 text-slate-600">{item.description || meta?.description}</span></div>
                    <div><span className="font-bold text-slate-500">Outreach goal:</span> <span className="leading-5 text-slate-600">{item.goal || item.description || "Not set"}</span></div>
                    <div><span className="font-bold text-slate-500">Lead-finding intent:</span> <span className="leading-5 text-slate-600">{item.scrape_intent || item.audience || "Not set"}</span></div>
                    <div><span className="font-bold text-slate-500">Context source:</span> <span className="text-slate-600">{item.context_mode === "campaign" ? "Campaign-specific context" : "AI Brain context"}</span></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span title="The audience saved for this campaign.">
                      {item.audience || "Audience not set"}
                    </span>
                    <StatusBadge
                      value={
                        item.type === "email_outreach" ? "Ready" : "Planned"
                      }
                    />
                    {selectedCampaignId === item.id && <span className="rounded-full bg-[#fff7ed] px-2 py-1 text-[10px] font-bold text-[#b45309]">Selected campaign</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5" title="These locations will be searched separately for this campaign.">
                    {(scrape.location || item.scrape?.location || "United States").split(/[\n,;]+/).map((location) => location.trim()).filter(Boolean).map((location) => <span key={location} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{location}</span>)}
                  </div>
                  {editingCampaignId === item.id && <div className="mt-3 grid gap-3 rounded-xl border border-[#cfd6f4] bg-[#f8f9ff] p-4 md:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">Campaign name<input value={campaignEdit.name || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, name: event.target.value })} className="mt-1 h-9 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                    <label className="text-xs font-semibold text-slate-600">Audience<input value={campaignEdit.audience || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, audience: event.target.value })} className="mt-1 h-9 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">Campaign description<textarea value={campaignEdit.description || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, description: event.target.value })} className="mt-1 min-h-16 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                    <label className="text-xs font-semibold text-slate-600">Outreach goal<textarea value={campaignEdit.goal || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, goal: event.target.value })} className="mt-1 min-h-16 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                    <label className="text-xs font-semibold text-slate-600">Lead-finding intent<textarea value={campaignEdit.scrape_intent || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, scrape_intent: event.target.value })} className="mt-1 min-h-16 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                    <label className="text-xs font-semibold text-slate-600">Context source<select value={campaignEdit.context_mode || "brain"} onChange={(event) => setCampaignEdit({ ...campaignEdit, context_mode: event.target.value })} className="campaign-select mt-1 h-9 w-full rounded-lg border-slate-200 bg-white text-xs"><option value="brain">AI Brain context</option><option value="campaign">Campaign-specific context</option></select></label>
                    {campaignEdit.context_mode === "campaign" && <label className="text-xs font-semibold text-slate-600">Campaign-specific context<textarea value={campaignEdit.campaign_context || ""} onChange={(event) => setCampaignEdit({ ...campaignEdit, campaign_context: event.target.value })} className="mt-1 min-h-16 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>}
                    <div className="flex items-end justify-end md:col-span-2"><ActionButton primary disabled={savingCampaignId === item.id} onClick={() => saveCampaignDefinition(item)} icon={<Save className="h-3.5 w-3.5" />}>{savingCampaignId === item.id ? "Saving..." : "Save campaign settings"}</ActionButton></div>
                  </div>}
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div
                      title="These values control what the prospect finder searches for."
                      className="text-xs font-bold text-slate-700"
                    >
                      Scraping parameters
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      Tell the system what to find, then start scraping.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.25fr)_110px_minmax(0,1.25fr)]">
                      <label className="flex min-w-0 flex-col text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Business search
                      <input
                        title="Business category or search phrase sent to Google Places."
                        value={scrape.query}
                        onChange={(event) =>
                          updateScrape({ query: event.target.value })
                        }
                        placeholder="Business type or search"
                        className="mt-1 h-9 w-full rounded-lg border-slate-200 text-xs"
                      />
                      </label>
                      <div className="relative">
                        <label className="block text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Locations</label>
                        <button type="button" aria-expanded={openLocationPicker === item.id} title="Search and select one or more locations. Each selected location is searched separately." onClick={() => setOpenLocationPicker(openLocationPicker === item.id ? "" : item.id)} className="mt-1 flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#cfd6f4] bg-white px-3 py-2 text-left text-xs font-semibold text-[#4f5da6] shadow-sm hover:border-[#9da9e6]">
                          <span className="truncate">{selectedLocations.length ? `${selectedLocations.length} location${selectedLocations.length === 1 ? "" : "s"} selected — click to change` : "Search and select locations"}</span><span className="text-slate-400">▾</span>
                        </button>
                        {openLocationPicker === item.id && <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          <input autoFocus value={locationSearch} onChange={(event) => searchCampaignLocations(event.target.value)} placeholder="Search city, region, state, or country" className="h-9 w-full rounded-lg border-slate-200 text-xs" />
                          <div className="mt-2 space-y-1">
                            {locationSearching && <div className="px-2 py-2 text-[11px] text-slate-400">Searching Google Places...</div>}
                            {!locationSearching && locationSearch.trim().length >= 2 && !locationSuggestions.length && <div className="px-2 py-2 text-[11px] text-slate-400">No location suggestions found.</div>}
                            {locationSuggestions.map((suggestion) => <label key={suggestion.value} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={selectedLocations.includes(suggestion.value)} onChange={(event) => { updateScrape({ location: event.target.checked ? [...selectedLocations, suggestion.value].join("\n") : selectedLocations.filter((item) => item !== suggestion.value).join("\n") }); }} /><span className="leading-4">{suggestion.label}</span></label>)}
                          </div>
                          <div className="border-t border-slate-100 px-2 pt-2 text-[10px] leading-4 text-slate-400">Search and select multiple locations. Google Places will run a separate campaign search for each selected location.</div>
                        </div>}
                      </div>
                      <label className="flex min-w-0 flex-col text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Results per location
                      <input
                        title="Maximum number of businesses to request, from 1 to 20."
                        type="number"
                        min="1"
                        max="20"
                        value={scrape.max_results}
                        onChange={(event) =>
                          updateScrape({
                        max_results: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-9 w-full rounded-lg border-slate-200 text-xs"
                      />
                      </label>
                      <label className="flex min-w-0 flex-col text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Email template
                      <select
                        title="Template used to create drafts for this campaign."
                        value={scrape.template_id || ""}
                        onChange={(event) => updateScrape({ template_id: event.target.value })}
                        className="campaign-select mt-1 h-9 rounded-lg border-slate-200 text-xs"
                      >
                        <option value="">Automatic template</option>
                        {templates.filter((template) => template.active !== false).map((template) => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                      </label>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-slate-400">Click Locations to search Google Places, then select one or more results. Each selected location is searched separately. Automatic template lets the system choose the best active template from the campaign goal and business type.</p>
                    <label
                      title="When enabled, businesses with a public email are turned into personalised drafts for review."
                      className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"
                    >
                      <input
                        type="checkbox"
                        checked={scrape.create_drafts}
                        onChange={(event) =>
                          updateScrape({ create_drafts: event.target.checked })
                        }
                      />
                      Create personalised drafts from businesses with emails
                    </label>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                      <ActionButton
                        title="Save the search, locations, result limit, draft setting, and selected email template without starting a scrape."
                        onClick={() => saveScrapeSettings(item)}
                        disabled={savingCampaignId === item.id}
                        icon={<Save className="h-3.5 w-3.5" />}
                      >
                        {savingCampaignId === item.id ? "Saving..." : "Save scraping settings"}
                      </ActionButton>
                      <ActionButton
                        title="Run the scrape with these parameters and save the results to this campaign."
                        primary
                        onClick={() => scrapeCampaign(item)}
                        disabled={scrapingId === item.id}
                        icon={<Target className="h-3.5 w-3.5" />}
                      >
                        {scrapingId === item.id
                          ? "Scraping..."
                          : "Start scraping"}
                      </ActionButton>
                      </div>
                      {item.last_scrape && (
                        <span
                          title="Summary from the latest completed scrape."
                          className="text-right text-[10px] text-slate-400"
                        >
                          Last run: {item.last_scrape.found || 0} found ·{" "}
                          {item.last_scrape.drafts_created || 0} drafts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <MetricGrid
          items={[
            {
              label: "Awaiting approval",
              value: pending.length,
              detail: "Can be approved or excluded",
            },
            { label: "Sent", value: sent, detail: "Delivered through Gmail" },
            { label: "Excluded", value: excluded, detail: "Never sent" },
            {
              label: "Gmail",
              value: gmail.connected ? "Connected" : "Setup needed",
              detail: gmail.address || "No sender configured",
            },
          ]}
        />
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <section className="surface-panel min-w-0 overflow-hidden rounded-[24px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Mail className="h-5 w-5 text-[#d97706]" />
                  Prospect email queue
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Exclude any company you do not want to contact. Excluded
                  drafts are permanently blocked from sending.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  title="Send yourself a review digest; this never contacts prospects."
                  onClick={notifyOwner}
                  disabled={notifying || !pending.length || !gmail.connected}
                  icon={<Send className="h-4 w-4" />}
                >
                  {notifying ? "Sending review..." : "Email me review"}
                </ActionButton>
                <ActionButton
                  title="Search Google Places, inspect public websites, and create drafts when possible."
                  primary
                  onClick={() => setShowCreate((current) => !current)}
                  icon={<Plus className="h-4 w-4" />}
                >
                  {showCreate ? "Close" : "Add prospect"}
                </ActionButton>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[#d9def7] bg-[#f8f9ff] px-4 py-3 text-xs leading-5 text-slate-600">
              <span className="font-semibold text-slate-800">Review flow:</span>{" "}
              new approval batches are automatically emailed to{" "}
              {gmail.address || "your Gmail"}; approve or exclude them here. The
              review email never contacts prospects.
            </div>
            <div className="mt-5 rounded-2xl border border-[#d9def7] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Find USA prospects automatically
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Google Places finds businesses, then their public website is
                    checked for a contact email. Ready businesses become
                    personalized drafts automatically.
                  </p>
                </div>
                <StatusBadge
                  value={
                    discovery.configured
                      ? "Discovery ready"
                      : discovery.environment === "production"
                        ? "Production setup needed"
                        : "Local setup needed"
                  }
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1fr_100px_auto]">
                <input
                  value={discoveryForm.query}
                  onChange={(event) =>
                    setDiscoveryForm({
                      ...discoveryForm,
                      query: event.target.value,
                    })
                  }
                  placeholder="Business type or search query"
                  className="h-10 rounded-lg border-slate-200 text-sm"
                />
                <input
                  value={discoveryForm.location}
                  onChange={(event) =>
                    setDiscoveryForm({
                      ...discoveryForm,
                      location: event.target.value,
                    })
                  }
                  placeholder="USA location"
                  className="h-10 rounded-lg border-slate-200 text-sm"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={discoveryForm.max_results}
                  onChange={(event) =>
                    setDiscoveryForm({
                      ...discoveryForm,
                      max_results: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-lg border-slate-200 text-sm"
                />
                <ActionButton
                  primary
                  onClick={discoverProspects}
                  disabled={discovering || !discovery.configured}
                  icon={<Target className="h-4 w-4" />}
                >
                  {discovering ? "Finding..." : "Find prospects"}
                </ActionButton>
              </div>
              {!discovery.configured && (
                <div className="mt-3 text-xs text-amber-700">
                  Google Places is not configured in this local backend. The
                  production Render service can use its own
                  GOOGLE_PLACES_API_KEY; this does not need to be added to the
                  local environment unless you want to test scraping locally.
                </div>
              )}
            </div>
            {showCreate && (
              <div className="mt-5 rounded-2xl border border-[#d9def7] bg-[#f8f9ff] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Company name
                    <input
                      value={form.company_name}
                      onChange={(event) =>
                        setForm({ ...form, company_name: event.target.value })
                      }
                      placeholder="Example: Acme Home Services"
                      className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Recipient email
                    <input
                      value={form.recipient_email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          recipient_email: event.target.value,
                        })
                      }
                      placeholder="owner@example.com"
                      className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold text-slate-600">
                  Email template
                  <select
                    value={form.template_id}
                    onChange={(event) =>
                      setForm({ ...form, template_id: event.target.value })
                    }
                    className="campaign-select mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                  >
                    <option value="">Automatic — use best Raj template</option>
                    {templates
                      .filter((template) => template.active !== false)
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                  <span className="mt-1 block font-normal text-slate-400">
                    Leave this automatic to let the campaign choose Raj’s
                    default template and personalize it.
                  </span>
                </label>
                <label className="mt-4 block text-xs font-semibold text-slate-600">
                  Website or source URL
                  <input
                    value={form.website}
                    onChange={(event) =>
                      setForm({ ...form, website: event.target.value })
                    }
                    placeholder="https://example.com"
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                  />
                </label>
                <label className="mt-4 block text-xs font-semibold text-slate-600">
                  <span className="flex items-center justify-between gap-3">
                    <span>Company context</span>
                    <ActionButton
                      title="Ask AI to create a grounded business-specific outreach angle from the company details."
                      tone="success"
                      onClick={generateContext}
                      disabled={generatingContext}
                      icon={<Zap className="h-3.5 w-3.5" />}
                    >
                      {generatingContext
                        ? "Generating..."
                        : "Generate AI context"}
                    </ActionButton>
                  </span>
                  <textarea
                    value={form.context}
                    onChange={(event) =>
                      setForm({ ...form, context: event.target.value })
                    }
                    placeholder="What they do, likely problem, or why Raj can help"
                    className="mt-2 min-h-24 w-full rounded-lg border-slate-200 bg-white text-sm"
                  />
                </label>
                {selectedTemplate && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#cfe1f5] bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#f8fbff] px-4 py-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#5a67b1]">
                          Live email preview
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-900">
                          {selectedTemplate.name}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Personalized for{" "}
                          {form.company_name || "this business"} ·{" "}
                          {form.recipient_email || "recipient email not added"}
                        </div>
                      </div>
                      <Mail className="h-5 w-5 shrink-0 text-[#5a67b1]" />
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          Subject:
                        </span>{" "}
                        {templatePreview(selectedTemplate.subject, form)}
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                          {templatePreview(selectedTemplate.body, form)}
                        </p>
                      </div>
                      <div className="text-[10px] leading-4 text-slate-400">
                        Greeting, company name, context, and website values
                        update as you edit the fields above. Review the final
                        draft again before sending.
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-col items-stretch gap-3 rounded-xl border border-[#f6c56f] bg-[#fffaf4] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800">Save this prospect and create the outreach draft</div>
                    <div className="mt-1 text-[11px] leading-4 text-slate-500">Your company, recipient, website, context, and selected template are saved when you click this button. The live preview above is not sent yet.</div>
                  </div>
                  <ActionButton primary onClick={createDraft} disabled={saving}>
                    {saving ? "Saving prospect..." : "Save prospect & create draft"}
                  </ActionButton>
                </div>
              </div>
            )}
            <div className="mt-5 overflow-visible rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                  Outreach list
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Select an outreach to review its complete subject, greeting,
                  message, recipient, and available actions.
                </div>
              </div>
              <div className="border-b border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
                    Filter outreach
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">
                      {filteredDrafts.length} of {drafts.length} shown
                    </span>
                    <button
                      type="button"
                      title="Reset search, status, and template filters."
                      onClick={() => {
                        setQueueSearch("");
                        setQueueStatus("all");
                        setQueueTemplate("all");
                        setQueueDate("");
                      }}
                      className="text-xs font-semibold text-[#b45309] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(180px,1fr)_minmax(220px,1.1fr)_minmax(160px,.7fr)]">
                  <label className="min-w-0 text-[11px] font-semibold text-slate-600">
                    Search business, email, subject, or message
                    <input
                      title="Search by business, email, website, subject, or message."
                      value={queueSearch}
                      onChange={(event) => setQueueSearch(event.target.value)}
                      placeholder="Search outreach..."
                      className="mt-1 h-11 min-w-0 text-sm"
                    />
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold text-slate-600">
                    Status
                    <select
                      title="Filter outreach by delivery or review status."
                      value={queueStatus}
                      onChange={(event) => setQueueStatus(event.target.value)}
                      className="campaign-select mt-1 h-11 min-w-0 text-sm"
                    >
                      <option value="all">All statuses</option>
                      <option value="pending_approval">Needs approval</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="sent">Sent</option>
                      <option value="excluded">Excluded</option>
                      <option value="error">Error</option>
                    </select>
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold text-slate-600">
                    Email template
                    <select
                      title="Filter outreach by email template."
                      value={queueTemplate}
                      onChange={(event) => setQueueTemplate(event.target.value)}
                      className="campaign-select mt-1 h-11 min-w-0 text-sm"
                    >
                      <option value="all">All templates</option>
                      {Array.from(
                        new Set(
                          drafts.map(
                            (draft) =>
                              draft.template_name || "Automatic template",
                          ),
                        ),
                      ).map((template) => (
                        <option key={template} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0 text-[11px] font-semibold text-slate-600">
                    Activity date
                    <input type="date" title="Show outreach created or sent on this date." value={queueDate} onChange={(event) => setQueueDate(event.target.value)} className="mt-1 h-11 w-full min-w-0 rounded-lg border-slate-200 text-sm" />
                  </label>
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 p-4">
                <div className="min-w-0">
              {filteredDrafts.length ? (
                <div className="overflow-x-auto overflow-y-visible rounded-xl border border-slate-200">
                  <table className="w-full min-w-[780px] table-fixed text-left text-xs">
                    <thead className="border-b border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="w-[22%] px-4 py-3">Business</th>
                        <th className="w-[25%] px-3 py-3">Recipient</th>
                        <th className="w-[20%] px-3 py-3">Template</th>
                        <th className="w-[15%] px-3 py-3">Status</th>
                        <th className="w-[10%] px-3 py-3">Created</th>
                        <th className="w-[8%] px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrafts.map((draft) => (
                        <tr
                          key={draft._id}
                          className={`transition hover:bg-[#fffaf4] ${selectedDraftId === draft._id ? "bg-[#fffaf4]" : ""}`}
                        >
                          <td className="max-w-0 overflow-hidden px-4 py-3">
                            <button
                              type="button"
                              title="Open the complete outreach detail."
                              onClick={() => setSelectedDraftId(draft._id)}
                              className="block max-w-full truncate text-left font-semibold text-slate-800 hover:text-[#b45309]"
                            >
                              {draft.company_name}
                            </button>
                          </td>
                          <td className="max-w-0 overflow-hidden px-3 py-3">
                            <span
                              title={draft.recipient_email}
                              className="block truncate text-slate-500"
                            >
                              {draft.recipient_email}
                            </span>
                          </td>
                          <td className="max-w-0 overflow-hidden px-3 py-3">
                            <span
                              title={
                                draft.template_name || "Automatic template"
                              }
                              className="block truncate text-slate-500"
                            >
                              {draft.template_name || "Automatic template"}
                            </span>
                          </td>
                          <td className="overflow-visible whitespace-nowrap px-3 py-3">
                            <StatusBadge
                              value={
                                draft.status === "pending_approval"
                                  ? "Needs approval"
                                  : draft.status
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                            {draft.created_at
                              ? new Date(draft.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDraftId(draft._id)}
                              className="font-semibold text-[#b45309] hover:underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                  No outreach matches these filters. Clear the filters or add a
                  prospect.
                </div>
              )}
                </div>
            {selectedDraft && (
              <div
                id="outreach-detail"
                className="scroll-mt-6 rounded-2xl border-2 border-[#f6c56f] bg-[#fffaf4] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b45309]">
                      Outreach details
                    </div>
                    <div className="mt-1 text-base font-bold text-slate-900">
                      {selectedDraft.company_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedDraft.recipient_email}
                      {selectedDraft.website
                        ? ` · ${cleanWebsite(selectedDraft.website)}`
                        : ""}{" "}
                      · {selectedDraft.template_name || "Automatic template"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      value={
                        selectedDraft.status === "pending_approval"
                          ? "Needs approval"
                          : selectedDraft.status
                      }
                    />
                    <button
                      type="button"
                      title="Close outreach details."
                      onClick={() => setSelectedDraftId("")}
                      className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Subject</div>
                    <div className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">{selectedDraft.subject || "No subject"}</div>
                  </div>
                  <div className="rounded-xl border border-[#f6c56f] bg-[#fff8e8] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b45309]">AI business context</div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{cleanOutreachText(selectedDraft.company_context || "No business context was saved for this outreach.")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">Greeting and email body</div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{cleanOutreachText(selectedDraft.body || "No email body")}</p>
                  </div>
                </div>
                {selectedDraft.status === "pending_approval" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton
                      tone="success"
                      onClick={() => decide(selectedDraft, "approve")}
                      icon={<Check className="h-3.5 w-3.5" />}
                    >
                      Approve & send
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      onClick={() => decide(selectedDraft, "exclude")}
                      icon={<UserX className="h-3.5 w-3.5" />}
                    >
                      Exclude
                    </ActionButton>
                  </div>
                )}
              </div>
            )}
            {!selectedDraft && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <div className="text-sm font-bold text-slate-700">Outreach details</div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Select View on any outreach to see its subject, AI context, greeting, body, recipient, template, status, and actions here.</p>
              </div>
            )}
              </div>
            </div>
            {false && (
              <div className="mt-5 space-y-3">
                {drafts.length ? (
                  drafts.map((draft) => (
                    <div
                      key={draft._id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {draft.company_name}
                            </div>
                            <StatusBadge
                              value={
                                draft.status === "pending_approval"
                                  ? "Needs approval"
                                  : draft.status
                              }
                            />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {draft.recipient_email}
                            {draft.website ? ` · ${draft.website}` : ""}
                            {draft.template_name
                              ? ` · ${draft.template_name}`
                              : ""}
                          </div>
                        </div>
                        {draft.status === "pending_approval" && (
                          <div className="flex shrink-0 gap-2">
                            <ActionButton
                              tone="success"
                              onClick={() => decide(draft, "approve")}
                              icon={<Check className="h-3.5 w-3.5" />}
                            >
                              Approve & send
                            </ActionButton>
                            <ActionButton
                              tone="danger"
                              onClick={() => decide(draft, "exclude")}
                              icon={<UserX className="h-3.5 w-3.5" />}
                            >
                              Exclude
                            </ActionButton>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-800">
                          {draft.subject}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {draft.body}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                    <Mail className="mx-auto h-7 w-7 text-slate-300" />
                    <div className="mt-3 text-sm font-semibold text-slate-800">
                      No prospect drafts yet
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Add your first USA business prospect or connect a
                      discovery source.
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="surface-panel rounded-[24px] p-6">
            <div className="flex flex-col items-start gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Send className="h-5 w-5 text-[#16805c]" />
                  Campaign controls
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Start, pause, resume, or stop sending. While running, the
                  recurring worker checks the queue every 30 seconds and sends
                  only inside the configured timezone window and limits.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Current status</span>
                <StatusBadge value={campaign.status} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                title="Allow the email worker to process eligible approved drafts."
                primary={campaign.status !== "running"}
                onClick={() =>
                  campaignAction(
                    campaign.status === "paused" ? "resume" : "start",
                  )
                }
                icon={<Send className="h-3.5 w-3.5" />}
              >
                {campaign.status === "paused"
                  ? "Resume campaign"
                  : "Start campaign"}
              </ActionButton>
              {campaign.status === "running" && (
                <ActionButton
                  tone="warning"
                  title="Temporarily pause sending while keeping the campaign settings."
                  onClick={() => campaignAction("pause")}
                >
                  Pause
                </ActionButton>
              )}
              {campaign.status !== "stopped" && (
                <ActionButton
                  tone="danger"
                  title="End this run and return the campaign to stopped."
                  onClick={() => campaignAction("stop")}
                >
                  Stop / end
                </ActionButton>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Hourly window
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {campaign.rate_used} / {campaign.max_emails}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Today (IST)
                </div>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {campaign.daily_used} / {campaign.daily_limit}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" title={`${campaign.daily_used} of ${campaign.daily_limit} daily emails used`}>
                  <div className="h-full rounded-full bg-[#d97706] transition-all" style={{ width: `${Math.min(100, campaign.daily_limit ? (campaign.daily_used / campaign.daily_limit) * 100 : 0)}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-slate-400">{campaign.daily_remaining} remaining today</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label
                title="Maximum number of emails allowed in each rate window."
                className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600"
              >
                Emails per interval
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={campaign.max_emails}
                  onChange={(event) =>
                    setCampaign({
                      ...campaign,
                      max_emails: Number(event.target.value),
                    })
                  }
                  onBlur={() => saveCampaign(campaign)}
                  className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                />
              </label>
              <label
                title="How long the rate window lasts before another batch can be sent."
                className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600"
              >
                Interval in minutes
                <input
                  type="number"
                  min="1"
                  max="10080"
                  value={campaign.interval_minutes}
                  onChange={(event) =>
                    setCampaign({
                      ...campaign,
                      interval_minutes: Number(event.target.value),
                    })
                  }
                  onBlur={() => saveCampaign(campaign)}
                  className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                />
              </label>
              <label
                title="Daily safety cap for campaign emails, leaving room for normal Gmail use."
                className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600"
              >
                Free daily limit
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={campaign.daily_limit}
                  onChange={(event) =>
                    setCampaign({
                      ...campaign,
                      daily_limit: Number(event.target.value),
                    })
                  }
                  onBlur={() => saveCampaign(campaign)}
                  className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
                Automatic prospect refill
              </div>
              <label className="flex min-w-0 items-start gap-3 text-xs font-semibold leading-5 text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={campaign.discovery_enabled !== false}
                  onChange={(event) => {
                    const next = {
                      ...campaign,
                      discovery_enabled: event.target.checked,
                    };
                    setCampaign(next);
                    saveCampaign(next);
                  }}
                />
                <span className="min-w-0 flex-1 break-words">
                  Automatically refill the queue with unique prospects until
                  this interval's target is ready.
                </span>
              </label>
              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3">
                <label
                  title="Search phrase used to find new businesses."
                  className="block min-w-0 text-xs font-semibold text-slate-600"
                >
                  Business search
                  <input
                    value={campaign.discovery_query || ""}
                    onChange={(event) =>
                      setCampaign({
                        ...campaign,
                        discovery_query: event.target.value,
                      })
                    }
                    onBlur={() => saveCampaign(campaign)}
                    placeholder="AI automation for home services"
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                  />
                </label>
                <label
                  title="Area where the prospect search should run."
                  className="block min-w-0 text-xs font-semibold text-slate-600"
                >
                  Location
                  <input
                    value={campaign.discovery_location || ""}
                    onChange={(event) =>
                      setCampaign({
                        ...campaign,
                        discovery_location: event.target.value,
                      })
                    }
                    onBlur={() => saveCampaign(campaign)}
                    placeholder="United States"
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 bg-white text-sm"
                  />
                </label>
              </div>
              <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-5 text-slate-500">
                <span className="font-semibold text-slate-700">
                  Duplicate protection:
                </span>{" "}
                businesses and email addresses are skipped permanently,
                including previously excluded prospects.
              </p>
              <div className="mt-4 flex justify-end">
                <ActionButton primary title="Save campaign rate limits and automatic prospect refill settings." onClick={() => saveCampaign(campaign)} icon={<Save className="h-4 w-4" />}>
                  Save campaign settings
                </ActionButton>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Clock3 className="h-5 w-5 text-[#5a67b1]" />
                Time-zone approval controls
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Set different approval and sending times in the selected time zone. During the
                approval window drafts wait for you; outside it, a running
                campaign can send automatically inside the send window.
              </p>
              <div className="mt-4 rounded-xl border border-[#d9def7] bg-[#f8f9ff] p-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Campaign time zone
                  <select title="All approval and sending windows are evaluated in this time zone." value={policy.timezone} onChange={(event) => savePolicy({ ...policy, timezone: event.target.value })} className="campaign-select mt-2 h-10 w-full min-w-0 max-w-full rounded-lg border-slate-200 bg-white pr-8 text-sm sm:max-w-sm">
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="America/New_York">Eastern (ET)</option>
                    <option value="America/Chicago">Central (CT)</option>
                    <option value="America/Denver">Mountain (MT)</option>
                    <option value="America/Los_Angeles">Pacific (PT)</option>
                    <option value="Europe/London">United Kingdom (GMT/BST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <span className="mt-2 block text-[11px] font-normal leading-4 text-slate-500">All open/closed checks and sending windows use this time zone.</span>
                </label>
              </div>
              <div className="mt-5 flex min-w-0 items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    Require approval during approval window
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {policy.approval_required
                      ? "Emails wait for your approval during the approval window."
                      : "Emails can auto-send during the send window."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    savePolicy({
                      ...policy,
                      approval_required: !policy.approval_required,
                    })
                  }
                  className={`h-7 w-12 shrink-0 rounded-full p-1 transition ${policy.approval_required ? "bg-[#d97706]" : "bg-slate-300"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${policy.approval_required ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current status
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Approval window
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800">
                      {policy.approval_start_time}–{policy.approval_end_time}{" "}
                      {policy.timezone}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {policy.approval_window_open ? "Open now" : "Closed now"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] text-slate-400">
                      Send window
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800">
                      {policy.send_start_time}–{policy.send_end_time} IST
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {policy.send_window_open ? "Open now" : "Closed now"}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold text-[#b45309]">
                      Time zone: {policy.timezone}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Approval starts
                  <input
                    type="time"
                    placeholder="00:00"
                    value={policy.approval_start_time}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        approval_start_time: event.target.value,
                      })
                    }
                    onBlur={() => savePolicy(policy)}
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Approval ends
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="24:00"
                    value={policy.approval_end_time}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        approval_end_time: event.target.value,
                      })
                    }
                    onBlur={() => savePolicy(policy)}
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Send starts
                  <input
                    type="time"
                    placeholder="00:00"
                    value={policy.send_start_time}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        send_start_time: event.target.value,
                      })
                    }
                    onBlur={() => savePolicy(policy)}
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Send ends
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="24:00"
                    value={policy.send_end_time}
                    onChange={(event) =>
                      setPolicy({
                        ...policy,
                        send_end_time: event.target.value,
                      })
                    }
                    onBlur={() => savePolicy(policy)}
                    className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm"
                  />
                </label>
              </div>
              <div className="mt-5 text-xs font-semibold text-slate-600">
                Allowed days
                <div className="mt-2 flex flex-wrap gap-2">
                  {days.map((day, index) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        const next = policy.send_days.includes(index)
                          ? policy.send_days.filter((item) => item !== index)
                          : [...policy.send_days, index].sort();
                        const updated = { ...policy, send_days: next };
                        setPolicy(updated);
                        savePolicy(updated);
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${policy.send_days.includes(index) ? "bg-[#d97706] text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-5 flex justify-end">
                  <ActionButton primary title="Save the timezone, approval window, sending window, and allowed days." onClick={() => savePolicy(policy)} icon={<Save className="h-4 w-4" />}>
                    Save timing settings
                  </ActionButton>
                </div>
                <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-[#d97706]" />
                      Email templates
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose a template for each draft, then review the
                      personalized subject and body before sending.
                    </p>
                  </div>
                  <ActionButton
                    primary={!showTemplateForm}
                    onClick={() => setShowTemplateForm((current) => !current)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    <span className="whitespace-nowrap">{showTemplateForm ? "Close editor" : "New template"}</span>
                  </ActionButton>
                </div>
                {showTemplateForm && (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="rounded-lg border border-[#d9def7] bg-white p-3 text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">Template source campaign</div>
                      <div className="mt-1">{campaignDefinitions.find((item) => item.id === selectedCampaignId)?.name || "Select a campaign above"}</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">Generate from campaign uses its goal and audience, then adds the selected AI Brain or campaign-specific context.</div>
                    </div>
                    <input
                      value={templateForm.name}
                      onChange={(event) =>
                        setTemplateForm({
                          ...templateForm,
                          name: event.target.value,
                        })
                      }
                      placeholder="Template name"
                      className="h-10 w-full rounded-lg border-slate-200 text-sm"
                    />
                    <input
                      value={templateForm.description}
                      onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })}
                      placeholder="When should this template be used? e.g. Service businesses with appointment enquiries"
                      className="h-10 w-full rounded-lg border-slate-200 text-sm"
                    />
                    <input
                      value={templateForm.subject}
                      onChange={(event) =>
                        setTemplateForm({
                          ...templateForm,
                          subject: event.target.value,
                        })
                      }
                      placeholder="Clear subject, e.g. A practical idea for {{company_name}}"
                      className="h-10 w-full rounded-lg border-slate-200 text-sm"
                    />
                    <textarea
                      value={templateForm.body}
                      onChange={(event) =>
                        setTemplateForm({
                          ...templateForm,
                          body: event.target.value,
                        })
                      }
                      placeholder="Write a short email with a greeting, your introduction, one relevant idea, a low-pressure question, and your signature."
                      className="min-h-28 w-full rounded-lg border-slate-200 text-sm"
                    />
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Insert variables</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {predefinedTemplateVariables.map((variable) => (
                          <button key={variable.name} type="button" title={variable.meaning} onClick={() => addTemplateVariable(variable.name, variable.meaning)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[#fff7ed] hover:text-[#b45309]">{"{{"}{variable.name}{"}}"}</button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input value={customVariable} onChange={(event) => setCustomVariable(event.target.value)} placeholder="Your variable, e.g. service_area" className="h-9 min-w-0 flex-1 rounded-lg border-slate-200 text-xs" />
                        <input value={customVariableMeaning} onChange={(event) => setCustomVariableMeaning(event.target.value)} placeholder="What does it mean / when to use it?" className="h-9 min-w-0 flex-[1.4] rounded-lg border-slate-200 text-xs" />
                        <ActionButton onClick={() => addTemplateVariable(customVariable, customVariableMeaning)}>Add variable</ActionButton>
                      </div>
                      {!!templateForm.variables.length && <div className="mt-3 space-y-1 text-[11px] text-slate-500">{templateForm.variables.map((variable) => <div key={variable}><code className="font-semibold text-slate-700">{"{{"}{variable}{"}}"}</code> — {templateForm.variable_descriptions[variable] || "User-defined value for this outreach."}</div>)}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={reviewTemplate}
                        disabled={reviewingTemplate}
                        title="Generate or refine this template from the selected campaign goal, audience, and AI Brain context."
                      >
                        {reviewingTemplate ? "Generating..." : "Generate from campaign"}
                      </ActionButton>
                      <ActionButton
                        primary
                        onClick={createTemplate}
                        disabled={savingTemplate}
                        icon={<Save className="h-4 w-4" />}
                      >
                        {savingTemplate ? "Saving..." : "Save template"}
                      </ActionButton>
                    </div>
                    <div className="rounded-lg border border-[#d9def7] bg-white p-3 text-[11px] leading-5 text-slate-500">
                      Best practice: keep the subject specific, introduce yourself once, use one practical idea, ask one simple question, and avoid unsupported claims. Variables are filled before sending: <code className="font-semibold text-slate-700">{"{{company_name}}"}</code>, <code className="font-semibold text-slate-700">{"{{company_context}}"}</code>, <code className="font-semibold text-slate-700">{"{{campaign_goal}}"}</code>, and <code className="font-semibold text-slate-700">{"{{website}}"}</code>.
                    </div>
                    {templateReview && (
                      <div className="space-y-3 rounded-xl border-2 border-[#f6c56f] bg-[#fffaf4] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b45309]">AI review</div>
                            <div className="mt-1 text-xs text-slate-500">Review the suggested wording, then accept it or keep your original.</div>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton tone="success" onClick={() => { setTemplateForm((current) => ({ ...current, subject: templateReview.subject, body: templateReview.body })); setTemplateReview(null); toast.success("AI changes accepted") }}>Accept AI changes</ActionButton>
                            <ActionButton onClick={() => setTemplateReview(null)}>Keep original</ActionButton>
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested subject</div>
                          <div className="mt-1 text-xs font-semibold text-slate-800">{templatePreview(templateReview.subject, form)}</div>
                          <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested body</div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{templatePreview(templateReview.body, form)}</p>
                        </div>
                        <ul className="list-disc space-y-1 pl-4 text-[11px] leading-4 text-slate-500">{templateReview.suggestions.map((suggestion, index) => <li key={`${suggestion}-${index}`}>{suggestion}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
                {false && (
                  <div className="mt-4 space-y-3">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            title="Show the subject and full message for this template."
                            onClick={() =>
                              setExpandedTemplateId((current) =>
                                current === template.id ? "" : template.id,
                              )
                            }
                            className="min-w-0 text-left"
                          >
                            <div className="text-xs font-semibold text-slate-800">
                              {template.name}
                            </div>
                            <div className="mt-1 text-[11px] leading-4 text-slate-500">
                              {template.description}
                            </div>
                          </button>
                          <ActionButton
                            title="Use this template when creating the next prospect draft."
                            tone="success"
                            onClick={() => useTemplate(template)}
                          >
                            Use
                          </ActionButton>
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Subject
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-700">
                            {templatePreview(template.subject)}
                          </div>
                          {expandedTemplateId === template.id && (
                            <>
                              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Message preview
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                {templatePreview(template.body)}
                              </p>
                              <div className="mt-3 text-[10px] text-slate-400">
                                Variables:{" "}
                                {
                                  "{{company_name}}, {{company_context}}, {{website}}"
                                }
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
                      Choose a template
                    </div>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setExpandedTemplateId(template.id)}
                        className={
                          libraryTemplate?.id === template.id
                            ? "w-full rounded-xl border border-[#f6c56f] bg-[#fffaf4] p-3 text-left shadow-sm"
                            : "w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#fed7aa]"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-800">
                              {template.name}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                              {template.description}
                            </div>
                          </div>
                          <span
                            className={
                              libraryTemplate?.id === template.id
                                ? "shrink-0 rounded-full bg-[#d97706] px-2 py-1 text-[10px] font-bold text-white"
                                : "shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"
                            }
                          >
                            {libraryTemplate?.id === template.id
                              ? "Selected"
                              : "Select"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {libraryTemplate ? (
                    <div className="overflow-hidden rounded-xl border border-[#cfe1f5] bg-white">
                      <div className="border-b border-slate-200 bg-[#f8fbff] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#5a67b1]">
                          Template preview
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-900">
                          {libraryTemplate.name}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-slate-500">
                          {libraryTemplate.description}
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">
                            Subject:
                          </span>{" "}
                          {templatePreview(libraryTemplate.subject, form)}
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {templatePreview(libraryTemplate.body, form)}
                          </p>
                        </div>
                        <div className="text-[10px] leading-4 text-slate-400">
                          Fixed format: greeting, relevant business context,
                          practical idea, low-pressure CTA, and Raj signature.
                          Use the template in a draft to personalize the
                          business details.
                        </div>
                        <ActionButton
                          tone="success"
                          title="Use this template when creating the next prospect draft."
                          onClick={() => useTemplate(libraryTemplate)}
                        >
                          Use this template
                        </ActionButton>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-[#d9def7] bg-[#f8f9ff]">
                      <div className="border-b border-[#d9def7] p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#5a67b1]">Automatic template</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">AI chooses the best active template</div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">This campaign is set to Automatic template. When scraping creates a draft, the system chooses the active template that best matches the campaign goal, search intent, and verified business type.</p>
                        <p className="mt-2 text-[11px] leading-5 text-slate-500">No predefined template is selected for this campaign. Choose a specific template in Scraping parameters if you want to lock the wording.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </DataState>
    </div>
  );
}
