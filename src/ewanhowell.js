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
      images: config.images.map(e => e.file),
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
    const imgPath = path.join(sitePath, "images", "resourcepacks", config.id, "images")
    for (const img of config.images) {
      await sharp(path.join("./projects", config.id, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).webp({ quality: 95 }).toFile(path.join(imgPath, img.file + ".webp"))
    }
  }
}