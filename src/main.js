globalThis.settings = (await import("../settings.json", { with: { type: "json" } })).default
globalThis.auth = (await import("../auth.json", { with: { type: "json" } })).default
globalThis.sharp = (await import("sharp")).default
globalThis.load = (await import("cheerio")).load
globalThis.path = await import("node:path")
globalThis.fs = await import("node:fs")
globalThis.zlib = await import("node:zlib")

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

globalThis.readZip = buffer => {
  let end = buffer.length - 22
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--
  if (end < 0) throw new Error("not a valid zip")
  const count = buffer.readUInt16LE(end + 10)
  const entries = new Map
  let offset = buffer.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    const nameLength = buffer.readUInt16LE(offset + 28)
    entries.set(buffer.toString("utf8", offset + 46, offset + 46 + nameLength), {
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      header: buffer.readUInt32LE(offset + 42)
    })
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32)
  }
  return entries
}

globalThis.readZipFile = (buffer, entry) => {
  const start = entry.header + 30 + buffer.readUInt16LE(entry.header + 26) + buffer.readUInt16LE(entry.header + 28)
  const data = buffer.subarray(start, start + entry.compressedSize)
  return entry.method === 0 ? data : zlib.inflateRawSync(data)
}

globalThis.validatePack = buffer => {
  const entries = readZip(buffer)
  const mcmeta = entries.get("pack.mcmeta")
  if (!mcmeta) {
    console.error("Error: pack.zip has no pack.mcmeta in its root")
    return false
  }
  const meta = JSON.parse(readZipFile(buffer, mcmeta).toString("utf8").replace(/^﻿/, ""))
  const allowed = new Set(["pack.mcmeta", "pack.png", "assets"].concat((meta.overlays?.entries ?? []).map(e => e.directory)))
  const extra = Array.from(new Set(Array.from(entries.keys()).map(name => name.split("/")[0]))).filter(name => !allowed.has(name))
  if (extra.length) {
    console.error(`Error: pack.zip has unexpected root entries: ${extra.join(", ")}`)
    return false
  }
  return true
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