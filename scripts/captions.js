import "../src/main.js"

globalThis.data = JSON.parse(fs.readFileSync("./data/captions.json"))

console.log(`Updating image details for project: ${data.id}`)

globalThis.projectPath = path.join("projects", data.id)
globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
globalThis.config = project.config

for (const image of config.images) {
  image.buffer = await sharp(path.join(projectPath, "images", image.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toBuffer()
}

if (project.curseforge.id) {
  await curseforge.setImageDetails()
}

if (project.modrinth.id) {
  await modrinth.setImageDetails()
}

if (project.planetminecraft.id) {
  await planetminecraft.setImageDetails()
}

if (project.curseforge.id) {
  await curseforge.setDetails()
  console.log("CurseForge: Updated project details")
}

if (project.modrinth.id) {
  await modrinth.setDetails(data.live)
  console.log("Modrinth: Updated project details")
}

if (project.planetminecraft.id) {
  await planetminecraft.updateDetails()
}

await exit()
