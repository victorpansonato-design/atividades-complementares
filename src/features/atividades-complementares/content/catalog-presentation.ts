/**
 * Apresentação do catálogo para o aluno (UX). Categorias, nomes curtos, exemplos
 * e termos de busca NÃO alteram códigos, limites ou orçamentos. Chave: `localId`
 * do briefing. Futuramente o backend pode fornecer estes textos.
 */
import type { ActivityType } from "../types/catalog.schema";

export const CATEGORIES = [
   { id: "cursos_eventos", label: "Cursos e eventos" },
   { id: "pesquisa", label: "Pesquisa e produção acadêmica" },
   { id: "cultura_social", label: "Cultura, esporte e ações sociais" },
   { id: "institucional", label: "Participação institucional" },
   { id: "aproveitamento_estagio", label: "Aproveitamentos e estágio" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export type OrganizerField = "required" | "optional";

interface Presentation {
   category: CategoryId;
   shortName: string;
   example: string;
   keywords: string;
   organizer?: OrganizerField;
   organizerLabel?: string;
}

const P: Record<string, Presentation> = {
   "25_001": {
      category: "pesquisa",
      shortName: "Iniciação científica ou tecnológica",
      example: "Programa de iniciação científica ou tecnológica, com certificado de conclusão.",
      keywords: "ic pesquisa projeto bolsa pibic",
   },
   "25_002": {
      category: "cursos_eventos",
      shortName: "Palestrante, mediador ou debatedor",
      example: "Você apresentou, mediou ou debateu em um evento da sua área.",
      keywords: "palestrante conferencista mediador debatedor mesa redonda",
   },
   "25_003-a": {
      category: "pesquisa",
      shortName: "Publicação em periódico ou anais",
      example: "Artigo publicado em revista científica ou anais de congresso, como autor ou coautor.",
      keywords: "artigo revista publicacao anais congresso periodico paper",
   },
   "25_003-b": {
      category: "pesquisa",
      shortName: "Publicação em livro ou capítulo",
      example: "Livro ou capítulo de livro com resultados de pesquisa, como autor ou coautor.",
      keywords: "livro capitulo publicacao autor",
   },
   "25_004": {
      category: "cursos_eventos",
      shortName: "Apresentação de trabalho em congresso",
      example: "Apresentação oral ou de pôster em congresso, simpósio, seminário ou conferência.",
      keywords: "apresentacao trabalho poster banner congresso simposio seminario",
   },
   "25_005-membro": {
      category: "pesquisa",
      shortName: "Membro de grupo de pesquisa (CNPq)",
      example: "Participação como membro efetivo de grupo de pesquisa vinculado ao CNPq, no semestre.",
      keywords: "grupo pesquisa cnpq membro",
   },
   "25_005-participacao": {
      category: "pesquisa",
      shortName: "Atividade de grupo de pesquisa (CNPq)",
      example: "Reunião, seminário ou evento promovido por grupo de pesquisa do CNPq.",
      keywords: "grupo pesquisa cnpq evento reuniao",
   },
   "25_006-membro": {
      category: "pesquisa",
      shortName: "Membro de grupo de estudo",
      example: "Participação como membro efetivo de grupo de estudo, no semestre.",
      keywords: "grupo estudo membro",
   },
   "25_006-participacao": {
      category: "pesquisa",
      shortName: "Atividade de grupo de estudo",
      example: "Encontro ou evento promovido por grupo de estudo.",
      keywords: "grupo estudo evento encontro",
   },
   "25_007-membro": {
      category: "institucional",
      shortName: "Membro de liga acadêmica",
      example: "Participação como membro efetivo de liga acadêmica, no semestre.",
      keywords: "liga academica membro",
      organizer: "optional",
      organizerLabel: "Nome da liga (opcional)",
   },
   "25_007-participacao": {
      category: "institucional",
      shortName: "Atividade de liga acadêmica",
      example: "Evento ou ação promovida por liga acadêmica.",
      keywords: "liga academica evento",
      organizer: "optional",
      organizerLabel: "Nome da liga (opcional)",
   },
   "25_008-a": {
      category: "cursos_eventos",
      shortName: "Assistir a defesas de graduação ou especialização",
      example: "Banca de TCC, monografia, especialização ou projeto integrador, como ouvinte.",
      keywords: "defesa banca tcc monografia especializacao projeto integrador ouvinte",
   },
   "25_008-b": {
      category: "cursos_eventos",
      shortName: "Assistir a defesas de mestrado ou doutorado",
      example: "Banca de mestrado ou doutorado, como ouvinte.",
      keywords: "defesa banca mestrado doutorado dissertacao tese ouvinte",
   },
   "25_009": {
      category: "cursos_eventos",
      shortName: "Ouvinte em palestra, congresso ou oficina",
      example: "Palestras, seminários, simpósios, minicursos, oficinas e encontros na sua área.",
      keywords: "palestra seminario congresso simposio minicurso oficina workshop webinar encontro ouvinte evento semana academica",
   },
   "25_010-a": {
      category: "cultura_social",
      shortName: "Curso ou atividade cultural",
      example: "Curso cultural, visita a museu, peça ou apresentação artística assistida.",
      keywords: "cultura cultural arte artistica teatro musica museu cinema",
   },
   "25_010-b": {
      category: "cultura_social",
      shortName: "Atividade cultural preparada e apresentada por você",
      example: "Peça, exposição ou apresentação artística preparada e apresentada por alunos.",
      keywords: "cultura cultural apresentacao artistica teatro musica exposicao aluno",
   },
   "25_011": {
      category: "cursos_eventos",
      shortName: "Curso de língua estrangeira",
      example: "Curso de idioma em instituição regular, com frequência e aproveitamento comprovados.",
      keywords: "idioma lingua estrangeira ingles espanhol frances curso",
   },
   "25_012": {
      category: "cursos_eventos",
      shortName: "Curso online com tempo de acesso",
      example: "Curso a distância (EAD) com certificado de conclusão e comprovação do tempo de acesso.",
      keywords: "curso online ead distancia certificado tempo acesso plataforma",
   },
   "25_013": {
      category: "cursos_eventos",
      shortName: "Curso online só com certificado",
      example: "Atividade a distância (EAD) comprovada apenas pelo certificado de conclusão.",
      keywords: "curso online ead distancia certificado conclusao",
   },
   "25_014": {
      category: "cursos_eventos",
      shortName: "Prática de laboratório, ensino ou redação",
      example: "Atividade prática em outra instituição de ensino ou pesquisa, fora do horário de aula.",
      keywords: "laboratorio pratica ensino redacao",
   },
   "25_015-a": {
      category: "cursos_eventos",
      shortName: "Visita técnica, atividade de campo, feira ou exposição",
      example: "Visita técnica, trabalho de campo, feira ou exposição na sua área.",
      keywords: "visita tecnica campo feira exposicao",
   },
   "25_015-b": {
      category: "cursos_eventos",
      shortName: "Atividade simulada",
      example: "Atividade simulada de cunho acadêmico, técnico ou científico.",
      keywords: "simulada simulacao juri simulado",
   },
   "25_016": {
      category: "cursos_eventos",
      shortName: "Curso de extensão",
      example: "Curso de extensão do UniAnchieta ou de outra instituição de ensino superior.",
      keywords: "extensao curso ies universidade",
   },
   "25_017": {
      category: "cursos_eventos",
      shortName: "Estudo complementar de formação profissional",
      example: "Curso ou capacitação que agrega valor à formação, em instituição reconhecida.",
      keywords: "capacitacao curso profissional complementar qualificacao",
   },
   "25_018": {
      category: "cultura_social",
      shortName: "Voluntariado e ações sociais",
      example: "ONG, ação comunitária, campanha beneficente ou doação de sangue.",
      keywords: "voluntariado voluntario ong social comunitaria campanha doacao sangue beneficente",
   },
   "25_019": {
      category: "cultura_social",
      shortName: "Evento esportivo",
      example: "Participação em evento esportivo oficial ou institucional.",
      keywords: "esporte esportivo jogos competicao campeonato",
   },
   "25_020-membro": {
      category: "cultura_social",
      shortName: "Membro da Atlética",
      example: "Participação como membro efetivo da Atlética, no semestre.",
      keywords: "atletica membro esporte",
      organizer: "optional",
      organizerLabel: "Organizador (opcional)",
   },
   "25_020-participacao": {
      category: "cultura_social",
      shortName: "Atividade da Atlética",
      example: "Evento ou ação realizada pela Atlética.",
      keywords: "atletica evento esporte",
      organizer: "optional",
      organizerLabel: "Organizador (opcional)",
   },
   "25_021-membro": {
      category: "cultura_social",
      shortName: "Membro da Banda UniAnchieta",
      example: "Participação como membro efetivo da Banda UniAnchieta, no semestre.",
      keywords: "banda musica membro",
      organizer: "optional",
      organizerLabel: "Organizador (opcional)",
   },
   "25_021-participacao": {
      category: "cultura_social",
      shortName: "Atividade da Banda UniAnchieta",
      example: "Apresentação ou evento realizado pela Banda UniAnchieta.",
      keywords: "banda musica apresentacao evento",
      organizer: "optional",
      organizerLabel: "Organizador (opcional)",
   },
   "25_022": {
      category: "institucional",
      shortName: "Órgãos colegiados (CPA, CONEPE, CONUN)",
      example: "Participação em CPA, CONEPE ou CONUN do Centro Universitário Padre Anchieta.",
      keywords: "colegiado cpa conepe conun conselho comissao",
      organizer: "optional",
      organizerLabel: "Órgão (opcional)",
   },
   "25_023": {
      category: "institucional",
      shortName: "Monitoria",
      example: "Atuação como monitor no Centro Universitário Padre Anchieta.",
      keywords: "monitoria monitor",
      organizer: "optional",
      organizerLabel: "Disciplina ou docente responsável (opcional)",
   },
   "25_024": {
      category: "aproveitamento_estagio",
      shortName: "Aproveitamento de disciplinas",
      example: "Disciplinas cursadas e não usadas no curso atual, em transferência, retorno ou diploma anterior.",
      keywords: "aproveitamento disciplina transferencia retorno diploma historico",
      organizerLabel: "Instituição onde cursou",
   },
   "25_025": {
      category: "aproveitamento_estagio",
      shortName: "Estágio não obrigatório",
      example: "Estágio não obrigatório na sua área ou afim, com termo de compromisso.",
      keywords: "estagio nao obrigatorio empresa termo compromisso trabalho",
      organizerLabel: "Empresa ou instituição do estágio",
   },
   "25_026": {
      category: "institucional",
      shortName: "Representante de classe",
      example: "Atuação como representante ou vice-representante de classe.",
      keywords: "representante vice classe turma",
      organizer: "optional",
      organizerLabel: "Turma (opcional)",
   },
   "25_027": {
      category: "pesquisa",
      shortName: "Produção textual orientada",
      example: "Leitura, análise e interpretação de textos propostas por docente ou coordenação.",
      keywords: "producao textual texto leitura resenha analise",
      organizerLabel: "Docente ou coordenação que propôs",
   },
   "25_028": {
      category: "aproveitamento_estagio",
      shortName: "Aproveitamento de horas de outra instituição",
      example: "Atividades complementares já validadas em outra IES, em transferência externa.",
      keywords: "aproveitamento transferencia externa outra ies horas validadas",
      organizerLabel: "Instituição de origem",
   },
   "25_029": {
      category: "pesquisa",
      shortName: "Audiência judicial ou comissão parlamentar",
      example: "Acompanhamento de audiência judicial ou participação em comissão parlamentar.",
      keywords: "audiencia judicial forum comissao parlamentar camara",
      organizerLabel: "Fórum, vara ou casa legislativa",
   },
};

export interface ActivityPresentation extends Presentation {
   organizer: OrganizerField;
   organizerLabel: string;
}

export function presentActivity(activity: Pick<ActivityType, "localId" | "displayName">): ActivityPresentation {
   const p = P[activity.localId];
   return {
      category: p?.category ?? "cursos_eventos",
      shortName: p?.shortName ?? activity.displayName,
      example: p?.example ?? "",
      keywords: p?.keywords ?? "",
      organizer: p?.organizer ?? "required",
      organizerLabel: p?.organizerLabel ?? "Instituição ou empresa organizadora",
   };
}

/** Código secundário exibido ao aluno: só o código do sistema quando observado (25_003a/b). */
export function displayCode(activity: Pick<ActivityType, "systemCode" | "regulationCode" | "variant">): string {
   if (activity.systemCode) return activity.systemCode;
   return activity.variant ? `${activity.regulationCode} (${activity.variant})` : activity.regulationCode;
}

/**
 * Atalhos do passo 1: as atividades mais comuns, com rótulo do dia a dia.
 * Só organização de UX; não muda código nem limite. Ajustar com dados de uso reais.
 */
export const POPULAR_ACTIVITIES = [
   { localId: "25_009", label: "Palestra, congresso ou oficina" },
   { localId: "25_012", label: "Curso online" },
   { localId: "25_016", label: "Curso de extensão" },
   { localId: "25_025", label: "Estágio não obrigatório" },
   { localId: "25_018", label: "Voluntariado ou doação" },
   { localId: "25_011", label: "Curso de idiomas" },
] as const;
