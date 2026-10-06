/**
 * Orientações curtas. Sem contatos, WhatsApp ou links institucionais inventados:
 * quando for preciso falar com alguém, a orientação é procurar a coordenação do
 * curso pelos canais oficiais já conhecidos pelo aluno.
 */
export type HelpTopic = "geral" | "atividade" | "informacoes" | "revisao" | "correcao" | "reconsideracao";

export interface HelpItem {
   id: string;
   question: string;
   answer: string;
   topics: HelpTopic[];
}

export const HELP_ITEMS: HelpItem[] = [
   {
      id: "certificado-maior",
      question: "Por que nem todas as horas do certificado podem contar?",
      answer:
         "Cada tipo de atividade tem um limite total e, às vezes, um limite por evento, publicação ou semestre. O pedido aproveita no máximo o menor desses limites. A carga do certificado continua registrada como está, e a coordenação decide quantas horas serão computadas.",
      topics: ["geral", "atividade", "informacoes"],
   },
   {
      id: "registro-automatico",
      question: "Meu evento foi registrado pela instituição. Preciso enviar?",
      answer:
         "Não. Eventos registrados pela instituição aparecem no acompanhamento como “Registrada pela instituição” e já contam no seu progresso. Se um evento institucional ainda não apareceu, confira o histórico e aguarde o prazo informado para lançamento, sem enviar o mesmo evento de novo.",
      topics: ["geral", "atividade"],
   },
   {
      id: "corrigir",
      question: "Como corrigir um comprovante?",
      answer:
         "Quando a coordenação pede correção, o pedido aparece como “Precisa de correção”. Abra o pedido, toque em “Corrigir e reenviar”, troque ou acrescente o arquivo e reenvie. O protocolo é o mesmo, a versão anterior fica guardada no histórico e as horas não são reservadas duas vezes.",
      topics: ["geral", "correcao"],
   },
   {
      id: "prazo",
      question: "Até quando posso enviar?",
      answer:
         "As atividades podem ser enviadas ao longo do curso. No semestre de conclusão há prazo especial: em cursos presenciais, até o último dia útil de novembro (ou de maio, para quem conclui no meio do ano); em cursos a distância, até o último dia útil do mês anterior à conclusão. Correções e reconsiderações vão até o semestre seguinte ao do pedido, respeitando esses prazos. O prazo de análise não amplia o prazo de entrega.",
      topics: ["geral", "revisao", "correcao", "reconsideracao"],
   },
   {
      id: "antes-ingresso",
      question: "Por que uma atividade anterior ao ingresso pode ser recusada?",
      answer:
         "O regulamento não considera atividades feitas antes do ingresso no curso (art. 4º, §2º). Aproveitamentos de disciplinas ou de horas já validadas em transferência, retorno ou diploma anterior seguem regra própria e são analisados pela coordenação.",
      topics: ["geral", "informacoes"],
   },
   {
      id: "documentos",
      question: "Quais arquivos posso anexar?",
      answer:
         "PDF, DOC ou DOCX. Os documentos exigidos mudam conforme a atividade e aparecem na lista de comprovantes. Um mesmo arquivo pode valer para mais de um item quando realmente comprova ambos. Anexar não comprova a autenticidade: a coordenação analisa o conteúdo.",
      topics: ["geral", "informacoes", "correcao", "reconsideracao"],
   },
   {
      id: "horas-minutos",
      question: "Como informo as horas?",
      answer:
         "Use os campos Horas e Minutos. Por exemplo, uma hora e meia é 1 hora e 30 minutos. Valores acima de 24 horas são normais para cursos longos.",
      topics: ["informacoes"],
   },
   {
      id: "periodo",
      question: "Qual ano e período devo escolher?",
      answer:
         "É o período acadêmico em que a atividade aconteceu, não a data de envio. Sugerimos um período a partir das datas; confira e altere se necessário. Se a atividade atravessa dois períodos, a coordenação analisa como considerar as horas.",
      topics: ["informacoes"],
   },
   {
      id: "analise",
      question: "Quanto tempo leva a análise?",
      answer:
         "O prazo informado é de até 30 dias úteis. Enquanto isso, as horas ficam “em análise”: elas reservam o saldo do tipo, mas só entram no seu progresso depois de aprovadas. A coordenação pode aprovar menos horas do que o solicitado e explica o motivo.",
      topics: ["geral", "revisao"],
   },
   {
      id: "reconsideracao",
      question: "Meu pedido não foi aprovado. O que posso fazer?",
      answer:
         "Se estiver dentro do prazo, abra o pedido e use “Pedir reconsideração”, explicando o motivo e anexando documentos complementares, se tiver. A reconsideração fica vinculada ao pedido original e não conta como nova atividade.",
      topics: ["geral", "reconsideracao"],
   },
   {
      id: "estagio-extensao",
      question: "Estágio obrigatório e Prática Extensionista contam?",
      answer:
         "As horas do estágio obrigatório não podem contar ao mesmo tempo como atividade complementar. Alguns tipos (cursos culturais, extensão e voluntariado) excluem expressamente atividades de Prática Extensionista. Em caso de dúvida, a coordenação analisa o enquadramento.",
      topics: ["geral", "atividade"],
   },
];

export function helpFor(topic: HelpTopic): HelpItem[] {
   return HELP_ITEMS.filter(item => item.topics.includes(topic));
}
