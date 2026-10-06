/**
 * Microcopy em português para estados, bloqueios, regras e erros. Rótulos do
 * aluno mapeiam os estados técnicos documentados em docs/CONTRATO.md.
 */
import { AlertTriangle, Building2, CheckCircle2, Clock3, FilePen, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import type { ActivityType } from "../types/catalog.schema";
import type { GatewayErrorCode } from "../types/gateway";
import type { ActivityRequest, HistoryEventType, RequestStatus } from "../types/request.schema";
import type { ActivityBlockReason } from "../rules/limits";
import type { EffectiveUnitRule, LimitFactorKind } from "../rules/budget";
import { formatMinutes } from "../rules/duration";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

export interface StatusPresentation {
   label: string;
   tone: Tone;
   icon: LucideIcon;
}

export const STATUS: Record<RequestStatus | "rascunho" | "registrada", StatusPresentation> = {
   rascunho: { label: "Rascunho", tone: "neutral", icon: FilePen },
   em_analise: { label: "Em análise", tone: "primary", icon: Clock3 },
   precisa_correcao: { label: "Precisa de correção", tone: "warning", icon: AlertTriangle },
   reconsideracao_em_analise: { label: "Reconsideração em análise", tone: "primary", icon: RotateCcw },
   aprovada: { label: "Aprovada", tone: "success", icon: CheckCircle2 },
   nao_aprovada: { label: "Não aprovada", tone: "danger", icon: XCircle },
   registrada: { label: "Registrada pela instituição", tone: "success", icon: Building2 },
};

export function statusOf(request: Pick<ActivityRequest, "status" | "origin">): StatusPresentation {
   if (request.origin === "institutional" && request.status === "aprovada") return STATUS.registrada;
   return STATUS[request.status];
}

export const HISTORY_LABEL: Record<HistoryEventType, string> = {
   enviada: "Solicitação enviada",
   em_analise: "Em análise",
   precisa_correcao: "Correção solicitada",
   correcao_enviada: "Correção enviada",
   aprovada: "Aprovada",
   nao_aprovada: "Não aprovada",
   reconsideracao_enviada: "Reconsideração enviada",
};

export const BLOCK_REASON: Record<ActivityBlockReason, { title: string; hint: string }> = {
   approved_limit_reached: {
      title: "Limite atingido",
      hint: "Limite deste tipo atingido. Escolha outra atividade com saldo.",
   },
   reserved_in_review: {
      title: "Saldo reservado em análise",
      hint: "O saldo deste tipo está reservado em pedidos em análise. Se algum pedido não for aprovado, o saldo volta.",
   },
   one_time_used: { title: "Já utilizado", hint: "Este aproveitamento já foi utilizado." },
   one_time_in_review: { title: "Pedido em análise", hint: "Já existe um pedido deste aproveitamento em análise." },
   not_eligible: {
      title: "Não se aplica ao seu perfil",
      hint: "Este aproveitamento é para alunos que ingressaram por transferência, retorno ou com diploma anterior, conforme o tipo.",
   },
   historical_only: {
      title: "Somente histórico",
      hint: "Este código aparece no seu histórico, mas não está disponível para novos envios.",
   },
   rule_unavailable: {
      title: "Regra indisponível",
      hint: "A regra deste tipo não está disponível para envio. Nenhum limite foi inventado para ele.",
   },
   catalog_unavailable: {
      title: "Catálogo indisponível para envio",
      hint: "As regras do catálogo da sua matriz não estão disponíveis para novos envios.",
   },
   submission_closed: {
      title: "Prazo de entrega encerrado",
      hint: "O prazo de entrega para o semestre de conclusão terminou.",
   },
   course_complete: {
      title: "Carga exigida concluída",
      hint: "Você já cumpriu as horas exigidas e novos pedidos não estão habilitados.",
   },
};

/** "Até 10h por evento", "20h por semestre", "Conforme a carga horária do comprovante"… */
export function unitRuleText(rule: EffectiveUnitRule): string {
   const h = rule.limitMinutes != null ? formatMinutes(rule.limitMinutes) : null;
   switch (rule.kind) {
      case "project_assignment":
         return `Até ${h} por projeto`;
      case "event_cap":
         return `Até ${h} por evento`;
      case "publication_cap":
         return `Até ${h} por publicação`;
      case "presentation_cap":
         return `Até ${h} por apresentação`;
      case "activity_cap":
         return `Até ${h} por atividade`;
      case "semester_assignment":
         return `${h} por semestre, mesmo que a atividade tenha mais horas`;
      case "event_assignment":
         return `${h} por evento`;
      case "activity_assignment":
         return `${h} por atividade`;
      case "certificate_hours":
         return "Conforme a carga horária do comprovante";
      case "one_time":
         return "Pode ser utilizado uma única vez";
      case "review_assignment":
         return "Horas atribuídas na análise da coordenação, sem limite por unidade";
      case "participation_duration":
         return "Conforme o tempo de acompanhamento ou participação";
   }
}

/** Resumo das regras de um tipo, inclusive as modalidades. */
export function activityRuleLines(activity: ActivityType): string[] {
   const lines: string[] = [];
   const rule = activity.unitRule;
   if (rule?.kind === "mode_dependent") {
      for (const mode of rule.modes ?? []) lines.push(`${mode.label}: ${lowerFirst(unitRuleText(mode))}`);
   } else if (rule) {
      lines.push(unitRuleText({ kind: rule.kind, limitMinutes: rule.limitMinutes }));
   }
   if (activity.totalLimitMinutes != null) lines.push(`Limite total deste tipo: ${formatMinutes(activity.totalLimitMinutes)}`);
   return lines;
}

function lowerFirst(text: string): string {
   return text.charAt(0).toLowerCase() + text.slice(1);
}

export const FACTOR_LABEL: Record<LimitFactorKind, string> = {
   type_balance: "Saldo deste tipo",
   semester_balance: "Saldo no período selecionado",
   unit_limit: "Limite por unidade",
   fixed_assignment: "Atribuição prevista",
   certificate: "Horas do comprovante",
};

export const GATEWAY_ERROR: Record<GatewayErrorCode, string> = {
   saldo_alterado: "O saldo deste tipo mudou desde que você começou. Ajuste as horas e envie novamente.",
   prazo_encerrado: "O prazo para esta ação terminou.",
   requisito_ausente: "Falta anexar um documento exigido.",
   formato_invalido: "Há um arquivo em formato não aceito. Use PDF, DOC ou DOCX.",
   regra_indisponivel: "A regra deste tipo de atividade não está disponível no momento.",
   nao_elegivel: "Esta atividade não pode ser enviada para o seu perfil.",
   estado_invalido: "Não foi possível concluir: confira as informações.",
   nao_encontrado: "Não encontramos este registro.",
   falha_temporaria: "Não foi possível enviar agora. Seus dados foram mantidos. Tente novamente.",
};

export const MODALITY_LABEL = { presencial: "Presencial", ead: "EAD", hibrido: "Híbrido" } as const;
