const sitePath = "E:/Programming/GitHub/ewanhowell/src/assets"

function error(err) {
  throw new Error(`Ewan Howell: ${err}`)
}

export default {
  writeDetails() {
    const dataPath = path.join(sitePath, "json", "resourcepacks", project.config.id + ".json")
    
    let data = {}
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath))
    }

    data.subtitle = project.config.summary
    data.description = project.config.description.join("\n\n")
    data.optifine = project.config.optifine || undefined
    data.video = project.config.video || undefined
    data.images = project.config.images.filter(e => !e.thumbnail && !e.logo).map(e => e.file)
    data.downloads ??= []
    data.downloads[0] = {
      text: "Download",
      link: `https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}/`
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
  },
  removeImages() {
    const imgPath = path.join(sitePath, "images", "resourcepacks", project.config.id, "images")
    fs.readdirSync(imgPath).forEach(f => fs.unlinkSync(path.join(imgPath, f)))
  },
  async addImages() {
    const imgPath = path.join(sitePath, "images", "resourcepacks", project.config.id)
    fs.mkdirSync(path.join(imgPath, "images"), { recursive: true })

    for (const img of project.config.images) {
      if (img.thumbnail || img.logo) continue
      await sharp(path.join("projects", project.config.id, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).webp({ quality: 95 }).toFile(path.join(imgPath, "images", img.file + ".webp"))
    }

    const iconPath = path.join("projects", project.config.id, "pack.png")
    if (fs.existsSync(iconPath)) {
      await sharp(iconPath).resize(128, 128, { withoutEnlargement: true }).webp({ quality: 95, withoutEnlargement: true }).toFile(path.join(imgPath, "icon.webp"))
    }

    const logoPath = path.join("projects", project.config.id, "logo.png")
    if (fs.existsSync(logoPath)) {
      await sharp(logoPath).resize(1280, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 95 }).toFile(path.join(imgPath, "logo.webp"))
    }

    const thumbnailPath = path.join("projects", project.config.id, "thumbnail.png")
    if (fs.existsSync(thumbnailPath)) {
      await sharp(thumbnailPath).resize(1280, 720, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95 }).toFile(path.join(imgPath, "cover.jpg"))
    }
  },
  async import() {
    const resourcePacks = JSON.parse(fs.readFileSync(path.join(sitePath, "json", "resourcepacks.json")))
    const info = resourcePacks.categories.flatMap(e => e.entries).find(e => e.id === config.id)
    const data = JSON.parse(fs.readFileSync(path.join(sitePath, "json", "resourcepacks", config.id + ".json")))
    config.name = info.name ?? info.id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    config.summary = data.subtitle
    config.description = data.description.split("\n")
    config.optifine = data.optifine ?? false
    config.video = data.video ?? false
    const repoName = config.id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("")
    const res = await fetch(`https://github.com/ewanhowell5195/${repoName}`, { redirect: "manual" })
    config.github = res.headers.get("location") || (res.ok ? `https://github.com/ewanhowell5195/${repoName}` : false)
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
      await sharp(path.join(sitePath, "images", "resourcepacks", config.id, "images", img.file + ".webp")).png().toFile(path.join(projectPath, "images", img.file + ".png"))
    }
    const logoPath = path.join(sitePath, "images", "resourcepacks", config.id, "logo.webp")
    if (fs.existsSync(logoPath)) {
      await sharp(logoPath).png().toFile(path.join(projectPath, "logo.png"))
    }
  }
}