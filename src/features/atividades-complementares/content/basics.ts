/**
 * Conteúdo de ORIENTAÇÃO para o aluno: o que são Atividades Complementares, como
 * funciona, o que conta e Bagagens. Só informação (fontes: regulamento 2025 e texto
 * institucional das Bagagens fornecido pelo CX). Não cria regra operacional.
 */
import { env } from "@/config/env";
import type { CategoryId } from "./catalog-presentation";

export const WHAT_ARE = {
   title: "O que são Atividades Complementares?",
   short: "São horas de atividades fora da sala de aula, como cursos, eventos, estágio e voluntariado. Elas são obrigatórias para você se formar.",
   points: [
      "Valem atividades feitas depois do seu ingresso, dentro ou fora da UniAnchieta, inclusive nas férias.",
      "Você envia o comprovante por aqui e a coordenação analisa e decide quantas horas contam.",
      "Cada tipo de atividade tem um limite de horas. Por isso vale variar.",
   ],
};

export const HOW_IT_WORKS = [
   { title: "Faça a atividade", text: "Curso, palestra, estágio, voluntariado… Guarde o comprovante." },
   { title: "Envie por aqui", text: "Escolha a atividade, anexe o comprovante (PDF, DOC ou DOCX) e envie." },
   { title: "Acompanhe", text: "A análise leva até 30 dias úteis. Aprovadas, as horas entram no seu total." },
] as const;

/** "O que conta", em linguagem do dia a dia, por categoria de UX do catálogo. */
export const WHAT_COUNTS: { category: CategoryId; title: string; examples: string[] }[] = [
   {
      category: "cursos_eventos",
      title: "Cursos e eventos",
      examples: ["Palestras, congressos e oficinas", "Cursos online e de extensão", "Cursos de idiomas", "Visitas técnicas e feiras"],
   },
   {
      category: "pesquisa",
      title: "Pesquisa e produção",
      examples: ["Iniciação científica", "Artigos e capítulos publicados", "Grupos de pesquisa e de estudo"],
   },
   {
      category: "cultura_social",
      title: "Cultura, esporte e social",
      examples: ["Voluntariado e doação de sangue", "Atividades culturais", "Atlética e Banda UniAnchieta"],
   },
   {
      category: "institucional",
      title: "Participação na UniAnchieta",
      examples: ["Monitoria", "Representante de classe", "Ligas acadêmicas e colegiados"],
   },
   {
      category: "aproveitamento_estagio",
      title: "Estágio e aproveitamentos",
      examples: ["Estágio não obrigatório (não vale o obrigatório)", "Disciplinas e horas de outra instituição (casos específicos)"],
   },
];

/** Registros que entram sem pedido: evitar envio em duplicidade. */
export const AUTOMATIC_NOTE = "Eventos da UniAnchieta e Bagagens entram sozinhos no seu histórico. Não precisa solicitar.";

export const BAGAGENS = {
   title: "Bagagens",
   headline: "Cursos gratuitos que valem 15 horas cada",
   intro: "As Bagagens são cursos gratuitos da UniAnchieta para complementar a sua formação.",
   steps: [
      { title: "Inscreva-se no AVA", text: "É grátis. As inscrições abrem a cada semestre e você pode fazer quantas quiser." },
      { title: "Conclua com 60% ou mais", text: "Cada Bagagem concluída com aproveitamento de 60% ou mais vale 15 horas." },
      { title: "As horas entram sozinhas", text: "São lançadas no seu histórico no final do semestre. Você não precisa solicitar." },
   ],
   cta: "Fazer uma Bagagem no AVA",
   footnote: "Inscrições abertas enquanto as Bagagens estiverem disponíveis no AVA.",
   /** Link fornecido pelo CX. Configurável por VITE_BAGAGENS_URL. */
   url: env.bagagensUrl,
} as const;
