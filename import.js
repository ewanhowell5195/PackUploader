import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

const importData = (await import("./data/import.json", { with: { type: "json" } })).default

globalThis.config = {
  id:importData.id
}

globalThis.project = {
  config,
  curseforge: importData.curseforge,
  planetminecraft: importData.planetminecraft,
  modrinth: importData.modrinth
}

globalThis.projectPath = path.join("projects", config.id)

if (fs.existsSync(projectPath)) {
  console.error(`Error: "${config.id}" is already exists`)
  process.exit()
} else {
  fs.mkdirSync(path.join(projectPath, "images"), { recursive: true })
}

// Ewan Howell

await ewanhowell.loadDetails()

// Planet Minecraft

await planetminecraft.loadDetails()

// Modrinth

await modrinth.loadDetails()

// Saving

fs.writeFileSync(path.join("projects", config.id, "project.json"), JSON.stringify(project, null, 2))

console.log(`Imported "${config.id}"`)