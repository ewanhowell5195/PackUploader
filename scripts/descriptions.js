import "../src/main.js"

globalThis.data = JSON.parse(fs.readFileSync("./data/descriptions.json"))

console.log(`Rewriting descriptions for project: ${data.id}`)

globalThis.projectPath = path.join("projects", data.id)
globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
globalThis.config = project.config

if (project.curseforge.id) {
  await curseforge.setDetails()
  console.log("CurseForge: Updated project details")
}

if (project.modrinth.id) {
  await modrinth.setDetails(data.live)
  console.log("Modrinth: Updated project details")
}

if (data.planetminecraft && project.planetminecraft.id) {
  await planetminecraft.updateDetails()
}

await exit()
