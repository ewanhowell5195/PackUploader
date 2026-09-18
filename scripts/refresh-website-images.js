import "../src/main.js"

const site = "E:/Programming/GitHub/ewanhowell/src/assets/images/resourcepacks"
const apply = process.argv[2] === "apply"

async function pixels(input) {
  return sharp(input).resize(640, 360, { fit: "fill" }).removeAlpha().raw().toBuffer()
}

async function difference(a, b) {
  const x = await pixels(a)
  const y = await pixels(b)
  let total = 0
  for (let i = 0; i < x.length; i++) total += (x[i] - y[i]) ** 2
  return Math.sqrt(total / x.length)
}

let refreshed = 0
let skipped = 0

for (const id of fs.readdirSync("projects")) {
  const projectPath = path.join("projects", id)
  if (!fs.existsSync(path.join(projectPath, "project.json"))) continue
  const project = JSON.parse(fs.readFileSync(path.join(projectPath, "project.json")))

  for (const image of project.config.images) {
    const source = path.join(projectPath, "images", image.file + ".png")
    const target = path.join(site, id, "images", image.file + ".webp")
    if (!fs.existsSync(source) || !fs.existsSync(target)) continue

    const current = fs.readFileSync(target)
    const before = current.length

    // the source is not always the bigger image, and the site copy should never lose resolution
    const sourceSize = await sharp(source).metadata()
    const targetSize = await sharp(current).metadata()
    if (sourceSize.width < targetSize.width || sourceSize.height < targetSize.height) {
      console.log(`${(id + "/" + image.file).padEnd(44)} skipped, source is only ${sourceSize.width}x${sourceSize.height} against ${targetSize.width}x${targetSize.height}`)
      skipped++
      continue
    }
    const fresh = await sharp(source).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).webp({ quality: 95 }).toBuffer()

    // a website image already at this quality re-encodes to about the same size, so there is nothing to regain
    if (fresh.length < before * 1.3) {
      skipped++
      continue
    }

    const rms = await difference(source, current)
    if (apply) {
      await sharp(source).resize(1920, 1080, { fit: "inside", withoutEnlargement: true }).webp({ quality: 95 }).toFile(target)
    }
    const after = fresh.length

    console.log(`${(id + "/" + image.file).padEnd(44)} rms ${rms.toFixed(2).padStart(5)}   ${(before / 1024).toFixed(0).padStart(5)}KB -> ${(after / 1024).toFixed(0).padStart(5)}KB`)
    refreshed++
  }
}

console.log(`\n${refreshed} images ${apply ? "refreshed" : "would be refreshed"}, ${skipped} already match their source`)

await exit()
