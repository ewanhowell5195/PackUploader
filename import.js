import "./src/main.js"
import curseforge from "./src/curseforge.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

const importData = JSON.parse(fs.readFileSync("./data/import.json"))

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

// Main Details

if (settings.ewan) {
  await ewanhowell.import()
  await curseforge.importIcon()
} else {
  await curseforge.import()
}

// Planet Minecraft

await planetminecraft.import()

// Modrinth

await modrinth.import()

// Saving

save()

console.log(`Imported "${config.id}"`)