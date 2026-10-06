// Setup de um novo projeto criado a partir deste template.
// Ajusta base path, URLs, proxy, nome do pacote e textos de UI, e gera os arquivos .env.
//
// Uso interativo (recomendado para humanos):
//   npm run setup
//
// Uso não interativo (CI / agentes de IA):
//   npm run setup -- --name "Portal do Aluno"
//   npm run setup -- --name "Portal do Aluno" --slug portal-aluno
//
// Flags:
//   --name <texto>   Nome de exibição. Obrigatório no modo não interativo.
//   --slug <texto>   Slug das URLs e do package name. Opcional; derivado do nome.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readFile = relative => readFileSync(join(ROOT, relative), "utf8");
const writeFile = (relative, content) => writeFileSync(join(ROOT, relative), content);
const fileExists = relative => existsSync(join(ROOT, relative));

function slugify(value) {
   return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
}

const isValidSlug = value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

// Converte o nome de uma pasta em nome de exibição: "portal-aluno" -> "Portal Aluno".
function toDisplayName(value) {
   return value
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
}

function parseArgs(argv) {
   const options = {};
   for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i];
      if (arg === "--name" || arg === "--slug") {
         options[arg.slice(2)] = argv[i + 1] ?? "";
         i += 1;
      } else if (arg.startsWith("--name=")) {
         options.name = arg.slice("--name=".length);
      } else if (arg.startsWith("--slug=")) {
         options.slug = arg.slice("--slug=".length);
      }
   }
   return options;
}

function buildSummary(display, slug) {
   return [
      `  Nome de exibição : ${display}`,
      `  Slug             : ${slug}`,
      `  Base path        : /${slug}/`,
      `  API / proxy      : /${slug}/api/v1`,
      `  Arquivos .env    : .env.local e .env.production (gerados se ainda não existirem)`,
   ].join("\n");
}

function applyChanges(display, slug) {
   // Substituições cirúrgicas: nunca um replace global de "template",
   // para não atingir dependências como @babel/template no lockfile.
   const rules = [
      { file: "package.json", find: /("name":\s*)"template"/, to: (_match, prefix) => `${prefix}"${slug}"` },
      { file: "index.html", find: /<title>Template<\/title>/, to: () => `<title>${display}</title>` },
      { file: "vite.config.ts", find: /\/template\//g, to: () => `/${slug}/` },
      { file: ".env.example", find: /\/template\//g, to: () => `/${slug}/` },
      { file: "public/.htaccess", find: /\/template\//g, to: () => `/${slug}/` },
      { file: "src/config/env.ts", find: /\/template\//g, to: () => `/${slug}/` },
      { file: "src/layout/main-layout.tsx", find: />Template</g, to: () => `>${display}<` },
      { file: "src/layout/app-sidebar.tsx", find: />Template</g, to: () => `>${display}<` },
   ];

   console.log("\nArquivos:");
   for (const { file, find, to } of rules) {
      if (!fileExists(file)) {
         console.log(`  ausente    ${file}`);
         continue;
      }
      const before = readFile(file);
      const after = before.replace(find, to);
      if (after === before) {
         console.log(`  inalterado ${file}`);
      } else {
         writeFile(file, after);
         console.log(`  atualizado ${file}`);
      }
   }

   // Gera .env.local e .env.production a partir das variáveis do .env.example.
   const envLines = readFile(".env.example")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => /^\w+=/.test(line))
      .map(line => line.replace(/\/template\//g, `/${slug}/`));

   for (const { file, dev } of [
      { file: ".env.local", dev: "true" },
      { file: ".env.production", dev: "false" },
   ]) {
      if (fileExists(file)) {
         console.log(`  mantido    ${file} (já existe)`);
         continue;
      }
      const content = `${envLines.map(line => (line.startsWith("DEV=") ? `DEV=${dev}` : line)).join("\n")}\n`;
      writeFile(file, content);
      console.log(`  gerado     ${file}`);
   }

   console.log("\nConcluído. Próximos passos:");
   console.log("  1. npm install   (atualiza o nome em package-lock.json)");
   console.log('  2. Quando quiser, remova scripts/setup.mjs e o script "setup" do package.json');
}

async function runInteractive() {
   const rl = createInterface({ input: process.stdin, output: process.stdout });
   try {
      const currentName = JSON.parse(readFile("package.json")).name;
      if (currentName !== "template") {
         const proceed = await rl.question(
            `O package.json já se chama "${currentName}". O projeto parece configurado. Continuar mesmo assim? (s/N) `,
         );
         if (proceed.trim().toLowerCase() !== "s") {
            console.log("Cancelado.");
            return;
         }
      }

      const suggested = toDisplayName(basename(ROOT));
      let display = (await rl.question(`Nome do projeto (exibição) [${suggested}]: `)).trim();
      if (!display) display = suggested;
      while (!display) {
         display = (await rl.question("O nome não pode ficar vazio. Nome do projeto (exibição): ")).trim();
      }

      let slug = slugify(display);
      const customSlug = (await rl.question(`Slug para URLs e nome do pacote [${slug}]: `)).trim().toLowerCase();
      if (customSlug) slug = customSlug;

      if (!isValidSlug(slug)) {
         console.log(`Slug inválido: "${slug}". Use apenas letras minúsculas, números e hífens.`);
         process.exitCode = 1;
         return;
      }

      console.log("\nResumo:");
      console.log(buildSummary(display, slug));
      const confirm = (await rl.question("\nAplicar as alterações? (s/N) ")).trim().toLowerCase();
      if (confirm !== "s") {
         console.log("Cancelado. Nenhum arquivo foi alterado.");
         return;
      }

      applyChanges(display, slug);
   } finally {
      rl.close();
   }
}

function runNonInteractive(options) {
   const display = (options.name ?? "").trim();
   if (!display) {
      console.error("Erro: --name é obrigatório no modo não interativo.");
      process.exitCode = 1;
      return;
   }

   const slug = (options.slug?.trim() || slugify(display)).toLowerCase();
   if (!isValidSlug(slug)) {
      console.error(`Erro: slug inválido "${slug}". Use apenas letras minúsculas, números e hífens.`);
      process.exitCode = 1;
      return;
   }

   const currentName = JSON.parse(readFile("package.json")).name;
   if (currentName !== "template") {
      console.warn(`Aviso: o package.json já se chama "${currentName}". Reaplicando mesmo assim.`);
   }

   console.log("Resumo:");
   console.log(buildSummary(display, slug));
   applyChanges(display, slug);
}

const options = parseArgs(process.argv.slice(2));
if (options.name !== undefined) {
   runNonInteractive(options);
} else {
   await runInteractive();
}
