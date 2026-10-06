import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUILD_DIRECTORY = join(PROJECT_ROOT, "build");

function getTargetDirectory() {
   const reposHome = process.env.REPOS_HOME;
   if (!reposHome) {
      throw new Error("Variável de ambiente REPOS_HOME não definida");
   }

   const packageJson = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf8"));

   return join(reposHome, "docker-apache-dev", "app-web", packageJson.name);
}

function getBuildArtifacts() {
   if (!existsSync(BUILD_DIRECTORY)) {
      throw new Error(`Diretório de build não encontrado: ${BUILD_DIRECTORY}`);
   }

   const artifacts = readdirSync(BUILD_DIRECTORY);
   if (artifacts.length === 0) {
      throw new Error(`Diretório de build vazio: ${BUILD_DIRECTORY}`);
   }

   return artifacts;
}

function publishBuild(targetDirectory, artifacts) {
   mkdirSync(targetDirectory, { recursive: true });

   for (const artifact of artifacts) {
      const source = join(BUILD_DIRECTORY, artifact);
      const destination = join(targetDirectory, artifact);

      rmSync(destination, { recursive: true, force: true });
      cpSync(source, destination, { recursive: true });
   }
}

const targetDirectory = getTargetDirectory();
const buildArtifacts = getBuildArtifacts();

publishBuild(targetDirectory, buildArtifacts);

console.log(`Build publicado em ${targetDirectory}`);
