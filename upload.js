import settings from "./settings.json" assert { type: "json" }
import config from "./upload/config.json" assert { type: "json" }
import { load } from "cheerio"
import path from "node:path"
import fs from "node:fs"

function makeForm(data) {
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

config.name += " " + Math.random()

// Setup

const projectPath = path.join("projects", config.id)

// const project = JSON.parse(fs.readFileSync(projectPath + "/project.json"))

if (fs.existsSync(projectPath)) {
  throw new Error(`Project "${config.id}" already exists`)
}

fs.mkdirSync(projectPath)

const project = {
  config,
  curseforge: {},
  planetminecraft: {},
  modrinth: {}
}

function save() {
  fs.writeFileSync(path.join(projectPath, "project.json"), JSON.stringify(project, null, 2))
}

// CurseForge

// CurseForge Icon Upload

const cfIconForm = new FormData()
cfIconForm.append("file", new Blob([fs.readFileSync("upload/icon.png")], {
  type: "image/png"
}), "icon.png")

const cfIconRequest = await fetch("https://authors.curseforge.com/_api/projects/null/upload-avatar", {
  method: "POST",
  headers: {
    cookie: settings.auth.curseforge.cookie
  },
  body: cfIconForm
})

if (!cfIconRequest.ok) {
  throw new Error("CurseForge: Icon upload failed " + await cfIconRequest.text())
}

const iconURL = await cfIconRequest.text()

console.log("CurseForge: Icon uploaded")

// CurseForge Project Creation

const cfProjectCreationRequest = await fetch("https://authors.curseforge.com/_api/projects", {
  method: "POST",
  headers: {
    cookie: settings.auth.curseforge.cookie,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: config.name,
    avatarUrl: iconURL,
    summary: config.summary,
    description: "placeholder",
    primaryCategoryId: 393,
    subCategoryIds: [405],
    allowComments: true,
    allowDistribution: false,
    gameId: 432,
    classId: 12,
    descriptionType: 1,
    licenseId: 1
  })
})

if (!cfProjectCreationRequest.ok) {
  throw new Error("CurseForge: Project creation failed " + await cfProjectCreationRequest.text())
}

project.curseforge.id = await cfProjectCreationRequest.json().then(e => e.id)

save()

console.log("CurseForge: Project created")

// CurseForge Get Project Details

const cfProjectRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}`, {
  headers: {
    cookie: settings.auth.curseforge.cookie
  }
})

if (!cfProjectRequest.ok) {
  throw new Error("CurseForge: Failed getting project details" + await cfProjectRequest.text())
}

const cfProjectDetails = await cfProjectRequest.json()

project.curseforge.slug = cfProjectDetails.slug

save()

console.log(`CurseForge: Project URL: https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}`)

// CurseForge Get Version Ids

const cfVersionsRequest = await fetch(`https://authors.curseforge.com/_api/project-files/${project.curseforge.id}/create-project-file-form-data`, {
  headers: {
    cookie: settings.auth.curseforge.cookie
  }
})

if (!cfVersionsRequest.ok) {
  throw new Error("CurseForge: Failed getting version list" + await cfVersionsRequest.text())
}

const cfVersions = await cfVersionsRequest.json().then(e => e[0].flatMap(e => e.choices))

const cfProjectVersions = []

if (config.versions.curseforge.type === "latest") {
  if (config.versions.curseforge.snapshots) {
    cfProjectVersions.push(cfVersions[0].id)
  } else {
    cfProjectVersions.push(cfVersions.find(e => !e.name.endsWith("Snapshot")).id)
  }
}

// CurseForge Pack Upload

await new Promise(fulfil => setTimeout(fulfil, 5000))

const cfPackForm = new FormData()
cfPackForm.append("file", new Blob([fs.readFileSync("upload/pack.zip")], {
  type: "application/zip"
}), "pack.zip")
cfPackForm.append("metadata", JSON.stringify({
  displayName: `${config.name} - v${config.version}`,
  changelog: "Initial release",
  gameVersions: cfProjectVersions,
  releaseType: "release"
}))

