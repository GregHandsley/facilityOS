import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import {
  defaultSamplingState,
  getNextSamplingState,
  getSamplingScopes,
  getSamplingStateId,
} from "@/lib/spot-checks/sampling";
import type {
  SamplingScope,
  SamplingState,
  SpotCheck,
  SpotCheckStatus,
} from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export async function getSamplingStatesForTask(task: CareTaskInstance) {
  const states = await Promise.all(
    getSamplingScopes(task).map(({ scope, scopeId }) =>
      getSamplingState({
        facilityId: task.facilityId,
        scope,
        scopeId,
      }),
    ),
  );

  return states.filter(Boolean) as SamplingState[];
}

export async function getFacilitySamplingStates(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "samplingStates"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((samplingDoc) => samplingDoc.data() as SamplingState)
    .sort((a, b) => a.scope.localeCompare(b.scope) || a.scopeId.localeCompare(b.scopeId));
}

export async function updateSamplingStatesForSpotCheck({
  reviewedStatus,
  spotCheck,
  task,
}: {
  reviewedStatus: SpotCheckStatus;
  spotCheck: SpotCheck;
  task: CareTaskInstance;
}) {
  const now = new Date().toISOString();
  const scopes = getSamplingScopes(task);
  const states = await Promise.all(
    scopes.map(async ({ scope, scopeId }) => {
      const current = await getOrCreateSamplingState({
        facilityId: spotCheck.facilityId,
        now,
        scope,
        scopeId,
      });
      const next = {
        ...getNextSamplingState({ current, reviewedStatus }),
        updatedAt: now,
      };

      await setDoc(doc(firestore, "samplingStates", next.id), next);

      return next;
    }),
  );

  return states;
}

async function getSamplingState({
  facilityId,
  scope,
  scopeId,
}: {
  facilityId: string;
  scope: SamplingScope;
  scopeId: string;
}) {
  const id = getSamplingStateId({ facilityId, scope, scopeId });
  const snapshot = await getDoc(doc(firestore, "samplingStates", id));

  return snapshot.exists() ? (snapshot.data() as SamplingState) : null;
}

async function getOrCreateSamplingState({
  facilityId,
  now,
  scope,
  scopeId,
}: {
  facilityId: string;
  now: string;
  scope: SamplingScope;
  scopeId: string;
}) {
  const existing = await getSamplingState({ facilityId, scope, scopeId });

  if (existing) {
    return existing;
  }

  return {
    ...defaultSamplingState,
    facilityId,
    id: getSamplingStateId({ facilityId, scope, scopeId }),
    scope,
    scopeId,
    updatedAt: now,
  };
}
