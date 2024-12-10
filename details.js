import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.data = (await import("./data/details.json", { with: { type: "json" } })).default

console.log(`Updating details for project: ${data.id}`)

// Setup

globalThis.projectPath = path.join("projects", data.id)

globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

globalThis.config = project.config

// CurseForge

await curseforge.setDetails()

console.log("CurseForge: Project details updated")

// Planet Minecraft

await planetminecraft.updateDetails()

console.log("Planet Minecraft: Project fully created")

// Modrinth

await modrinth.setDetails(data.live)

console.log("Modrinth: Project details updated")

// Ewan Howell

ewanhowell.writeDetails()

console.log("Ewan Howell: Project details updated")