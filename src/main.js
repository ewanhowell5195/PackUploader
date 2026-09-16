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

const { closeBrowser } = await import("./puppeteer.js")
globalThis.exit = async (code = 0) => {
  await closeBrowser()
  process.exit(code)
}

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
      underline: t => `<span style="text-decoration: underline;">${t}</span>`,
      link: (t, url) => `<a href="${url}" target="_blank">${t}</a>`
    },
    planetminecraft: {
      boldItalic: t => `[b][i]${t}[/i][/b]`,
      bold: t => `[b]${t}[/b]`,
      italic: t => `[i]${t}[/i]`,
      underline: t => `[u]${t}[/u]`,
      link: (t, url) => `[url=${url}]${t}[/url]`
    }
  }[platform]
  if (!r) return str
  const links = []
  str = str.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => `\u0000${links.push(r.link(t, url)) - 1}\u0000`)
  str = str.replace(/\*\*\*(.+?)\*\*\*/g, (_, t) => r.boldItalic(t))
  str = str.replace(/\*\*(.+?)\*\*/g, (_, t) => r.bold(t))
  str = str.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t) => r.italic(t))
  str = str.replace(/__(.+?)__/g, (_, t) => r.underline(t))
  return str.replace(/\u0000(\d+)\u0000/g, (_, i) => links[i])
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