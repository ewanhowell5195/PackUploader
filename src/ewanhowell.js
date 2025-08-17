const sitePath = "E:/Programming/GitHub/ewanhowell/src/assets"

function error(err) {
  throw new Error(`Ewan Howell: ${err}`)
}

export default {
  async createPack() {
    const imgPath = path.join(sitePath, "images", "resourcepacks", config.id)

    fs.mkdirSync(path.join(imgPath, "images"), { recursive: true })

    this.writeDetails()

    await sharp(path.join("./projects", config.id, "pack.png")).resize(128, 128).webp({ quality: 95 }).toFile(path.join(imgPath, "icon.webp"))

    if (config.logo) {
      await sharp(path.join("./projects", config.id, "logo.png")).resize(1280, 256, { fit: "inside" }).webp({ quality: 100 }).toFile(path.join(imgPath, "logo.webp"))
    }
  },
  writeDetails() {
    const data = {
      subtitle: config.summary,
      description: config.description.join("\n\n"),
      optifine: config.optifine ? config.optifine : undefined,
      video: config.video ? config.video : undefined,
      images: config.images.map(e => e.file).filter(e => e !== "thumbnail"),
      downloads: [{
        text: "Download",
        link: `https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}/`
      }]
    }

    fs.writeFileSync(path.join(sitePath, "json", "resourcepacks", config.id + ".json"), JSON.stringify(data, null, 2))
  },
  removeImages() {
    const imgPath = path.join(sitePath, "images", "resourcepacks", config.id, "images")
    fs.readdirSync(imgPath).forEach(f => fs.unlinkSync(path.join(imgPath, f)))
  },
  async addImages() {
    for (const img of config.images) {
      if (img.thumbnail) continue
      await sharp(path.join("./projects", config.id, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).webp({ quality: 95 }).toFile(path.join(sitePath, "images", "resourcepacks", config.id, "images", img.file + ".webp"))
    }
  },
  async loadDetails() {
    const resourcePacks = JSON.parse(fs.readFileSync(path.join(sitePath, "json", "resourcepacks.json")))
    const info = resourcePacks.categories.flatMap(e => e.entries).find(e => e.id === config.id)
    const data = JSON.parse(fs.readFileSync(path.join(sitePath, "json", "resourcepacks", config.id + ".json")))
    config.name = info.name ?? info.id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    config.summary = data.subtitle
    config.logo = !info.logoless
    config.description = data.description.split("\n")
    config.optifine = data.optifine
    config.video = data.video
    const repoName = config.id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    const res = await fetch(`https://github.com/ewanhowell5195/${repoName}`, { redirect: "manual" })
    config.github = res.headers.get("location") || (res.ok ? `https://github.com/ewanhowell5195/${repoName}` : false)
    config.version = "1.0.0"
    config.versions = {
      curseforge: {
        type: "after",
        version: info.versions[0],
        snapshots: false
      },
      planetminecraft: {
        type: "latest"
      },
      modrinth: {
        type: "after",
        version: info.versions[0],
        snapshots: false
      }
    }
    config.images = data.images.map((e, i) => ({
      name: e.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      description: e.split("_").join(" ").replace(/^./, c => c.toUpperCase()),
      file: e,
      embed: i < 3 ? true : undefined,
      featured: info.image === e ? true : undefined
    }))
    if (!config.images.some(e => e.featured)) {
      config.images[0].featured = true
    }
    for (const img of config.images) {
      await sharp(path.join(sitePath, "images", "resourcepacks", config.id, "images", img.file + ".webp")).png().toFile(path.join("./projects", config.id, "images", img.file + ".png"))
    }
  }
}