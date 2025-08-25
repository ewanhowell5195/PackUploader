import { JSDOM } from "jsdom"

let token

function log(message) {
  console.log(`Planet Minecraft: ${message}`)
}

function error(err, res, crash = true) {
  if (!crash) {
    if (typeof res === "string") {
      console.error(`Planet Minecraft: ${err} - ${res}`)
    } else {
      console.error(`Planet Minecraft: ${err} - ${JSON.stringify(res)}`)
    }
    return
  }
  if (typeof res === "string") {
    throw new Error(`Planet Minecraft: ${err} - ${res}`)
  } else {
    throw new Error(`Planet Minecraft: ${err} - ${JSON.stringify(res)}`)
  }
}

function ratelimited(r) {
  if (r.status === 302) {
    throw new Error(`Planet Minecraft: You are ratelimited, or your authentication has expired`)
  }
}

async function request(body, referrer, json = true) {
  referrer ??= project.planetminecraft.id
  const r = await fetch("https://www.planetminecraft.com/ajax.php", {
    method: "POST",
    headers: {
      "x-pmc-csrf-token": token,
      cookie: auth.planetminecraft,
      Referer: `https://www.planetminecraft.com/account/manage/texture-packs/${referrer}`
    },
    body
  })

  if (!r.ok) {
    error(`Failed request`, await r.text())
  }

  if (json) {
    return r.json()
  }
  return r
}

const resolutions = {
  "8": 6,
  "16": 1,
  "32": 2,
  "64": 3,
  "128": 4,
  "256": 5,
  "512": 7,
  "1024": 8,
  "2048": 9,
  "4096": 10
}

const categories = {
  Experimental: 26,
  PvP: 154,
  Realistic: 25,
  Simplistic: 23,
  Themed: 24,
  Unreleased: 86,
  Other: 27
}