const cfPackUploadRequest = await fetch(`https://minecraft.curseforge.com/api/projects/${project.curseforge.id}/upload-file`, {
  method: "POST",
  headers: {
    "X-Api-Token": settings.auth.curseforge.token
  },
  body: cfPackForm
})

if (!cfPackUploadRequest.ok) {
  throw new Error("CurseForge: Failed to upload pack " + await cfPackUploadRequest.text())
}

console.log("CurseForge: Pack uploaded")

// CurseForge Image Uploads

const cfImageForm = new FormData()
for (const image of config.images) {
  cfImageForm.append("id", project.curseforge.id)
  cfImageForm.append("files", new Blob([fs.readFileSync(path.join("upload", "images", image.file + ".png"))], {
    type: "image/png"
  }), image.file + ".png")
}

const cfImagesRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}`, {
  method: "POST",
  headers: {
    cookie: settings.auth.curseforge.cookie
  },
  body: cfImageForm
})

if (!cfImagesRequest.ok) {
  throw new Error("CurseForge: Image upload failed " + await cfImagesRequest.text())
}

const cfUploadedImages = await cfImagesRequest.json().then(e => e.results)

console.log("CurseForge: Images uploaded")

// CurseForge Get Images

const cfImageDataRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}?filter=%7B%7D&range=%5B0%2C24%5D&sort=%5B%22id%22%2C%22DESC%22%5D`, {
  headers: {
    cookie: settings.auth.curseforge.cookie
  }
})

if (!cfImageDataRequest.ok) {
  throw new Error("CurseForge: Failed to get image data " + await cfImageDataRequest.text())
}

const cfImageData = await cfImageDataRequest.json()

// CurseForge Modify Images

for (const data of cfUploadedImages) {
  if (data.success) {
    const image = config.images.find(e => e.file === data.fileName)
    const id = cfImageData.find(e => e.title === image.file + ".png").id
    const r = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}`, {
      method: "PUT",
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: image.name,
        description: image.description,
        id,
        isFeatured: true
      })
    })
    if (!r.ok) {
      console.error(`CurseForge: Failed to update metadata for image "${data.fileName}" ` + await r.text())
    } else {
      console.log(`CurseForge: Updated metadata for image "${data.fileName}"`)
    }
  } else {
    console.error(`CurseForge: Image "${data.fileName}" failed to upload`)
  }
}

// CurseForge Set GitHub Repo

if (config.github) {
  const r = await fetch(`https://authors.curseforge.com/_api/project-source/${project.curseforge.id}/update`, {
    method: "PUT",
    headers: {
      cookie: settings.auth.curseforge.cookie,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceHostUrl: config.github,
      sourceHost: 3,
      packagerMode: 1
    })
  })
  if (!r.ok) {
    throw new Error("CurseForge: Failed to set GitHub link " + await r.text())
  }
  console.log("CurseForge: GitHub link set")
}

// CurseForge Write Description

let cfHTML = fs.readFileSync("templates/curseforge.html", "utf-8")
const cfReplacements = cfHTML.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

for (const replacement of cfReplacements) {
  let str = ""
  if (replacement[1] === "description") {
    for (const part of config.description.description) {
      str += `<p>${part}</p>`
    }
  } else if (replacement[1] === "images") {
    const images = config.images.filter(e => e.embed)
    for (const image of images) {
      str += `<br><img src="${cfImageData.find(e => e.title === image.file + ".png").imageUrl}" width="600" alt="${image.name}"><br>`
    }
  } else if (replacement[1] === "video") {
    if (config.video) {
      str = `<br><br><iframe src="https://www.youtube.com/embed/${config.video}" width="600" height="336" allowfullscreen="allowfullscreen"></iframe><br>`
    }
  } else {
    str = config.description[replacement[1]] ?? config[replacement[1]]
    if (typeof str !== "string") {
      str = "undefined"
    }
  }
  cfHTML = cfHTML.replaceAll(replacement[0], str)
}

const cfDescriptionRequest = await fetch(`https://authors.curseforge.com/_api/projects/description/${project.curseforge.id}`, {
  method: "PUT",
  headers: {
    cookie: settings.auth.curseforge.cookie,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    description: cfHTML,
    descriptionType: 1
  })
})

