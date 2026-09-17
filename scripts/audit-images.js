import "../src/main.js"

const rows = []

for (const id of fs.readdirSync("projects")) {
  const projectPath = path.join("projects", id)
  if (!fs.existsSync(path.join(projectPath, "project.json"))) continue
  const project = JSON.parse(fs.readFileSync(path.join(projectPath, "project.json")))
  const expected = project.config.images.length

  const row = { id, expected, curseforge: null, modrinth: null }

  if (project.curseforge.id) {
    const r = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}?filter=%7B%7D&range=%5B0%2C99%5D&sort=%5B%22id%22%2C%22DESC%22%5D`, {
      headers: { cookie: auth.curseforge.cookie }
    })
    if (r.ok) {
      const media = await r.json()
      row.curseforge = media.filter(e => e.type === 1 && e.title !== "logo.png" && e.title !== "Project Logo").length
    } else {
      row.curseforge = `error ${r.status}`
    }
  }

  if (project.modrinth.id) {
    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      headers: { Authorization: auth.modrinth, "User-Agent": "ewanhowell5195/PackUploader" }
    })
    if (r.ok) {
      row.modrinth = (await r.json()).gallery.length
    } else {
      row.modrinth = `error ${r.status}`
    }
  }

  rows.push(row)
  const bad = (row.curseforge !== null && row.curseforge !== expected) || (row.modrinth !== null && row.modrinth !== expected)
  console.log(`${bad ? "!!" : "  "} ${id.padEnd(40)} expected ${String(expected).padStart(2)}  cf ${String(row.curseforge).padStart(5)}  mr ${String(row.modrinth).padStart(5)}`)
}

fs.writeFileSync("data/audit-images.json", JSON.stringify(rows, null, 2))

console.log("\nMismatches:")
for (const row of rows) {
  if ((row.curseforge !== null && row.curseforge !== row.expected) || (row.modrinth !== null && row.modrinth !== row.expected)) {
    console.log(`  ${row.id}: expected ${row.expected}, curseforge ${row.curseforge}, modrinth ${row.modrinth}`)
  }
}

await exit()
