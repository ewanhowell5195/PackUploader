const sitePath = "E:/Programming/GitHub/ewanhowell/src/assets"

function error(err) {
  throw new Error(`Ewan Howell: ${err}`)
}

export default {
  async create() {
    if (fs.existsSync(path.join(sitePath, "json", "resourcepacks", config.id + ".json"))) {
      error("Pack already exists")
    }

    const imgPath = path.join(sitePath, "images", "resourcepacks", config.id)

    fs.mkdirSync(path.join(imgPath, "images"), { recursive: true })

    const data = {
      subtitle: config.summary,
      description: config.description.description.join("\n\n"),
      optifine: config.optifine ? config.optifine : undefined,
      video: config.video ? config.video : undefined,
      images: config.images.map(e => e.file),
      downloads: [{
        text: "Download",
        link: `https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}/`
      }]
    }

    fs.writeFileSync(path.join(sitePath, "json", "resourcepacks", config.id + ".json"), JSON.stringify(data, null, 2))

    await sharp("./upload/pack.png").resize(128, 128).webp({ quality: 95 }).toFile(path.join(imgPath, "icon.webp"))

    for (const img of config.images) {
      await sharp(path.join("./upload", "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).webp({ quality: 95 }).toFile(path.join(imgPath, "images", img.file + ".webp"))
    }

    console.log("Ewan Howell: Project fully created")
  }
}