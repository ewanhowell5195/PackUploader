import "./src/main.js"

globalThis.config = JSON.parse(fs.readFileSync("./data/update/update.json"))

console.log(`Uploading update for project: ${config.id}`)

// Setup

globalThis.projectPath = path.join("projects", config.id)

globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

if (project.config.version === config.version) {
  console.error(`Error: "${config.id}" is already at version ${config.version}`)
  process.exit()
}

project.config.version = config.version
project.config.versions = config.versions

save()

config.pack = fs.readFileSync("data/update/pack.zip")

// Updates

if (project.curseforge.id) {
  await curseforge.uploadPack()
}

if (project.planetminecraft.id) {
  await planetminecraft.versionUpdate()
}

if (project.modrinth.id) {
  await modrinth.uploadPack()
}