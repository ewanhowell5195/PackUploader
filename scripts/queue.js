import "../src/main.js"

const queuePath = "data/queue.json"

if (!fs.existsSync(queuePath)) {
  console.log("You do not have a queue to process")
  process.exit()
}

console.log("Processing queue")

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"))

let planetminecraftStop
for (const entry of queue.slice()) {
  globalThis.project = JSON.parse(fs.readFileSync(`projects/${entry.id}/project.json`))
  globalThis.config = project.config

  if (entry.type === "planetminecraft") {
    if (planetminecraftStop) {
      continue
    }
    planetminecraftStop = await planetminecraft.queue(entry)
    if (planetminecraftStop) {
      continue
    }
  }

  queue.splice(queue.indexOf(entry), 1)
}

if (Array.isArray(queue) && queue.length === 0) {
  fs.unlinkSync(queuePath)
} else {
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2))
}

process.exit()