/**
 * @hcw/ui-kit — HCW-UI-Kit (Human Centric Works). Pure neumorphism design system.
 *
 * Thesis: **depth encodes importance** (opaque only — no glass / blur):
 *   1. Flat — information at rest
 *   2. Soft raised — objects / chrome / dock / CTAs
 *   3. Soft inset + accent — wells, focus, alerts
 *
 * Spatial model: Top ribbon · Stage · TaskbarFooter · ActionDock · AnalogueClock.
 *
 *   import { KitRoot, ActionDockProvider, ActionDock, SoftRail, AnalogueClock,
 *            Surface, BrandMark, setUxEventSink } from "@hcw/ui-kit";
 */
export * from "./tokens.js";
export { DIALOG_RADIUS, DOCK_PILL_RADIUS, ACTION_DOCK_TRAY, NEU_GROOVE_VERTICAL, NEU_GROOVE_HORIZONTAL, LIQUID_GLASS_BUTTON, DOCK_BUTTON_LIFT, SECTION_DOCK_CHIP_GLASS, liquidGlassButtonFor, } from "./tokens.js";
export { actionDockButtonSx, sectionDockChipSx, liquidGlassSpecimenSx, layoutSx, chromeIconSx, chromeIconSxFor, typeScaleSx, searchFieldSx, } from "./chrome-sx.js";
export { CHART_MARKERS, CHART_CHROME, chartChromeFor, chartMarkerAt, chartRootSx, withChartSeriesColors, } from "./charts.js";
export { ICON, ICON_SLOTS, ICON_SIZE, PICTOGRAM, HEALTH_PICTOGRAM, STATUS_PICTOGRAM, BRAND_ACCENT_SHAPES, } from "./pictograms.js";
export { createAormsTheme, createHcwTheme, aormsTheme, hcwTheme } from "./theme.js";
export { MuiRoot, KitRoot, HcwLocaleContext, useHcwLocale } from "./MuiRoot.js";
export { createHcwRtlCacheOptions, DEFAULT_LOCALE } from "./rtl.js";
export { buildTokenExport, buildTokensJson, buildTokensCss } from "./token-export.js";
export { BrandMark } from "./BrandMark.js";
export { Surface } from "./Surface.js";
export { SoftRail, GlassRail } from "./GlassRail.js";
export { AnalogueClock } from "./AnalogueClock.js";
export { HealthGlassOrb } from "./HealthGlassOrb.js";
export { ActionDock, ActionDockProvider, useScreenActions, useDockActions, } from "./ActionDock.js";
export { StatusDot, statusShapeFor } from "./StatusDot.js";
export { DataState } from "./DataState.js";
export { ConfirmModal } from "./ConfirmModal.js";
export { PageBreadcrumb } from "./PageBreadcrumb.js";
export { ToastHost, pushToast, dismissToast, useToasts, resetToasts } from "./Toast.js";
export { Avatar, getInitials } from "./Avatar.js";
export { SectionDock } from "./SectionDock.js";
export { TaskbarFooter, TaskbarButton, TASKBAR_HEIGHT } from "./TaskbarFooter.js";
export { AwarenessStrip } from "./AwarenessStrip.js";
export { publishOutcome, clearOutcome, resetOutcomes, useActionOutcome, useActionOutcomes, usePublishOutcome, } from "./ActionOutcome.js";
export { ActionOutcomeBanner } from "./ActionOutcomeBanner.js";
export { KpiStrip } from "./KpiStrip.js";
export { MissionHeader, ObjectiveList, PhaseStrip, ConfidenceBand, DecisionCard, DecisionQueue, FrozenDecisionRow, FreezeTable, } from "./orchestration.js";
export { assertCapacity, enforceCapacity, capacityCap, } from "./capacity.js";
export { logUxEvent, setUxEventSink, resetUxEventSink, clearUxEventObservers, addUxEventObserver, logOrient, logDecision, logMission, logInterrupt, } from "./uxEvents.js";
export { installFatigueTracking, startFatigueSession, resetFatigueSession, pulseFatigueSession, evaluateFatigue, getFatigueSnapshot, suggestFatigueCopy, getLatestFatigueOffer, clearLatestFatigueOffer, subscribeFatigueOffer, } from "./fatigue.js";
export { FatigueOfferBanner } from "./FatigueOfferBanner.js";
export { setDecisionAuditSink, recordDecisionAudit, recordFreezeAudit, freezeDecision, openDecision, listSessionDecisionAudits, exportSessionDecisionAudits, resetDecisionAudit, } from "./decisionAudit.js";
export { estimateOrientMultiplier, isLoadRisk } from "./calibration.js";
export { HcwTelemetryRoot } from "./HcwTelemetryRoot.js";
export { trimDockActions, prioritizeDockActions } from "./ActionDock.js";
import { installFatigueTracking } from "./fatigue.js";
installFatigueTracking();
//# sourceMappingURL=index.js.map