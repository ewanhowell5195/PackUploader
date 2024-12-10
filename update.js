import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.config = (await import("./data/update.json", { with: { type: "json" } })).default

console.log(`Uploading update for project: ${config.id}`)

// Setup

globalThis.projectPath = path.join("projects", config.id)

globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

if (project.config.version === config.version) {
  console.error(`Error: "${config.id}" is already at version ${config.version}`)
  process.exit()
}

project.config.version = config.version
project.config.versions = config.versions

save()

// CurseForge

await curseforge.uploadPack()

// Planet Minecraft

await planetminecraft.versionUpdate()

// Modrinth

await modrinth.uploadPack()