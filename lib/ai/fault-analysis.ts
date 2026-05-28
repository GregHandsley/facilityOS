import type {
  AiIssueAnalysis,
  IssueCategory,
  IssuePriority,
  ManagedIssue,
} from "@/types/issue";

const issueCategories: IssueCategory[] = [
  "equipment_fault",
  "cleaning_issue",
  "safety_concern",
  "stock_issue",
  "building_issue",
  "other",
];
const issuePriorities: IssuePriority[] = ["low", "medium", "high", "critical"];

export async function analyzeFaultReport({
  equipmentName,
  issue,
  locationName,
}: {
  equipmentName: string;
  issue: ManagedIssue;
  locationName: string;
  recentIssues?: ManagedIssue[];
}): Promise<AiIssueAnalysis> {
  const highRiskSafetyAnalysis = getHighRiskSafetyAnalysis({
    description: issue.description,
    equipmentName,
  });

  if (highRiskSafetyAnalysis) {
    return highRiskSafetyAnalysis;
  }

  const lowRiskCleaningAnalysis = getLowRiskCleaningAnalysis({
    description: issue.description,
    equipmentName,
  });

  if (lowRiskCleaningAnalysis) {
    return lowRiskCleaningAnalysis;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            "You analyse one facility equipment report at a time for gyms and sports facilities. Treat the current report in isolation. Do not infer risk from past reports, assumed history, or the equipment type. Return only the requested structured JSON. Classify dust, dirt, sweat, litter, stains, or routine cleanliness as cleaning_issue and usually low priority unless the current report explicitly describes a slip hazard, injury risk, broken equipment, electrical issue, instability, sharp edge, smoke, burning smell, or unsafe operation. Any report that says equipment failed, detached, snapped, collapsed, or came loose and caused or may have caused injury must be safety_concern and at least high priority. Severe injury, eye injury, crushing, amputation, fire, explosion, electric shock, ambulance, hospital, heavy bleeding, or immediate danger should be critical. Set duplicateOrRepeat to false unless the current report itself says this is a repeat. Support manager judgement; do not claim certainty.",
          role: "system",
        },
        {
          content: JSON.stringify({
            currentReport: {
              category: issue.category,
              description: issue.description,
              priority: issue.priority,
              reporterType: issue.reporterType,
            },
            equipmentName,
            locationName,
          }),
          role: "user",
        },
      ],
      model: process.env.OPENAI_FAULT_ANALYSIS_MODEL || "gpt-4o-mini",
      text: {
        format: {
          name: "facilityos_fault_analysis",
          schema: faultAnalysisSchema,
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`OpenAI fault analysis failed with ${response.status}.`);
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const rawText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!rawText) {
    throw new Error("OpenAI fault analysis returned no output text.");
  }

  const analysis = validateAiIssueAnalysis(JSON.parse(rawText));

  return enforceCurrentReportPriority({
    analysis,
    description: issue.description,
    equipmentName,
  });
}

export function validateAiIssueAnalysis(value: unknown): AiIssueAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("AI analysis is not an object.");
  }

  const analysis = value as Partial<AiIssueAnalysis>;
  const category = analysis.category;
  const priority = analysis.priority;

  if (!category || !issueCategories.includes(category)) {
    throw new Error("AI analysis returned an invalid category.");
  }

  if (!priority || !issuePriorities.includes(priority)) {
    throw new Error("AI analysis returned an invalid priority.");
  }

  return {
    affectedComponent: cleanText(analysis.affectedComponent, "Unknown component"),
    category,
    duplicateOrRepeat: Boolean(analysis.duplicateOrRepeat),
    isSafetyRelated: Boolean(analysis.isSafetyRelated),
    priority,
    recommendedAction: cleanText(
      analysis.recommendedAction,
      "Review the report and decide the next action.",
    ),
    summary: cleanText(analysis.summary, "AI analysis is unavailable."),
  };
}

const faultAnalysisSchema = {
  additionalProperties: false,
  properties: {
    affectedComponent: {
      description: "Likely affected part or system, using concise facility language.",
      type: "string",
    },
    category: {
      enum: issueCategories,
      type: "string",
    },
    duplicateOrRepeat: {
      description:
        "True if the report appears related to recent reports on the same item.",
      type: "boolean",
    },
    isSafetyRelated: {
      description: "True if user safety may be affected.",
      type: "boolean",
    },
    priority: {
      enum: issuePriorities,
      type: "string",
    },
    recommendedAction: {
      description:
        "Practical next manager action. Do not auto-close or make final decisions.",
      type: "string",
    },
    summary: {
      description: "One-sentence manager summary.",
      type: "string",
    },
  },
  required: [
    "affectedComponent",
    "category",
    "duplicateOrRepeat",
    "isSafetyRelated",
    "priority",
    "recommendedAction",
    "summary",
  ],
  type: "object",
};

