import { getHtml } from "../src/puppeteer.js"
import "../src/main.js"

const projects = new Map

for (let page = 1; page < 40; page++) {
  const { status, html } = await getHtml(`https://www.planetminecraft.com/account/manage/texture-packs/?p=${page}`, auth.planetminecraft)

  if (status >= 400) {
    throw new Error(`Page ${page} returned ${status}`)
  }

  const $ = load(html)
  const found = []

  for (const row of Array.from($(".resource_item, .r-info, tr, li"))) {
    const $row = $(row)
    const manage = $row.find('a[href*="/account/manage/texture-packs/"]').attr("href")
    const view = $row.find('a[href^="/texture-pack/"]').attr("href")
    if (!manage || !view) continue
    const id = manage.match(/texture-packs\/(\d+)/)?.[1]
    const slug = view.match(/\/texture-pack\/([a-z0-9-]+)\//)?.[1]
    if (!id || !slug || projects.has(id)) continue
    projects.set(id, { id: parseInt(id), slug, title: $row.find("[data-title]").attr("data-title")?.replace(/ Minecraft $/, "") ?? slug })
    found.push(slug)
  }

  console.log(`page ${page}: ${found.length} new`)

  if (!found.length) break
}

const list = Array.from(projects.values()).sort((a, b) => a.slug.localeCompare(b.slug))
fs.writeFileSync("data/planetminecraft-index.json", JSON.stringify(list, null, 2))

console.log(`\n${list.length} projects indexed`)

await exit()