if (!cfDescriptionRequest.ok) {
  throw new Error("CurseForge: Failed to write description " + await cfDescriptionRequest.text())
}

console.log("CurseForge: Written description")

console.log("CurseForge: Project fully created")

// Planet Minecraft

// Planet Minecraft Get New Project

const pmcNewProjectRequest = await fetch("https://www.planetminecraft.com/account/manage/texture-packs/item/new", {
  headers: {
    cookie: settings.auth.planetminecraft.cookie
  }
})

if (!pmcNewProjectRequest.ok) {
  throw new Error("Planet Minecraft: Failed to get a new project " + await pmcNewProjectRequest.text())
}

const pmcPage = load(await pmcNewProjectRequest.text())

project.planetminecraft.id = parseInt(pmcPage("[name=resource_id]").val())

save()

console.log("Planet Minecraft: Fetched new project")

// Planet Minecraft Upload Images

const pmcCreateImageForm = makeForm({
  module: "tools/media",
  myaction: "create",
  modern: true,
  media_id: "new",
  media_key: "image_key",
  connect_id: project.planetminecraft.id
})

for (const image of config.images) {
  const r = await fetch("https://www.planetminecraft.com/ajax.php", {
    method: "POST",
    headers: {
      "x-pmc-csrf-token": settings.auth.planetminecraft.token,
      cookie: settings.auth.planetminecraft.cookie,
      Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
    },
    body: pmcCreateImageForm
  }).then(e => e.json())
  if (!r.media_id) {
    throw new Error(`Planet Minecraft: Failed to create image "${image.file}" ` + JSON.stringify(r))
  }
  const imageForm = makeForm({
    module: "tools/media",
    myaction: "save",
    modern: true,
    media_id: r.media_id,
    media_key: "image_key",
    connect_id: project.planetminecraft.id,
    title: `${image.name} - ${image.description}`
  })
  imageForm.append("filename", new Blob([fs.readFileSync(path.join("upload", "images", image.file + ".png"))], {
    type: "image/png"
  }), image.file + ".png")
  const r2 = await fetch("https://www.planetminecraft.com/ajax.php", {
    method: "POST",
    headers: {
      "x-pmc-csrf-token": settings.auth.planetminecraft.token,
      cookie: settings.auth.planetminecraft.cookie,
      Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
    },
    body: imageForm
  }).then(e => e.json())
  if (r2.status !== "success") {
    throw new Error(`Planet Minecraft: Failed to upload image "${image.file}" ` + JSON.stringify(r2))
  }
  console.log(`Planet Minecraft: Uploaded image "${image.file}"`)
}

// Planet Minecraft Get Tags

const pmcTags = []

for (const tag of config.planetminecraft.tags) {
  const r = await fetch("https://www.planetminecraft.com/ajax.php", {
    method: "POST",
    headers: {
      "x-pmc-csrf-token": settings.auth.planetminecraft.token,
      cookie: settings.auth.planetminecraft.cookie,
      Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
    },
    body: makeForm({
      module: "tools/tags",
      target_type: "resource",
      item_subject: 4,
      target_id: project.planetminecraft.id,
      term: tag,
      action: "tagAdd"
    })
  }).then(e => e.json())
  if (r.status !== "success") {
    throw new Error(`Planet Minecraft: Failed to get tag "${tag}" ` + JSON.stringify(r))
  }
  pmcTags.push(load(r.tag_html)(".tag").attr("data-tag-id"))
  console.log(`Planet Minecraft: Fetched tag "${tag}"`)
}

// Planet Minecraft Create Project

let pmcBBCODE = fs.readFileSync("templates/planetminecraft.bbcode", "utf-8")
const pmcReplacements = pmcBBCODE.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

for (const replacement of pmcReplacements) {
  let str = ""
  if (replacement[1] === "description") {
    str = config.description.description.join("\n\n")
  } else if (replacement[1] === "images") {
    const images = config.images.filter(e => e.embed)
    const imageList = []
    for (const image of images) {
      imageList.push(`[img width=600 height=338]${cfImageData.find(e => e.title === image.file + ".png").imageUrl}[/img]`)
    }
    str = imageList.join("\n\n")
  } else {
    str = config.description[replacement[1]] ?? config[replacement[1]]
    if (typeof str !== "string") {
      str = "undefined"
    }
  }
  pmcBBCODE = pmcBBCODE.replaceAll(replacement[0], str)
}

