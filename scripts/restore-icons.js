import "../src/main.js"

for (const id of fs.readdirSync("projects")) {
  const projectPath = path.join("projects", id)
  if (!fs.existsSync(path.join(projectPath, "project.json"))) continue
  if (fs.existsSync(path.join(projectPath, "pack.png"))) continue

  globalThis.project = JSON.parse(fs.readFileSync(path.join(projectPath, "project.json")))
  globalThis.config = project.config

  let url
  if (project.modrinth.id) {
    const versions = await (await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/version`, {
      headers: { Authorization: auth.modrinth, "User-Agent": "ewanhowell5195/PackUploader" }
    })).json()
    url = versions[0]?.files.find(e => e.primary)?.url ?? versions[0]?.files[0]?.url
  }

  if (!url) {
    console.log(`!! ${id}: no download to pull an icon from`)
    continue
  }

  const buffer = Buffer.from(await (await fetch(url)).arrayBuffer())
  const entries = readZip(buffer)
  const icon = entries.get("pack.png")

  if (!icon) {
    console.log(`!! ${id}: the pack has no pack.png`)
    continue
  }

  const png = readZipFile(buffer, icon)
  fs.writeFileSync(path.join(projectPath, "pack.png"), png)
  const meta = await sharp(png).metadata()
  console.log(`${id}: ${meta.width}x${meta.height} from ${url.split("/").pop()}`)
}

await exit()
