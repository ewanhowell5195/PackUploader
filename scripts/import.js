import "../src/main.js"

const importData = JSON.parse(fs.readFileSync("./data/import.json"))

globalThis.config = {
  id: importData.id,
  name: "",
  summary: "",
  description: [],
  optifine: false,
  video: false,
  github: false,
  version: "1.0.0",
  versions: {
    curseforge: {
      "type": "latest",
      "snapshots": false
    },
    planetminecraft: {
      "type": "latest"
    },
    modrinth: {
      "type": "latest",
      "snapshots": false
    }
  },
  images: [],
  curseforge: {
    mainCategory: "16x",
    additionalCategories: {
      animated: 0,
      dataPacks: 0,
      fontPacks: 0,
      medieval: 0,
      modSupport: 0,
      modern: 0,
      photoRealistic: 0,
      traditional: 0,
      miscellaneous: true
    },
    license: "All Rights Reserved"
  },
  planetminecraft: {
    category: "Other",
    resolution: 16,
    progress: 100,
    credit: "",
    modifies: {
      armor: 0,
      art: 0,
      environment: 0,
      font: 0,
      gui: 0,
      items: 0,
      misc: 0,
      mobs: 0,
      particles: 0,
      terrain: 0,
      audio: 0,
      models: 0
    },
    tags: []
  },
  modrinth: {
    tags: {
      "8x-": 0,
      "16x": 0,
      "32x": 0,
      "48x": 0,
      "64x": 0,
      "128x": 0,
      "256x": 0,
      "512x+": 0,
      audio: 0,
      blocks: 0,
      combat: 0,
      "core-shaders": 0,
      cursed: 0,
      decoration: 0,
      entities: 0,
      environment: 0,
      equipment: 0,
      fonts: 0,
      gui: 0,
      items: 0,
      locale: 0,
      modded: 0,
      models: 0,
      realistic: 0,
      simplistic: 0,
      themed: 0,
      tweaks: 0,
      utility: 0,
      "vanilla-like": 0
    },
    license: "All Rights Reserved/No License"
  }
}

globalThis.project = {
  config,
  curseforge: importData.curseforge,
  planetminecraft: importData.planetminecraft,
  modrinth: importData.modrinth,
  ewanhowell: importData.ewanhowell
}

globalThis.projectPath = path.join("projects", config.id)

if (fs.existsSync(projectPath)) {
  console.error(`Error: "${config.id}" is already exists`)
  process.exit()
} else {
  fs.mkdirSync(path.join(projectPath, "images"), { recursive: true })
}

// Copying

const templates = path.join(projectPath, "templates")
fs.mkdirSync(templates)
for (const entry of fs.readdirSync("templates")) {
  if (entry === "snippets") continue
  const src = path.join("templates", entry)
  const dest = path.join(templates, entry)
  fs.cpSync(src, dest)
}

// CurseForge

if (settings.ewan && !project.ewanhowell?.ignore) {
  if (project.curseforge.id) {
    await curseforge.import()
    save()
    console.log("CurseForge: Imported project")
  }
  await ewanhowell.import()
  save()
  console.log("Ewan Howell: Imported project")
} else if (project.curseforge.id) {
  await curseforge.import()
  save()
  console.log("CurseForge: Imported project")
}

// Modrinth

if (project.modrinth.id) {
  await modrinth.import()
  save()
  console.log("Modrinth: Imported project")
}

// Planet Minecraft

if (project.planetminecraft.id) {
  await planetminecraft.import()
  save()
  console.log("Planet Minecraft: Imported project")
}

console.log(`Project fully imported "${config.id}"`)

process.exit()