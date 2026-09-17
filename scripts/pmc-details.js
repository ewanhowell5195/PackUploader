import "../src/main.js"

globalThis.data = { live: true }

for (const id of JSON.parse(fs.readFileSync("./data/pmc-details.json"))) {
  globalThis.projectPath = path.join("projects", id)
  globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))
  globalThis.config = project.config
  process.stdout.write(id.padEnd(38))
  await planetminecraft.updateDetails()
}

await exit()
