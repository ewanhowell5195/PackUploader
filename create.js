import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.config = (await import("./data/create.json", { with: { type: "json" } })).default

console.log(`Creating project: ${config.id}`)

// Setup

globalThis.projectPath = path.join("projects", config.id)

// globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
// project.config = structuredClone(config)
// save()

if (fs.existsSync(projectPath)) {
  throw new Error(`Project "${config.id}" already exists`)
}

fs.mkdirSync(projectPath)

globalThis.project = {
  config: structuredClone(config),
  curseforge: {},
  planetminecraft: {},
  modrinth: {}
}

for (const img of config.images) {
  img.buffer = await sharp(path.join("./data", "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).jpeg({ quality: 95 }).toBuffer()
}

// CurseForge

await curseforge.createProject()
await curseforge.uploadPack()
await curseforge.uploadImages()
await curseforge.setDetails()

console.log("CurseForge: Project fully created")

// Planet Minecraft

await planetminecraft.createProject()

console.log("Planet Minecraft: Project fully created")

// Modrinth

await modrinth.createProject()
await modrinth.uploadPack()
await modrinth.uploadImages()
await modrinth.setDetails()

console.log("Modrinth: Project fully created")

// Ewan Howell

await ewanhowell.createPack()

console.log("Ewan Howell: Project fully created")