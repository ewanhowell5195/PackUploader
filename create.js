import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.config = (await import("./data/create/create.json", { with: { type: "json" } })).default

console.log(`Creating project: ${config.id}`)

// Setup

globalThis.projectPath = path.join("projects", config.id)

if (fs.existsSync(projectPath)) {
  globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
  project.config = structuredClone(config)
} else {
  fs.mkdirSync(projectPath)
  globalThis.project = {
    config: structuredClone(config),
    curseforge: {},
    planetminecraft: {},
    modrinth: {}
  }
}
save()

// Copying

fs.cpSync("data/create/images", path.join("projects", config.id, "images"), { recursive: true })
fs.cpSync("data/create/pack.png", path.join("projects", config.id, "pack.png"))

if (config.logo) {
  fs.cpSync("data/create/logo.png", path.join("projects", config.id, "logo.png"))
}

// Files

for (const img of config.images) {
  img.buffer = await sharp(path.join("projects", config.id, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).jpeg({ quality: 95 }).toBuffer()
}

config.icon = await sharp(path.join("projects", config.id, "pack.png")).resize(512, 512, { kernel: "nearest" }).png().toBuffer()

config.pack = fs.readFileSync("data/create/pack.zip")

// CurseForge

if (!project.curseforge.id) {
  await curseforge.createProject()
  await curseforge.uploadPack()
  await curseforge.uploadImages()
  await curseforge.setDetails()

  console.log("CurseForge: Project fully created")
}

// Planet Minecraft

if (!project.planetminecraft.id) {
  await planetminecraft.createProject()

  console.log("Planet Minecraft: Project fully created")
}

// Modrinth

if (!project.modrinth.id) {
  await modrinth.createProject()
  await modrinth.uploadPack()
  await modrinth.uploadImages()
  await modrinth.setDetails()

  console.log("Modrinth: Project fully created")
}

// Ewan Howell

await ewanhowell.createPack()
await ewanhowell.addImages()

console.log("Ewan Howell: Project fully created")