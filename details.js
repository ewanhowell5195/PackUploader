import "./src/main.js"
import planetminecraft from "./src/planetminecraft.js"
import modrinth from "./src/modrinth.js"
import ewanhowell from "./src/ewanhowell.js"

globalThis.curseforge = (await import("./src/curseforge.js")).default
globalThis.data = (await import("./data/details.json", { with: { type: "json" } })).default

console.log(`Updating details for project: ${data.id}`)

// Setup

globalThis.projectPath = path.join("projects", data.id)

globalThis.project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

globalThis.config = project.config

// Reupload images

if (data.images) {
  for (const img of config.images) {
    img.buffer = await sharp(path.join("./projects", config.id, "images", img.file + ".png")).resize(1920, 1080, { fit: "inside" }).jpeg({ quality: 95 }).toBuffer()
  }

  // Remove images

  await curseforge.removeImages()
  console.log("CurseForge: Removed project images")

  await planetminecraft.removeImages()
  console.log("Planet Minecraft: Removed project images")

  await modrinth.removeImages()
  console.log("Modrinth: Removed project images")

  await ewanhowell.removeImages()
  console.log("Ewan Howell: Removed project images")

  // Upload images

  await curseforge.uploadImages()
  console.log("CurseForge: Added project images")

  await planetminecraft.uploadImages()
  console.log("Planet Minecraft: Added project images")

  await modrinth.uploadImages()
  console.log("Modrinth: Added project images")

  await ewanhowell.addImages()
  console.log("Ewan Howell: Added project images")
}

// Update details

await curseforge.setDetails()
console.log("CurseForge: Updated project details")

await planetminecraft.updateDetails()
console.log("Planet Minecraft: Updated project details")

await modrinth.setDetails(data.live)
console.log("Modrinth: Updated project details")

ewanhowell.writeDetails()
console.log("Ewan Howell: Updated project details")