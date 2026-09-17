import "../src/main.js"

const rows = []

for (const id of fs.readdirSync("projects")) {
  const projectPath = path.join("projects", id)
  if (!fs.existsSync(path.join(projectPath, "project.json"))) continue
  globalThis.project = JSON.parse(fs.readFileSync(path.join(projectPath, "project.json")))
  globalThis.config = project.config
  if (!project.planetminecraft.id) continue

  const $ = await planetminecraft.getProject()
  const description = $("#description").val() ?? ""
  const titles = $(".image_list > .thumbnail[id]").map((i, e) => $(e).data("caption")?.split(" - ")[0]).get()
  const missing = config.images.filter(e => e.embed).map(e => e.name).filter(name => !titles.includes(name.replaceAll("(", "").replaceAll(")", "")))
  const broken = (description.match(/\[img[^\]]*\]undefined\[\/img\]/g) ?? []).length

  rows.push({ id, broken, missing, titles })

  if (broken || missing.length) {
    console.log(`!! ${id}: ${broken} broken embeds, ${missing.length} embedded images not in the gallery ${JSON.stringify(missing)}`)
    console.log(`   gallery: ${JSON.stringify(titles)}`)
  }
}

fs.writeFileSync("data/audit-planetminecraft.json", JSON.stringify(rows, null, 2))

console.log(`\nChecked ${rows.length} projects, ${rows.filter(e => e.broken || e.missing.length).length} need attention`)

await exit()
