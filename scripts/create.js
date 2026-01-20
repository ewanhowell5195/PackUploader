import "../src/main.js"

globalThis.config = JSON.parse(fs.readFileSync("./data/create/create.json"))

console.log(`Creating project: ${config.id}`)

// Setup

globalThis.projectPath = path.join("projects", config.id)

let newProject
if (fs.existsSync(projectPath)) {
  globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
  globalThis.config = project.config
} else {
  newProject = true
  fs.mkdirSync(projectPath)
  globalThis.project = {
    config: config,
    curseforge: {},
    planetminecraft: {},
    modrinth: {}
  }

  fs.cpSync("data/create/images", path.join(projectPath, "images"), { recursive: true })
  fs.cpSync("data/create/pack.png", path.join(projectPath, "pack.png"))

  if (fs.existsSync("data/create/thumbnail.png")) {
    fs.cpSync("data/create/thumbnail.png", path.join(projectPath, "thumbnail.png"))
  }

  if (fs.existsSync("data/create/logo.png")) {
    fs.cpSync("data/create/logo.png", path.join(projectPath, "logo.png"))
  }
}
save()

const templates = path.join(projectPath, "templates")
if (!fs.existsSync(templates)) {
  fs.mkdirSync(templates)
  for (const entry of fs.readdirSync("templates")) {
    if (entry === "snippets") continue
    const src = path.join("templates", entry)
    const dest = path.join(templates, entry)
    fs.cpSync(src, dest)
  }
}

// Files

config.pack = fs.readFileSync("data/create/pack.zip")

config.icon = await sharp(path.join(projectPath, "pack.png")).resize(400, 400, { kernel: "nearest" }).png().toBuffer()

for (const img of config.images) {
  img.buffer = await sharp(path.join(projectPath, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
}

const thumbnailPath = path.join(projectPath, "thumbnail.png")
if (fs.existsSync(thumbnailPath)) {
  config.images.unshift({
    name: "Project Thumbnail",
    description: `The thumbnail image for ${config.name}`,
    file: "thumbnail",
    thumbnail: true,
    buffer: await sharp(thumbnailPath).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
  })
}

const logoPath = path.join(projectPath, "logo.png")
if (fs.existsSync(logoPath)) {
  config.images.push({
    name: "Project Logo",
    description: `The logo for ${config.name}`,
    file: "logo",
    logo: true,
    buffer: await sharp(logoPath).resize(1280, 256, { fit: "inside", withoutEnlargement: true }).toBuffer()
  })
}

// Ewan Howell

if (settings.ewan && !project.ewanhowell?.ignore && newProject) {
  await ewanhowell.writeDetails()
  await ewanhowell.addImages()

  console.log("Ewan Howell: Project fully created")
}

// CurseForge

if (!project.curseforge.id) {
  await curseforge.createProject()
  await curseforge.uploadPack()
  await curseforge.uploadImages()
  await curseforge.setDetails()

  console.log("CurseForge: Project fully created")
}

// Modrinth

if (!project.modrinth.id) {
  await modrinth.createProject()
  await modrinth.uploadPack()
  await modrinth.uploadImages()
  await modrinth.setDetails()

  console.log("Modrinth: Project fully created")
}

// Planet Minecraft

if (!project.planetminecraft.id) {
  await planetminecraft.createProject()

  console.log("Planet Minecraft: Project fully created")
}

process.exit()