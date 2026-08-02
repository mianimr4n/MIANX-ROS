export type {
  DerivedChange,
  OperationalTimeline,
  SafeMetricId,
  SafeMetricSnapshot,
  SinceAnchorKind,
  TimelineEvent,
  WhatChangedConfidence,
  WhatChangedCoverageState,
  WhatChangedDomain,
  WhatChangedPersistence,
  WhatChangedSeverity,
  WhatChangedSummary,
  WhatChangedTrustState,
} from "./types";

export {
  buildCurrentSnapshot,
  buildWhatChangedSummary,
  FORBIDDEN_SINCE_WORDING,
  formatChangeSentence,
  resolveSinceAnchor,
} from "./build-summary";
export type { WhatChangedBuildInput } from "./build-summary";

export {
  compareSnapshots,
  METRIC_META,
  percentChange,
  snapshotsComparable,
} from "./compare";

export {
  buildOperationalTimeline,
  TIMELINE_BOUNDED_COUNT,
} from "./timeline";
export type {
  TimelineBuildInput,
  TimelineDeliveryLike,
  TimelineKitchenLike,
  TimelineMovementLike,
  TimelineOrderLike,
  TimelinePurchaseLike,
} from "./timeline";

export {
  clearReviewSnapshot,
  readReviewSnapshot,
  storagePayloadLooksSafe,
  WHAT_CHANGED_STORAGE_KEY,
  WHAT_CHANGED_STORAGE_VERSION,
  writeReviewSnapshot,
} from "./storage";
export type { WhatChangedStorageAdapter } from "./storage";

export { emphasizeWhatChangedForMode } from "./mode-emphasis";
