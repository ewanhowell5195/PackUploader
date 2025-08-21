globalThis.defaultConfig = (await import("../config.json", { with: { type: "json" } })).default
globalThis.settings = (await import("../settings.json", { with: { type: "json" } })).default
globalThis.sharp = (await import("sharp")).default
globalThis.load = (await import("cheerio")).load
globalThis.path = await import("node:path")
globalThis.fs = await import("node:fs")

globalThis.makeForm = data => {
  const form = new FormData
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (typeof v === "object") {
      form.append(k, JSON.stringify(v))
    } else {
      form.append(k, v)
    }
  }
  return form
}

globalThis.save = () => {
  const clone = structuredClone(project)
  delete clone.icon
  delete clone.pack
  clone.config.images = clone.config.images.filter(img => !img.logo && !img.thumbnail)
  fs.writeFileSync(path.join(projectPath, "project.json"), JSON.stringify(clone, null, 2))
}