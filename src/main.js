globalThis.settings = (await import("../settings.json", { with: { type: "json" } })).default
globalThis.auth = (await import("../auth.json", { with: { type: "json" } })).default
globalThis.sharp = (await import("sharp")).default
globalThis.load = (await import("cheerio")).load
globalThis.path = await import("node:path")
globalThis.fs = await import("node:fs")

globalThis.curseforge = (await import("./curseforge.js")).default
globalThis.planetminecraft = (await import("./planetminecraft.js")).default
globalThis.modrinth = (await import("./modrinth.js")).default
globalThis.ewanhowell = (await import("./ewanhowell.js")).default

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

globalThis.getReplacementPath = (obj, path) => path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj)

globalThis.formatInline = (str, platform) => {
  if (platform === "modrinth") return str
  const r = {
    curseforge: {
      boldItalic: t => `<strong><em>${t}</em></strong>`,
      bold: t => `<strong>${t}</strong>`,
      italic: t => `<em>${t}</em>`,
      underline: t => `<span style="text-decoration: underline;">${t}</span>`
    },
    planetminecraft: {
      boldItalic: t => `[b][i]${t}[/i][/b]`,
      bold: t => `[b]${t}[/b]`,
      italic: t => `[i]${t}[/i]`,
      underline: t => `[u]${t}[/u]`
    }
  }[platform]
  if (!r) return str
  str = str.replace(/\*\*\*(.+?)\*\*\*/g, (_, t) => r.boldItalic(t))
  str = str.replace(/\*\*(.+?)\*\*/g, (_, t) => r.bold(t))
  str = str.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t) => r.italic(t))
  str = str.replace(/__(.+?)__/g, (_, t) => r.underline(t))
  return str
}

globalThis.save = () => {
  const clone = structuredClone(project)
  delete clone.config.icon
  delete clone.config.pack
  clone.config.images = clone.config.images.filter(e => {
    delete e.buffer
    return !e.logo && !e.thumbnail
  })
  fs.writeFileSync(path.join(projectPath, "project.json"), JSON.stringify(clone, null, 2))
}