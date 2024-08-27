function log(message) {
  console.log(`Planet Minecraft: ${message}`)
}

function error(err, res) {
  if (typeof res === "string") {
    throw new Error(`Planet Minecraft: ${err} - ${res}`)
  } else {
    throw new Error(`Planet Minecraft: ${err} - ${JSON.stringify(res)}`)
  }
}

export default {
  async createProject() {
    // Get New Project

    const newProjectRequest = await fetch("https://www.planetminecraft.com/account/manage/texture-packs/item/new", {
      headers: {
        cookie: settings.auth.planetminecraft.cookie
      }
    })

    if (!newProjectRequest.ok) {
      error("Failed to get a new project", await newProjectRequest.text())
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

    const imageData = await curseforge.getImages()

    let bbcode = fs.readFileSync("templates/planetminecraft.bbcode", "utf-8")
    const replacements = bbcode.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        str = config.description.description.join("\n\n")
      } else if (replacement[1] === "images") {
        const images = config.images.filter(e => e.embed)
        const imageList = []
        for (const image of images) {
          imageList.push(`[img width=600 height=338]${imageData.find(e => e.title === image.file + ".jpg" || e.title === image.name).imageUrl}[/img]`)
        }
        str = imageList.join("\n\n")
      } else if (replacement[1] === "logo") {
        if (fs.existsSync("./upload/logo.png")) {
          str = `[img]https://ewanhowell.com/assets/images/resourcepacks/${config.id}/logo.webp[/img]`
        } else {
          str = `[size=48px]${config.name}[/size]`
        }
      } else {
        str = config.description[replacement[1]] ?? config[replacement[1]]
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      bbcode = bbcode.replaceAll(replacement[0], str)
    }

    const form = makeForm({
      member_id: $("[name=member_id]").val(),
      resource_id: project.planetminecraft.id,
      subject_id: $("[name=subject_id]").val(),
      group: $("[name=group]").val(),
      module: $("[name=module]").val(),
      module_task: $("[name=module_task]").val(),
      server_id: "",
      title: config.name,
      op0: 1, // Resolution
      progress: 100,
      youtube: config.video ? config.video : undefined,
      description: bbcode,
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

    if (config.versions.planetminecraft.type === "latest") {
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

    for (const [item, on] of Object.entries(config.planetminecraft.modifies)) {
      if (!on) continue
      form.append("folder_id[]", modifies[item]) // Modifies content section
    }

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
  }
}