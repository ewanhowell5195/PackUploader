import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.config = JSON.parse(fs.readFileSync("./data/create/create.json"))

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

const templates = path.join(projectPath, "templates")
fs.mkdirSync(templates)
for (const entry of fs.readdirSync("templates")) {
  if (entry === "snippets") continue
  const src = path.join("templates", entry)
  const dest = path.join(templates, entry)
  fs.cpSync(src, dest)
}

fs.cpSync("data/create/images", path.join(projectPath, "images"), { recursive: true })
fs.cpSync("data/create/pack.png", path.join(projectPath, "pack.png"))

// Files

config.pack = fs.readFileSync("data/create/pack.zip")

config.icon = await sharp(path.join(projectPath, "pack.png")).resize(512, 512, { kernel: "nearest" }).png().toBuffer()

for (const img of config.images) {
  img.buffer = await sharp(path.join(projectPath, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
}

if (fs.existsSync("data/create/thumbnail.png")) {
  fs.cpSync("data/create/thumbnail.png", path.join(projectPath, "thumbnail.png"))
  config.images.unshift({
    name: "Project Thumbnail",
    description: `The thumbnail image for ${config.name}`,
    file: "thumbnail",
    thumbnail: true,
    buffer: await sharp("data/create/thumbnail.png").resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
  })
}

if (fs.existsSync("data/create/logo.png")) {
  if (config.logo) {
    fs.cpSync("data/create/logo.png", path.join(projectPath, "logo.png"))
  }
  config.images.push({
    name: "Project Logo",
    description: `The logo for ${config.name}`,
    file: "logo",
    logo: true,
    buffer: await sharp("data/create/logo.png").resize(1280, 256, { fit: "inside", withoutEnlargement: true }).toBuffer()
  })
}

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

if (settings.ewan) {
  await ewanhowell.writeDetails()
  await ewanhowell.addImages()

  console.log("Ewan Howell: Project fully created")
}
