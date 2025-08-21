function log(message) {
  console.log(`Modrinth: ${message}`)
}

function error(err, res) {
  if (typeof res === "string") {
    throw new Error(`Modrinth: ${err} - ${res}`)
  } else {
    throw new Error(`Modrinth: ${err} - ${JSON.stringify(res)}`)
  }
}

export default {
  async createProject() {
    const form = makeForm({
      data: {
        slug: project.config.id,
        title: project.config.name,
        description: project.config.summary,
        categories: Object.entries(project.config.modrinth.tags).filter(e => e[1] === "featured").map(e => e[0]),
        additional_categories: Object.entries(project.config.modrinth.tags).filter(e => e[1] && e[1] !== "featured").map(e => e[0]),
        client_side: "required",
        server_side: "unsupported",
        body: "placeholder",
        issues_url: project.config.github ? project.config.github : undefined,
        source_url: project.config.github ? project.config.github : undefined,
        discord_url: defaultConfig.discord,
        license_id: "LicenseRef-All-Rights-Reserved",
        project_type: "resourcepack",
        is_draft: true,
        initial_versions: []
      }
    })

    form.append("icon", new Blob([config.icon], {
      type: "image/png"
    }), "pack.png")

    const r = await fetch("https://api.modrinth.com/v2/project", {
      method: "POST",
      headers: {
        Authorization: settings.auth.modrinth
      },
      body: form
    }).then(e => e.json())

    if (r.error) {
      error("Failed to create project", r)
    }

    project.modrinth.id = r.id
    project.modrinth.slug = r.slug

    save()

    log("Project created")
    log(`Project URL: https://modrinth.com/project/${project.modrinth.slug}`)
  },
  async uploadPack() {
    let versionsRequest = await fetch("https://api.modrinth.com/v2/tag/game_version").then(e => e.json())

    if (!project.config.versions.modrinth.snapshots) {
      versionsRequest = versionsRequest.filter(e => e.version_type === "release")
    }

    const versions = []

    switch (project.config.versions.modrinth.type) {
      case "latest":
        versions.push(versionsRequest[0].version)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.version === project.config.versions.modrinth.version) + 1).map(e => e.version))
        break
    }

    const form = makeForm({
      data: {
        name: project.config.name,
        version_number: project.config.version.toString(),
        changelog: config.changelog ?? "Initial release",
        dependencies: [],
        game_versions: versions,
        version_type: "release",
        loaders: ["minecraft"],
        featured: false,
        project_id: project.modrinth.id,
        file_parts: ["file"],
        primary_file: "file"
      }
    })

    form.append("file", new Blob([config.pack], {
      type: "application/zip"
    }), `${project.config.name}.zip`)

    const r = await fetch("https://api.modrinth.com/v2/version", {
      method: "POST",
      headers: {
        Authorization: settings.auth.modrinth
      },
      body: form
    }).then(e => e.json())

    if (r.error) {
      error("Failed to upload pack", r)
    }

    log("Pack uploaded")
  },
  async uploadImages() {
    for (const [i, image] of project.config.images.entries()) {
      if (image.thumbnail || (settings.ewan && image.logo)) continue
      const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/gallery?ext=png&featured=${!!image.featured}&title=${encodeURIComponent(image.name)}&description=${encodeURIComponent(image.description)}&ordering=${i}`, {
        method: "POST",
        headers: {
          Authorization: settings.auth.modrinth,
          "Content-Type": "image/png"
        },
        body: new Blob([image.buffer], {
          type: "image/jpg"
        })
      })
      if (!r.ok) {
        error(`Failed to upload image "${image.file}"`, await r.text())
      }
      log(`Uploaded image "${image.file}"`)
    }
  },
  async uploadIcon() {
    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/icon?ext=png`, {
      method: "PATCH",
      headers: {
        Authorization: settings.auth.modrinth,
        "Content-Type": "image/png"
      },
      body: config.icon
    })

    if (r.error) {
      error("Failed to upload icon", r)
    }

    log("Icon set")
  },
  getImages() {
    return fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      headers: {
        Authorization: settings.auth.modrinth
      }
    }).then(e => e.json()).then(e => e.gallery)
  },
  async removeImages() {
    const images = await this.getImages()
    for (const image of images) {
      const deleteRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/gallery?url=${image.url}`, {
        method: "DELETE",
        headers: {
          Authorization: settings.auth.modrinth
        }
      })
      if (!deleteRequest.ok) {
        await error(`Failed to remove image "${image.title}"`, deleteRequest)
      }
      log(`Removed image "${image.title}"`)
    }
  },
  async setDetails(live) {
    const gallery = await this.getImages()

    let markdown = fs.readFileSync("templates/modrinth.md", "utf-8")
    const replacements = markdown.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        for (const part of project.config.description) {
          str += part + "\n\n"
        }
        str = str.trim()
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<img src="${gallery.find(e => e.title === image.name).raw_url}" width="600" alt="${image.name}"><br><br>\n`
        }
        str = str.trim()
      } else if (replacement[1] === "video") {
        if (project.config.video) {
          str = `<iframe src="https://www.youtube.com/embed/${project.config.video}" width="600" height="336" allowfullscreen="allowfullscreen"></iframe><br><br><br>\n\n`
        }
      } else if (replacement[1] === "logo") {
        if (project.config.images.some(e => e.logo)) {
          if (settings.ewan) {
            str = `![${project.config.name} Logo](https://ewanhowell.com/assets/images/resourcepacks/${project.config.id}/logo.webp)`
          } else {
            str = `![${project.config.name} Logo](${gallery.find(e => e.title === "Project Logo").raw_url})`
          }
        } else {
          str = "# " + project.config.name
        }
      } else {
        str = config[replacement[1]] ?? defaultConfig[replacement[1]]
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      markdown = markdown.replaceAll(replacement[0], str)
    }

    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      method: "PATCH",
      headers: {
        Authorization: settings.auth.modrinth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        body: markdown,
        donation_urls: defaultConfig.kofi ? [{
          id: "ko-fi",
          platform: "Ko-fi",
          url: defaultConfig.kofi
        }] : undefined,
        issues_url: project.config.github ? project.config.github : undefined,
        source_url: project.config.github ? project.config.github : undefined,
        discord_url: project.config.discord,
        requested_status: "approved",
        status: !live ? "processing" : undefined
      })
    })

    if (!r.ok) {
      error("Failed to write Description", await r.text())
    }

    log("Written description")
  },
  async import() {
    config.modrinth = {
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
      }
    }

    if (!project.modrinth.id) return

    const dataRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      headers: {
        Authorization: settings.auth.modrinth,
        "Content-Type": "application/json"
      }
    })
    if (!dataRequest.ok) {
      error("Failed to get project", await dataRequest.text())
    }
    const data = await dataRequest.json()

    const versionsRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/version`, {
      headers: {
        Authorization: settings.auth.modrinth,
        "Content-Type": "application/json"
      }
    })
    if (!versionsRequest.ok) {
      error("Failed to get project version", await versionsRequest.text())
    }
    const versions = await versionsRequest.json()

    config.versions.modrinth.version = versions[0].game_versions.at(-1)

    for (const category of data.categories) {
      config.modrinth.tags[category] = "featured"
    }

    for (const category of data.additional_categories) {
      config.modrinth.tags[category] = true
    }
  }
}