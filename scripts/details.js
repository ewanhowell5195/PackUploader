import "../src/main.js"

globalThis.data = JSON.parse(fs.readFileSync("./data/details.json"))

console.log(`Updating details for project: ${data.id}`)

// Setup

globalThis.projectPath = path.join("projects", data.id)
globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

globalThis.config = project.config

const icon = path.join(projectPath, "pack.png")
if (fs.existsSync(icon)) {
  config.icon = await sharp(icon).resize(512, 512, { kernel: "nearest" }).png().toBuffer()
}

const logo = path.join(projectPath, "logo.png")
if (fs.existsSync(logo)) {
  config.images.push({
    name: "Project Logo",
    description: `The logo for ${config.name}`,
    file: "logo",
    logo: true,
    buffer: await sharp(logo).resize(1280, 256, { fit: "inside", withoutEnlargement: true }).toBuffer()
  })
}

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

// Reupload icon & images

if (data.images) {
  for (const img of config.images) {
    if (img.logo) continue
    img.buffer = await sharp(path.join(projectPath, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
  }

  const thumbnail = path.join(projectPath, "thumbnail.png")
  if (fs.existsSync(thumbnail)) {
    config.images.unshift({
      name: "Project Thumbnail",
      description: `The thumbnail image for ${config.name}`,
      file: "thumbnail",
      thumbnail: true,
      buffer: await sharp(thumbnail).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
    })
  }

  if (project.curseforge.id) {
    if (config.icon) {
      await curseforge.uploadIcon()
    }

    await curseforge.removeImages()
    console.log("CurseForge: Removed project images")

    await curseforge.uploadImages()
    console.log("CurseForge: Added project images")
  }

  if (project.planetminecraft.id) {
    await planetminecraft.removeImages()
    console.log("Planet Minecraft: Removed project images")

    await planetminecraft.uploadImages()
    console.log("Planet Minecraft: Added project images")
  }

  if (project.modrinth.id) {
    if (config.icon) {
      await modrinth.uploadIcon()
    }

    await modrinth.removeImages()
    console.log("Modrinth: Removed project images")

    await modrinth.uploadImages()
    console.log("Modrinth: Added project images")
  }

  if (settings.ewan && !project.ewanhowell?.ignore) {
    await ewanhowell.removeImages()
    console.log("Ewan Howell: Removed project images")

    await ewanhowell.addImages()
    console.log("Ewan Howell: Added project images")
  }
}

// Update details

if (project.curseforge.id) {
  await curseforge.setDetails()
  console.log("CurseForge: Updated project details")
}

if (project.planetminecraft.id) {
  await planetminecraft.updateDetails()
}

if (project.modrinth.id) {
  await modrinth.setDetails(data.live)
  console.log("Modrinth: Updated project details")
}

if (settings.ewan && !project.ewanhowell?.ignore) {
  ewanhowell.writeDetails()
  console.log("Ewan Howell: Updated project details")
}

process.exit()