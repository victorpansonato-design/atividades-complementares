/**
 * Descrição legada composta: nome + organizador + detalhes, juntos no máximo
 * 6.000 caracteres (limite do campo atual). O adapter NÃO trunca: o formulário
 * valida o total serializado antes do envio.
 */
export const LEGACY_DESCRIPTION_LIMIT = 6000;

export interface DescriptionParts {
   title: string;
   organizer?: string | null;
   details?: string | null;
}

export function composeLegacyDescription({ title, organizer, details }: DescriptionParts): string {
   const lines = [`Atividade: ${title.trim()}`];
   if (organizer?.trim()) lines.push(`Instituição/organizador: ${organizer.trim()}`);
   if (details?.trim()) lines.push("", details.trim());
   return lines.join("\n");
}

export function legacyDescriptionLength(parts: DescriptionParts): number {
   return composeLegacyDescription(parts).length;
}

/** Caracteres ainda disponíveis para "Informações complementares". */
export function remainingDescriptionCharacters(parts: DescriptionParts): number {
   return LEGACY_DESCRIPTION_LIMIT - legacyDescriptionLength(parts);
}
