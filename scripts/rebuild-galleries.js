import "../src/main.js"

globalThis.data = JSON.parse(fs.readFileSync("./data/rebuild-galleries.json"))

console.log(`Rebuilding galleries for project: ${data.id}`)

globalThis.projectPath = path.join("projects", data.id)
globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
globalThis.config = project.config

for (const image of config.images) {
  image.buffer = await sharp(path.join(projectPath, "images", image.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
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

if (data.curseforge && project.curseforge.id) {
  await curseforge.removeImages()
  await curseforge.uploadImages()
}

if (data.modrinth && project.modrinth.id) {
  const images = await modrinth.getImages()
  const keep = await modrinth.getStatus() === "approved" ? [] : images.slice(-1)

  await modrinth.removeImages(images.filter(e => !keep.includes(e)))

  const deferred = await modrinth.uploadImages()

  if (keep.length) {
    await modrinth.removeImages(keep)
    await modrinth.uploadImages(deferred)
  }
}

if (data.planetminecraft && project.planetminecraft.id) {
  await planetminecraft.removeImages()
  await planetminecraft.uploadImages()
}

if (data.curseforge && project.curseforge.id) {
  await curseforge.setDetails()
  console.log("CurseForge: Updated project details")
}

if (data.modrinth && project.modrinth.id) {
  await modrinth.setDetails(true)
  console.log("Modrinth: Updated project details")
}

if (data.planetminecraft && project.planetminecraft.id) {
  await planetminecraft.updateDetails()
}

await exit()
