import { JSDOM } from "jsdom"

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

async function request(body, json = true) {
  const r = await fetch("https://www.planetminecraft.com/ajax.php", {
    method: "POST",
    headers: {
      "x-pmc-csrf-token": settings.auth.planetminecraft.token,
      cookie: settings.auth.planetminecraft.cookie,
      Referer: `https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`
    },
    body
  })
  if (json) {
    return r.json()
  }
  return r
}

export default {
  async getProject() {
    const projectRequest = await fetch(`https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`, {
      headers: {
        "cache-control": "no-cache",
        cookie: settings.auth.planetminecraft.cookie
      }
    })

    if (!projectRequest.ok) {
      error("Failed to fetch project", await projectRequest.text())
    }

    log("Fetched project")

    return load(await projectRequest.text())
  },
  async getProjectDom() {
    const projectRequest = await fetch(`https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`, {
      headers: {
        "cache-control": "no-cache",
        cookie: settings.auth.planetminecraft.cookie
      }
    })

    if (!projectRequest.ok) {
      error("Failed to fetch project", await projectRequest.text())
    }

    log("Fetched project")

    return new JSDOM(await projectRequest.text()).window.document
  },
  async createProject() {
    // Get New Project

    const newProjectRequest = await fetch("https://www.planetminecraft.com/account/manage/texture-packs/item/new", {
      headers: {
        "cache-control": "no-cache",
        cookie: settings.auth.planetminecraft.cookie
      }
    })

    if (!newProjectRequest.ok) {
      error("Failed to fetch a new project", await newProjectRequest.text())
    }

    const $ = load(await newProjectRequest.text())

    project.planetminecraft.id = parseInt($("[name=resource_id]").val())

    save()

    log("Fetched new project")

    // Get Tags

    const tags = []

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
        error(`Failed to get tag "${tag}"`, r)
      }
      tags.push(load(r.tag_html)(".tag").attr("data-tag-id"))
      log(`Fetched custom tag "${tag}"`)
    }

    await this.uploadImages()

    // Create Project

    const form = await this.createForm($, tags)

    const r = await fetch("https://www.planetminecraft.com/ajax.php", {
      method: "POST",
      headers: {
        "x-pmc-csrf-token": settings.auth.planetminecraft.token,
        cookie: settings.auth.planetminecraft.cookie,
        Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
      },
      body: form
    }).then(e => e.json())

    if (r.status !== "success") {
      error("Failed to create project", r)
    }

    project.planetminecraft.slug = r.forward.split("/")[1]

    save()

    log(`Project URL: https://www.planetminecraft.com/texture-pack/${project.planetminecraft.slug}`)
  },
  async createForm($, tags) {
    const form = makeForm({
      member_id: $("[name=member_id]").val(),
      resource_id: project.planetminecraft.id,
      subject_id: $("[name=subject_id]").val(),
      group: $("[name=group]").val(),
      module: $("[name=module]").val(),
      module_task: $("[name=module_task]").val(),
      server_id: "",
      title: project.config.name,
      op0: 1, // Resolution
      progress: 100,
      youtube: project.config.video ? project.config.video : undefined,
      description: await this.getDescription(),
      wid1: 1,
      wfile1: 1,
      wurl1: `https://ewanhowell.com/resourcepacks/${config.id}`,
      wtitle1: "Download here",
      wid0: 0,
      wfile0: 0,
      wurl0: "https://ewanhowell.com/",
      wtitle0: "My Website",
      credit: "",
      item_tag: "",
      tag_ids: tags.join(),
      allowcomments: 1,
      saved_data: ""
    })

    form.append("folder_id[]", 27) // Other category

    const versions = $("#op1 option").map((_, option) => ({
      id: $(option).val(),
      name: $(option).text().slice(10)
    })).get().filter(e => e.name !== "Bedrock" && e.name !== "Dungeons")

    if (project.config.versions.planetminecraft.type === "latest") {
      form.append("op1", versions[0].id) // Minecraft version number
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

    for (const image of config.images) {
      const r = await fetch("https://www.planetminecraft.com/ajax.php", {
        method: "POST",
        headers: {
          "x-pmc-csrf-token": settings.auth.planetminecraft.token,
          cookie: settings.auth.planetminecraft.cookie,
          Referer: "https://www.planetminecraft.com/account/manage/texture-packs/item/new"
        },
        body: form
      }).then(e => e.json())
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
      }), false)
      if (!deleteRequest.ok) {
        error(`Failed to remove image "${image.title}"`, deleteRequest)
      }
      log(`Removed image "${image.title}"`)
    }
  },
  async getDescription() {
    const imageData = await curseforge.getImages()

    let bbcode = fs.readFileSync("templates/planetminecraft.bbcode", "utf-8")
    const replacements = bbcode.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        str = project.config.description.join("\n\n")
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        const imageList = []
        for (const image of images) {
          imageList.push(`[img width=600 height=338]${imageData.find(e => e.title === image.file + ".jpg" || e.title === image.name).url}[/img]`)
        }
        str = imageList.join("\n\n")
      } else if (replacement[1] === "logo") {
        if (project.config.logo) {
          str = `[img]https://ewanhowell.com/assets/images/resourcepacks/${config.id}/logo.webp[/img]`
        } else {
          str = `[style b size=48px]${project.config.name}[/style]`
        }
      } else {
        str = project.config[replacement[1]] ?? defaultConfig[replacement[1]]
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

    const r = await fetch("https://www.planetminecraft.com/ajax.php", {
      method: "POST",
      headers: {
        "x-pmc-csrf-token": settings.auth.planetminecraft.token,
        cookie: settings.auth.planetminecraft.cookie,
        Referer: `https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`
      },
      body: form
    }).then(e => e.json())

    if (r.status !== "success") {
      error("Failed to update project version", r)
    }

    log("Updated project version")
  },
  async updateDetails() {
    const $ = await this.getProject()

    const form = await this.createForm($, $("#item_tags > div").map((i, e) => $(e).data("tag-id")).get())
    
    if (data.live) {
      form.append("live", 1)
    }

    const r = await fetch("https://www.planetminecraft.com/ajax.php", {
      method: "POST",
      headers: {
        "x-pmc-csrf-token": settings.auth.planetminecraft.token,
        cookie: settings.auth.planetminecraft.cookie,
        Referer: `https://www.planetminecraft.com/account/manage/texture-packs/${project.planetminecraft.id}`
      },
      body: form
    }).then(e => e.json())

    if (r.status !== "success") {
      error("Failed to update project details", r)
    }

    log("Updated project details")
  },
  async loadDetails() {
    config.planetminecraft = {
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
    }

    if (!project.planetminecraft.id) return

    const document = await this.getProjectDom()
    config.planetminecraft.tags = Array.from(document.querySelectorAll("#item_tags .tag")).map(e => e.textContent.trim())
    
    for (const check of document.querySelectorAll("#main_folder_modified .folder-item")) {
      const input = check.querySelector("input")
      const label = check.querySelector("label").textContent.toLowerCase()
      config.planetminecraft.modifies[label] = input.checked ? true : 0
    }
  }
}