export default {
  async getProject() {
    const projectRequest = await fetch(`https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`, {
      headers: {
        "cache-control": "no-cache",
        cookie: auth.planetminecraft
      },
      redirect: "manual"
    })

    ratelimited(projectRequest)

    if (!projectRequest.ok) {
      error("Failed to fetch project", await projectRequest.text())
    }

    const $ = load(await projectRequest.text())

    token = $("#core-csrf-token").attr("content")

    return $
  },
  async getProjectDom() {
    const projectRequest = await fetch(`https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`, {
      headers: {
        "cache-control": "no-cache",
        cookie: auth.planetminecraft
      },
      redirect: "manual"
    })

    ratelimited(projectRequest)

    if (!projectRequest.ok) {
      error("Failed to fetch project", await projectRequest.text())
    }

    const document = new JSDOM(await projectRequest.text()).window.document

    token = document.getElementById("core-csrf-token").getAttribute("content")

    return document
  },
  async createProject() {
    // Get New Project

    const newProjectRequest = await fetch("https://www.planetminecraft.com/account/manage/texture-packs/item/new", {
      headers: {
        "cache-control": "no-cache",
        cookie: auth.planetminecraft
      },
      redirect: "manual"
    })

    ratelimited(newProjectRequest)

    if (!newProjectRequest.ok) {
      error("Failed to fetch a new project", await newProjectRequest.text())
    }

    const $ = load(await newProjectRequest.text())

    token = $("#core-csrf-token").attr("content")

    project.planetminecraft.id = parseInt($("[name=resource_id]").val())

    save()

    log("Fetched new project")

    // Get Tags

    const tags = []

    for (const tag of project.config.planetminecraft.tags) {
      const r = await request(makeForm({
        module: "tools/tags",
        target_type: "resource",
        item_subject: 4,
        target_id: project.planetminecraft.id,
        term: tag,
        action: "tagAdd"
      }), "item/new")
      if (r.status !== "success") {
        error(`Failed to get tag "${tag}"`, r)
      }
      tags.push(load(r.tag_html)(".tag").attr("data-tag-id"))
      log(`Fetched custom tag "${tag}"`)
    }

    await this.uploadImages()

    // Create Project

    const r = await request(await this.createForm($, tags), "item/new")
    if (r.status !== "success") {
      error("Failed to create project", r)
    }

    project.planetminecraft.slug = r.forward.split("/")[1]

    save()

    log(`Project URL: https://www.planetminecraft.com/texture-pack/${project.planetminecraft.slug}`)
  },
  async createForm($, tags, keepVersion) {
    let downloadLink
    if (settings.ewan && !project.ewanhowell?.ignore) {
      downloadLink = `https://ewanhowell.com/resourcepacks/${project.config.id}`
    } else if (project.modrinth.id && settings.planetminecraft.prefer === "modrinth") {
      downloadLink = `https://modrinth.com/resourcepack/${project.modrinth.slug}`
    } else if (project.curseforge.id) {
      downloadLink = `https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}`
    } else {
      downloadLink = `https://modrinth.com/resourcepack/${project.modrinth.slug}`
    }

    const form = makeForm({
      member_id: $("[name=member_id]").val(),
      resource_id: project.planetminecraft.id,
      subject_id: $("[name=subject_id]").val(),
      group: $("[name=group]").val(),
      module: $("[name=module]").val(),
      module_task: $("[name=module_task]").val(),
      server_id: "",
      title: project.config.name,
      op0: resolutions[project.config.planetminecraft.resolution] ?? 1,
      progress: project.config.planetminecraft.progress ?? 100,
      youtube: project.config.video ? project.config.video : undefined,
      description: await this.getDescription(),
      wid1: 1,
      wfile1: 1,
      wurl1: downloadLink,
      wtitle1: "Download here",
      wid0: 0,
      wfile0: 0,
      wurl0: settings.planetminecraft.website.link,
      wtitle0: settings.planetminecraft.website.title,
      credit: project.config.planetminecraft.credit ?? "",
      item_tag: "",
      tag_ids: tags.join(),
      allowcomments: 1,
      saved_data: "",
      "folder_id[]": categories[project.config.planetminecraft.category] ?? 27
    })

    // Minecraft version number
    if (keepVersion) {
      form.append("op1", $("#op1").val())
    } else {
      const versions = $("#op1 option").map((_, option) => ({
        id: $(option).val(),
        name: $(option).text().slice(10)
      })).get().filter(e => e.name !== "Bedrock" && e.name !== "Dungeons")

      switch (project.config.versions.planetminecraft.type) {
        case "latest":
          form.append("op1", versions[0].id)
          break
        case "exact":
          form.append("op1", versions.find(e => e.name === project.config.versions.planetminecraft.version).id)
          break
      }
    }

    const modifies = {
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

    for (const [item, on] of Object.entries(project.config.planetminecraft.modifies)) {
      if (!on) continue
      form.append("folder_id[]", modifies[item]) // Modifies content section
    }

    return form
  },
  async uploadImages() {
    const form = makeForm({
      module: "tools/media",
      myaction: "create",
      modern: true,
      media_id: "new",
      media_key: "image_key",
      connect_id: project.planetminecraft.id
    })

    if (project.config.images.length > 15) {
      console.error(`Too many images! Planet Minecraft supports a maximum of 15 images. Some will not be uploaded`)
    }

    let i = 0
    for (const image of project.config.images) {
      if (image.logo && ((settings.ewan && !project.ewanhowell?.ignore) || project.curseforge.id || project.modrinth.id)) continue
      if (i > 14) break
      i++
      const r = await request(form, "item/new")
      if (!r.media_id) {
        error(`Failed to create image "${image.file}"`, r)
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
      imageForm.append("filename", new Blob([image.buffer], {
        type: "image/jpeg"
      }), image.file + ".jpg")
      const r2 = await request(imageForm, "item/new")
      if (r2.status !== "success") {
        error(`Failed to upload image "${image.file}"`, r2)
      }
      log(`Uploaded image "${image.file}"`)
    }
  },
  async removeImages() {
    const $ = await this.getProject()
    const images = $(".image_list > .thumbnail[id]").map((i, e) => {
      const img = $(e)
      const id = img.data("media-item-id")
      return {
        id,
        title: img.data("caption")?.split(" - ")[0] || id
      }
    }).get()
    for (const image of images) {
      const deleteRequest = await request(makeForm({
        module: "tools/media",
        myaction: "delete",
        modern: true,
        media_id: image.id,
        media_key: "image_key",
        connect_id: project.planetminecraft.id
      }), undefined, false)
      if (!deleteRequest.ok) {
        error(`Failed to remove image "${image.title}"`, deleteRequest)
      }
      log(`Removed image "${image.title}"`)
    }
  },
  async getDescription() {
    const document = await this.getProjectDom()

    const imageData = Array.from(document.querySelectorAll(".image_list > .thumbnail")).map(e => ({
      url: e.dataset.fullFilename,
      title: e.dataset.caption?.split(" - ")[0]
    }))

    let logo
    if (project.config.images.some(e => e.logo)) {
      if (project.curseforge.id) {
        const images = await curseforge.getMedia()
        logo = images.find(e => e.type === 1 && (e.title === "logo.jpg" || e.title === "Project Logo"))?.url
      } else if (project.modrinth.id) {
        const images = await modrinth.getImages()
        logo = images.find(e => e.title === "Project Logo")?.raw_url
      } else {
        logo = imageData.find(e => e.title === "Project Logo")?.url
      }
    }

    let bbcode = fs.readFileSync(path.join("projects", project.config.id, "templates", "planetminecraft.bbcode"), "utf-8")

    bbcode = bbcode.replace(/{{\s*snippet:([a-z0-9_-]+)\s*}}/gi, (m, name) => {
      const snippetPath = path.join("templates", "snippets", "planetminecraft", name + ".bbcode")
      return fs.existsSync(snippetPath) ? fs.readFileSync(snippetPath, "utf-8") : "undefined"
    })

    const replacements = Array.from(bbcode.matchAll(/{{\s*([a-z0-9_.\[\]]+)\s*}}/gi))

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        str = project.config.description.join("\n\n")
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        const imageList = []
        for (const image of images) {
          imageList.push(`[img width=${project.config.imageWidths ?? settings.imageWidths ?? 600}]${imageData.find(e => e.title === image.name)?.url}[/img]`)
        }
        str = imageList.join("\n\n")
      } else if (replacement[1] === "logo") {
        if (project.config.images.some(e => e.logo) && (logo || (settings.ewan && !project.ewanhowell?.ignore))) {
          if (settings.ewan && !project.ewanhowell?.ignore) {
            str = `[img width=${project.config.logoWidth ?? settings.logoWidth ?? 700}]https://ewanhowell.com/assets/images/resourcepacks/${project.config.id}/logo.webp[/img]`
          } else {
            str = `[img width=${project.config.logoWidth ?? settings.logoWidth ?? 700}]${logo}[/img]`
          }
        } else {
          str = `[style b size=48px]${project.config.name}[/style]`
        }
      } else {
        str = getReplacementPath(config, replacement[1]) ?? getReplacementPath(settings.templateDefaults, replacement[1])
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      bbcode = bbcode.replaceAll(replacement[0], str)
    }

    return bbcode
  },
  async versionUpdate() {
    const $ = await this.getProject()

    // Make Log

    const logForm = makeForm({
      log_title: `Update v${config.version}`,
      content: config.changelog,
      module: "public/resource/manage",
      module_plugin: "log",
      module_plugin_task: "create",
      submit_log: "SAVE LOG",
      member_id: $("[name=member_id]").val(),
      resource_id: project.planetminecraft.id
    })

    const logRequest = await request(logForm)

    if (logRequest.status !== "success") {
      error("Failed to submit update log", logRequest, false)
    }

    log("Submit update log")

    // Update Version

    const form = await this.createForm($, $("#item_tags > div").map((i, e) => $(e).data("tag-id")).get())

    form.append("live", 1)

    const r = await request(form)
    if (r.status !== "success") {
      error("Failed to update project version", r)
    }

    log("Updated project version")
  },
  async updateDetails() {
    const $ = await this.getProject()

    const form = await this.createForm($, $("#item_tags > div").map((i, e) => $(e).data("tag-id")).get(), true)
    
    if (data.live) {
      form.append("live", 1)
    }

    const r = await request(form)
    if (r.status !== "success") {
      error("Failed to update project details", r)
    }

    log("Updated project details")
  },
  async import() {
    const document = await this.getProjectDom()

    const category = document.getElementById("folder_id[]").value
    const resolution = document.getElementById("op0").value

    config.planetminecraft.category = Object.entries(categories).find(e => e[1] == category)[0]
    config.planetminecraft.resolution = Object.entries(resolutions).find(e => e[1] == resolution)[0]
    config.planetminecraft.progress = parseInt(document.getElementById("progress").value)
    config.planetminecraft.credit = document.querySelector('input[name="credit"]').value

    for (const check of document.querySelectorAll("#main_folder_modified .folder-item")) {
      const input = check.querySelector("input")
      const label = check.querySelector("label").textContent.toLowerCase()
      config.planetminecraft.modifies[label] = input.checked || 0
    }

    config.planetminecraft.tags = Array.from(document.querySelectorAll("#item_tags .tag")).map(e => e.textContent.trim())

    if (!project.curseforge.id && !project.modrinth.id) {
      config.name = document.querySelector('[name="title"]').value
      config.video = document.querySelector('[name="youtube"]').value || false

      const version = document.getElementById("op1").selectedOptions[0].textContent.slice(10)

      config.versions = {
        curseforge: {
          type: "exact",
          version: version
        },
        planetminecraft: {
          type: "exact",
          version: version
        },
        modrinth: {
          type: "exact",
          version: version
        }
      }
      
      if (!settings.ewan || project.ewanhowell?.ignore) {
        const imageData = Array.from(document.querySelectorAll(".image_list > .thumbnail")).map(e => {
          const file = e.dataset.fullFilename?.split("/").at(-1).slice(0, -6).split("-").slice(1).join("_")
          return {
            file,
            url: e.dataset.fullFilename,
            title: e.dataset.caption?.split(" - ")[0] || file?.split("_").map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(" "),
            description: e.dataset.caption?.split(" - ").slice(1).join(" - ")
          }
        }).filter(e => e.file)
        
        config.images = imageData.filter(e => e.title !== "Project Thumbnail" && e.title !== "Project Logo").map((e, i) => ({
          name: e.title,
          description: e.description || e.title,
          file: e.file,
          embed: i < 3 ? true : undefined,
          featured: i ? undefined : true
        }))

        for (const image of imageData) {
          let name, imgPath
          if (image.title === "Project Thumbnail") {
            name = "thumbnail.png"
            imgPath = path.join(projectPath, name)
          } else if (image.title === "Project Logo") {
            name = "logo.png"
            imgPath = path.join(projectPath, name)
          } else {
            name = image.file + ".png"
            imgPath = path.join(projectPath, "images", name)
          }
          log(`Downloading image: ${name}`)
          await sharp(await fetch(image.url).then(e => e.arrayBuffer())).png().toFile(imgPath)
        }
      }
    }
  }
}