type OpenAIResponsePayload = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function enforceCurrentReportPriority({
  analysis,
  description,
  equipmentName,
}: {
  analysis: AiIssueAnalysis;
  description: string;
  equipmentName: string;
}): AiIssueAnalysis {
  const currentReportCleaningAnalysis = getLowRiskCleaningAnalysis({
    description,
    equipmentName,
  });
  const currentReportSafetyAnalysis = getHighRiskSafetyAnalysis({
    description,
    equipmentName,
  });

  if (currentReportSafetyAnalysis) {
    return currentReportSafetyAnalysis;
  }

  if (currentReportCleaningAnalysis) {
    return currentReportCleaningAnalysis;
  }

  if (
    analysis.isSafetyRelated &&
    (analysis.priority === "low" || analysis.priority === "medium")
  ) {
    return {
      ...analysis,
      category: "safety_concern",
      duplicateOrRepeat: currentReportMentionsRepeat(description),
      priority: "high",
    };
  }

  if (!currentReportMentionsRepeat(description)) {
    return {
      ...analysis,
      duplicateOrRepeat: false,
    };
  }

  return analysis;
}

function getHighRiskSafetyAnalysis({
  description,
  equipmentName,
}: {
  description: string;
  equipmentName: string;
}): AiIssueAnalysis | null {
  const normalized = description.toLowerCase();
  const criticalSignal = hasAny(normalized, [
    /\b(blew up|exploded|explosion)\b/,
    /\b(amputat|severed|crushed|unconscious)\b/,
    /\b(lost (an? |my )?(eye|eyesight|arm|leg|hand|finger|limb))\b/,
    /\b(impaled|blood|bleeding|broken bone|fracture)\b/,
    /\b(hospital|ambulance|electric shock|electrocut|fire|flames?|smoke|burning)\b/,
  ]);
  const equipmentFailureSignal = hasAny(normalized, [
    /\b(fell off|fallen off|came off|come off|detached|loose|unstable)\b/,
    /\b(snap|snapped|broke|broken|collapsed|failed|malfunction)\b/,
    /\b(sharp|cracked|jammed|stuck|sparks?|cable fray|frayed cable)\b/,
    /\b(unsafe|danger|dangerous|wobble|wobbly)\b/,
  ]);
  const injurySignal = hasAny(normalized, [
    /\b(injury|injured|hurt|pain|strain|strained|sprain|sprained)\b/,
    /\b(cut|bruise|bruised|burn|burned|trapped|hit|struck|slipped|fell)\b/,
    /\b(eye|head|neck|back|arm|leg|hand|finger|ankle|wrist|knee|shoulder)\b/,
    /\b(lost my|lost an?|could not move|cannot move)\b/,
  ]);
  const highSignal = equipmentFailureSignal || injurySignal;

  if (!criticalSignal && !highSignal) {
    return null;
  }

  const priority: IssuePriority = criticalSignal ? "critical" : "high";

  return {
    affectedComponent: equipmentName,
    category: "safety_concern",
    duplicateOrRepeat: currentReportMentionsRepeat(description),
    isSafetyRelated: true,
    priority,
    recommendedAction:
      priority === "critical"
        ? `Treat ${equipmentName} as an immediate safety issue. Remove it from use, check for injuries, and escalate to the manager before returning it to service.`
        : `Inspect ${equipmentName} before further use and decide whether it should be taken out of service.`,
    summary:
      priority === "critical"
        ? `${equipmentName} has been reported with serious injury or hazard language and should be treated as a critical safety concern.`
        : `${equipmentName} has been reported with safety-related language and should be reviewed before further use.`,
  };
}

function getLowRiskCleaningAnalysis({
  description,
  equipmentName,
}: {
  description: string;
  equipmentName: string;
}): AiIssueAnalysis | null {
  const normalized = description.toLowerCase();
  const cleaningSignal = /\b(dust|dusty|dirty|dirt|sweat|sweaty|stain|stained|litter|rubbish|trash|clean|cleaning|wipe|wiped|crumb|crumbs|marks?|smudge|specks?)\b/.test(
    normalized,
  );
  const safetySignal = /\b(unsafe|danger|dangerous|injury|injured|hurt|slip|slipping|sharp|broken|snap|snapped|loose|unstable|wobble|wobbly|electric|electrical|smoke|burning|fire|sparks?|jammed|stuck|fall|fallen|cracked)\b/.test(
    normalized,
  );

  if (!cleaningSignal || safetySignal) {
    return null;
  }

  return {
    affectedComponent: "Cleanliness",
    category: "cleaning_issue",
    duplicateOrRepeat: false,
    isSafetyRelated: false,
    priority: "low",
    recommendedAction: `Add ${equipmentName} to the next cleaning round and mark resolved once wiped down.`,
    summary: `${equipmentName} has a minor cleanliness issue and can be handled as a low-priority cleaning task.`,
  };
}

function currentReportMentionsRepeat(description: string) {
  return /\b(again|repeat|repeated|recurring|keeps happening|same issue|same problem|still|again today)\b/i.test(
    description,
  );
}

function hasAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}
