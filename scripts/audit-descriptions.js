import "../src/main.js"

for (const id of fs.readdirSync("projects")) {
  const projectPath = path.join("projects", id)
  if (!fs.existsSync(path.join(projectPath, "project.json"))) continue
  const project = JSON.parse(fs.readFileSync(path.join(projectPath, "project.json")))

  if (project.curseforge.id) {
    const r = await fetch(`https://authors.curseforge.com/_api/projects/description/${project.curseforge.id}`, {
      headers: { cookie: auth.curseforge.cookie }
    })
    const text = await r.text()
    if (text.includes("undefined")) {
      console.log(`!! ${id} curseforge: ${(text.match(/src=\\?"undefined\\?"/g) ?? []).length} broken images`)
    }
  }

  if (project.modrinth.id) {
    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      headers: { Authorization: auth.modrinth, "User-Agent": "ewanhowell5195/PackUploader" }
    })
    const body = (await r.json()).body ?? ""
    if (body.includes("undefined")) {
      console.log(`!! ${id} modrinth: ${(body.match(/src="undefined"/g) ?? []).length} broken images`)
    }
  }
}

console.log("done")

await exit()
