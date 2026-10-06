/**
 * API PÚBLICA do slice `atividades-complementares`.
 *
 * Páginas e o shell importam apenas daqui. A feature não depende do shell: pode
 * ser montada dentro do portal sem reescrita (as telas não criam sidebar própria).
 */
export { TrackingView } from "./components/tracking/tracking-view";
export { RequestWizard } from "./components/request-form/request-wizard";
export { RequestDetailView } from "./components/detail/request-detail-view";
export { CorrectionView } from "./components/correction/correction-view";
export { ReconsiderationView } from "./components/reconsideration/reconsideration-view";
export { HelpView } from "./components/help/help-view";
export { BagagensView } from "./components/bagagens/bagagens-view";
export { DemoPanelTrigger } from "./components/demo/demo-panel";
export { RegulationLink, REGULATION_URL } from "./components/common/regulation-links";
export { useStudentContext, useSummary } from "./api/queries";
export { isDemoToolsEnabled } from "./api/gateway";
export { formatMinutes } from "./rules/duration";
export type { StudentContext } from "./types/student.schema";
export type { CourseSummary } from "./types/budget.schema";
