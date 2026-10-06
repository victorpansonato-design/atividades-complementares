/**
 * Durações em MINUTOS INTEIROS. Nunca usar float de horas: 1h30min = 90, não 1,30.
 * Duração não é horário do dia: valores acima de 24h são válidos.
 */

export function durationToMinutes(hours: number, minutes: number): number {
   return hours * 60 + minutes;
}

export function splitMinutes(total: number): { hours: number; minutes: number } {
   const safe = Math.max(0, Math.trunc(total));
   return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export interface DurationFields {
   hours: string;
   minutes: string;
}

export type DurationParseResult = { ok: true; minutes: number | null } | { ok: false; error: "invalid_hours" | "invalid_minutes" };

const DIGITS = /^\d+$/;

/** Converte os campos "Horas" e "Minutos". Ambos vazios = `null` (não informado). */
export function parseDurationFields(fields: DurationFields | null | undefined): DurationParseResult {
   const hoursText = (fields?.hours ?? "").trim();
   const minutesText = (fields?.minutes ?? "").trim();
   if (!hoursText && !minutesText) return { ok: true, minutes: null };
   if (hoursText && !DIGITS.test(hoursText)) return { ok: false, error: "invalid_hours" };
   if (minutesText && !DIGITS.test(minutesText)) return { ok: false, error: "invalid_minutes" };
   const hours = hoursText ? Number(hoursText) : 0;
   const minutes = minutesText ? Number(minutesText) : 0;
   if (!Number.isSafeInteger(hours) || hours > 100_000) return { ok: false, error: "invalid_hours" };
   if (minutes > 59) return { ok: false, error: "invalid_minutes" };
   return { ok: true, minutes: durationToMinutes(hours, minutes) };
}

export function minutesToFields(total: number | null | undefined): DurationFields {
   if (total == null) return { hours: "", minutes: "" };
   const { hours, minutes } = splitMinutes(total);
   return { hours: String(hours), minutes: minutes ? String(minutes) : "" };
}

/** "1h 30min", "160h", "45min", "0h". */
export function formatMinutes(total: number): string {
   const { hours, minutes } = splitMinutes(total);
   if (hours && minutes) return `${hours}h ${minutes}min`;
   if (minutes) return `${minutes}min`;
   return `${hours}h`;
}

/** Versão por extenso para leitores de tela: "1 hora e 30 minutos". */
export function formatMinutesLong(total: number): string {
   const { hours, minutes } = splitMinutes(total);
   const h = `${hours} ${hours === 1 ? "hora" : "horas"}`;
   const m = `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
   if (hours && minutes) return `${h} e ${m}`;
   if (minutes) return m;
   return h;
}

/** Formato do sistema legado ("160:00"). Usar SOMENTE no adapter legado. */
export function toLegacyHHmm(total: number): string {
   const { hours, minutes } = splitMinutes(total);
   return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