const pmcForm = makeForm({
  member_id: pmcPage("[name=member_id]").val(),
  resource_id: project.planetminecraft.id,
  subject_id: pmcPage("[name=subject_id]").val(),
  group: pmcPage("[name=group]").val(),
  module: pmcPage("[name=module]").val(),
  module_task: pmcPage("[name=module_task]").val(),
  server_id: "",
  title: config.name,
  op0: 1, // Resolution
  progress: 100,
  youtube: config.video,
  description: pmcBBCODE,
  wid1: 1,
  wfile1: 1,
  wurl1: "https://www.mediafire.com/file/f7l1zwp35qpwhqi/F8thful_-_v0.6.zip/file",
  wtitle1: "Download here",
  wid0: 0,
  wfile0: 0,
  wurl0: "https://www.mediafire.com/",
  wtitle0: "My Website",
  credit: "",
  item_tag: "",
  tag_ids: pmcTags.join(),
  allowcomments: 1,
  saved_data: ""
})

pmcForm.append("folder_id[]", 27) // Other category

const pmcVersions = pmcPage("#op1 option").map((_, option) => ({
  id: pmcPage(option).val(),
  name: pmcPage(option).text().slice(10)
})).get().filter(e => e.name !== "Bedrock" && e.name !== "Dungeons")

if (config.versions.planetminecraft.type === "latest") {
  pmcForm.append("op1", pmcVersions[0].id) // Minecraft version number
}

const pmcModifies = {
  armor: 37,
  art: 35,
  environment: 30,
  font: 31,
  gui: 34,
  items: 33,
  misc: 38,
  mobs: 36,
  particles: 41,
  terrain: 32,
  audio: 152,
  models: 153
}

for (const [item, on] of Object.entries(config.planetminecraft.modifies)) {
  if (!on) continue
  pmcForm.append("folder_id[]", pmcModifies[item]) // Modifies content section
}

const pmcProjectRequest = await fetch("https://www.planetminecraft.com/ajax.php", {
  method: "POST",
  headers: {
    "x-pmc-csrf-token": settings.auth.planetminecraft.token,
    cookie: settings.auth.planetminecraft.cookie,
    Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
  },
  body: pmcForm
}).then(e => e.json())

if (pmcProjectRequest.status !== "success") {
  throw new Error("Planet Minecraft: Failed to create project " + JSON.stringify(pmcProjectRequest))
}

project.planetminecraft.slug = pmcProjectRequest.forward.split("/")[1]

save()

console.log(`Planet Minecraft: Project URL: https://www.planetminecraft.com/texture-pack/${project.planetminecraft.slug}`)
console.log("Planet Minecraft: Project fully created")

// Modrinth

// Modrinth Create Project

const mrProjectForm = makeForm({
  data: {
    slug: config.id + Math.random(),
    title: config.name,
    description: config.summary,
    categories: Object.entries(config.modrinth.tags).filter(e => e[1] === "featured").map(e => e[0]),
    additional_categories: Object.entries(config.modrinth.tags).filter(e => e[1] && e[1] !== "featured").map(e => e[0]),
    client_side: "required",
    server_side: "unsupported",
    body: "placeholder",
    issues_url: config.github,
    source_url: config.github,
    discord_url: config.discord,
    license_id: "LicenseRef-All-Rights-Reserved",
    project_type: "resourcepack",
    is_draft: true,
    initial_versions: []
  }
})

mrProjectForm.append("icon", new Blob([fs.readFileSync("upload/icon.png")], {
  type: "image/png"
}), "icon.png")

const mrProjectRequest = await fetch("https://api.modrinth.com/v2/project", {
  method: "POST",
  headers: {
    Authorization: settings.auth.modrinth
  },
  body: mrProjectForm
}).then(e => e.json())

if (mrProjectRequest.error) {
  throw new Error(`Modrinth: Failed to create project: ${JSON.stringify(mrProjectRequest)}`)
}

project.modrinth.id = mrProjectRequest.id
project.modrinth.slug = mrProjectRequest.slug

