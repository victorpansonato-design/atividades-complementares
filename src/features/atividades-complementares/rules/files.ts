/**
 * Validação local de comprovantes. Formatos atuais: PDF, DOC e DOCX (prints 02,
 * 04, 08 e 09). Imagens NÃO são aceitas sem autorização institucional.
 *
 * Esta checagem confere extensão, tipo informado pelo navegador e assinatura do
 * arquivo. Ela não inspeciona o conteúdo nem prova autenticidade.
 */
export const ACCEPTED_EXTENSIONS = ["pdf", "doc", "docx"] as const;
export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

export const ACCEPT_ATTRIBUTE =
   ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MIME_BY_EXTENSION: Record<AcceptedExtension, string[]> = {
   pdf: ["application/pdf"],
   doc: ["application/msword"],
   docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

/** Navegadores/SOs às vezes não informam o tipo de DOC/DOCX. */
const GENERIC_MIME = new Set(["", "application/octet-stream"]);

export function fileExtension(name: string): string {
   const index = name.lastIndexOf(".");
   return index > 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function isAcceptedExtension(ext: string): ext is AcceptedExtension {
   return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
}

export type FileProblem =
   | { code: "extension"; extension: string }
   | { code: "mime"; extension: string; mimeType: string }
   | { code: "size"; maxBytes: number }
   | { code: "empty" }
   | { code: "signature"; extension: string };

export function validateFileBasics(file: Pick<File, "name" | "type" | "size">, maxBytes: number): FileProblem | null {
   const extension = fileExtension(file.name);
   if (!isAcceptedExtension(extension)) return { code: "extension", extension };
   const mime = (file.type || "").toLowerCase();
   if (!GENERIC_MIME.has(mime) && !MIME_BY_EXTENSION[extension].includes(mime)) {
      return { code: "mime", extension, mimeType: mime };
   }
   if (file.size === 0) return { code: "empty" };
   if (file.size > maxBytes) return { code: "size", maxBytes };
   return null;
}

/** Assinaturas: PDF "%PDF-", DOC (OLE2) D0 CF 11 E0, DOCX (ZIP) "PK\x03\x04". */
export function matchesSignature(extension: AcceptedExtension, header: Uint8Array): boolean {
   const starts = (bytes: number[]) => bytes.every((b, i) => header[i] === b);
   switch (extension) {
      case "pdf":
         return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
      case "doc":
         return starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
      case "docx":
         return starts([0x50, 0x4b, 0x03, 0x04]);
   }
}

async function readHeader(file: Blob, length: number): Promise<Uint8Array> {
   const slice = file.slice(0, length);
   if (typeof slice.arrayBuffer === "function") return new Uint8Array(await slice.arrayBuffer());
   return new Uint8Array(
      await new Promise<ArrayBuffer>((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result as ArrayBuffer);
         reader.onerror = () => reject(reader.error);
         reader.readAsArrayBuffer(slice);
      }),
   );
}

export async function validateFile(file: File, maxBytes: number): Promise<FileProblem | null> {
   const basic = validateFileBasics(file, maxBytes);
   if (basic) return basic;
   const extension = fileExtension(file.name) as AcceptedExtension;
   const header = await readHeader(file, 8);
   if (!matchesSignature(extension, header)) return { code: "signature", extension };
   return null;
}

export function formatBytes(bytes: number): string {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
   return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function describeFileProblem(fileName: string, problem: FileProblem): string {
   switch (problem.code) {
      case "extension":
         return `"${fileName}" não foi anexado: envie PDF, DOC ou DOCX${problem.extension ? ` (o arquivo é .${problem.extension})` : ""}.`;
      case "mime":
         return `"${fileName}" não foi anexado: o tipo informado pelo arquivo não corresponde a .${problem.extension}.`;
      case "signature":
         return `"${fileName}" não foi anexado: o conteúdo não parece ser um ${problem.extension.toUpperCase()} válido.`;
      case "empty":
         return `"${fileName}" não foi anexado: o arquivo está vazio.`;
      case "size":
         return `"${fileName}" não foi anexado: o limite desta demonstração é ${formatBytes(problem.maxBytes)} por arquivo.`;
   }
}