save()

console.log("Modrinth: Project created")
console.log(`Modrinth: Project URL: https://modrinth.com/project/${project.modrinth.slug}`)

// Modrinth Create Version

let mrVersionsRequest = await fetch("https://api.modrinth.com/v2/tag/game_version").then(e => e.json())

if (!config.versions.modrinth.snapshots) {
  mrVersionsRequest = mrVersionsRequest.filter(e => e.version_type === "release")
}

const mrVersions = []

if (config.versions.modrinth.type === "latest") {
  mrVersions.push(mrVersionsRequest[0].version)
}

const mrPackForm = makeForm({
  data: {
    name: config.name,
    version_number: config.version,
    changelog: "Initial release",
    dependencies: [],
    game_versions: mrVersions,
    version_type: "release",
    loaders: ["minecraft"],
    featured: false,
    project_id: project.modrinth.id,
    file_parts: ["file"],
    primary_file: "file"
  }
})

mrPackForm.append("file", new Blob([fs.readFileSync("upload/pack.zip")], {
  type: "application/zip"
}), "pack.zip")

const mrPackRequest = await fetch("https://api.modrinth.com/v2/version", {
  method: "POST",
  headers: {
    Authorization: settings.auth.modrinth
  },
  body: mrPackForm
}).then(e => e.json())

if (mrPackRequest.error) {
  throw new Error(`Modrinth: Failed to upload pack: ${JSON.stringify(mrPackRequest)}`)
}

console.log("Modrinth: Pack uploaded")

// Modrinth Gallery Images

for (const [i, image] of config.images.entries()) {
  const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/gallery?ext=png&featured=${!!image.featured}&title=${encodeURIComponent(image.name)}&description=${encodeURIComponent(image.description)}&ordering=${i}`, {
    method: "POST",
    headers: {
      Authorization: settings.auth.modrinth,
      "Content-Type": "image/png"
    },
    body: new Blob([fs.readFileSync(path.join("upload", "images", image.file + ".png"))], {
      type: "image/png"
    })
  })
  if (!r.ok) {
    throw new Error(`Modrinth: Failed to upload image "${image.file}" ` + await r.text())
  }
  console.log(`Modrinth: Uploaded image "${image.file}"`)
}

// Modrinth Write Description, Donation Links, and Submit

const mrGalleryRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.slug}`, {
  headers: {
    Authorization: settings.auth.modrinth
  }
}).then(e => e.json())

let mrMarkdown = fs.readFileSync("templates/modrinth.md", "utf-8")
const mrReplacements = mrMarkdown.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

for (const replacement of mrReplacements) {
  let str = ""
  if (replacement[1] === "description") {
    for (const part of config.description.description) {
      str += part + "\n\n"
    }
    str = str.trim()
  } else if (replacement[1] === "images") {
    const images = config.images.filter(e => e.embed)
    for (const image of images) {
      str += `<img src="${mrGalleryRequest.gallery.find(e => e.title === image.name).url}" width="600" alt="${image.name}"><br><br>\n`
    }
    str = str.trim()
  } else if (replacement[1] === "video") {
    if (config.video) {
      str = `<iframe src="https://www.youtube.com/embed/${config.video}" width="600" height="336" allowfullscreen="allowfullscreen"></iframe><br><br><br>\n\n`
    }
  } else {
    str = config.description[replacement[1]] ?? config[replacement[1]]
    if (typeof str !== "string") {
      str = "undefined"
    }
  }
  mrMarkdown = mrMarkdown.replaceAll(replacement[0], str)
}

const mrDescriptionRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.slug}`, {
  method: "PATCH",
  headers: {
    Authorization: settings.auth.modrinth,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    body: mrMarkdown,
    donation_urls: config.kofi ? [{
      id: "ko-fi",
      platform: "Ko-fi",
      url: config.kofi
    }] : undefined,
    requested_status: "approved",
    status: "processing"
  })
})

if (!mrDescriptionRequest.ok) {
  throw new Error(`Modrinth: Failed to write Description, donation links, and submit: ${await mrDescriptionRequest.text()}`)
}

console.log("Modrinth: Written description, donation links, and submitted")
console.log("Modrinth: Project fully created")