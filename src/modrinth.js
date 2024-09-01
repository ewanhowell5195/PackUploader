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
        slug: config.id,
        title: config.name,
        description: config.summary,
        categories: Object.entries(config.modrinth.tags).filter(e => e[1] === "featured").map(e => e[0]),
        additional_categories: Object.entries(config.modrinth.tags).filter(e => e[1] && e[1] !== "featured").map(e => e[0]),
        client_side: "required",
        server_side: "unsupported",
        body: "placeholder",
        issues_url: config.github ? config.github : undefined,
        source_url: config.github ? config.github : undefined,
        discord_url: config.discord,
        license_id: "LicenseRef-All-Rights-Reserved",
        project_type: "resourcepack",
        is_draft: true,
        initial_versions: []
      }
    })

    form.append("icon", new Blob([fs.readFileSync("data/pack.png")], {
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

    if (!config.versions.modrinth.snapshots) {
      versionsRequest = versionsRequest.filter(e => e.version_type === "release")
    }

    const versions = []

    switch (config.versions.modrinth.type) {
      case "latest":
        versions.push(versionsRequest[0].version)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.version === config.versions.modrinth.version) + 1).map(e => e.version))
        break
    }

    const form = makeForm({
      data: {
        name: project.config.name,
        version_number: config.version.toString(),
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

    form.append("file", new Blob([fs.readFileSync("data/pack.zip")], {
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
    for (const [i, image] of config.images.entries()) {
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
  async writeDescription(live) {
    const galleryRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.slug}`, {
      headers: {
        Authorization: settings.auth.modrinth
      }
    }).then(e => e.json())

    let markdown = fs.readFileSync("templates/modrinth.md", "utf-8")
    const replacements = markdown.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        for (const part of config.description.description) {
          str += part + "\n\n"
        }
        str = str.trim()
      } else if (replacement[1] === "images") {
        const images = config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<img src="${galleryRequest.gallery.find(e => e.title === image.name).url}" width="600" alt="${image.name}"><br><br>\n`
        }
        str = str.trim()
      } else if (replacement[1] === "video") {
        if (config.video) {
          str = `<iframe src="https://www.youtube.com/embed/${config.video}" width="600" height="336" allowfullscreen="allowfullscreen"></iframe><br><br><br>\n\n`
        }
      } else if (replacement[1] === "logo") {
        if (fs.existsSync("./data/logo.png")) {
          str = `![${config.name} Logo](https://ewanhowell.com/assets/images/resourcepacks/${config.id}/logo.webp)`
        } else {
          str = "# " + config.name
        }
      } else {
        str = config.description[replacement[1]] ?? config[replacement[1]]
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      markdown = markdown.replaceAll(replacement[0], str)
    }

    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.slug}`, {
      method: "PATCH",
      headers: {
        Authorization: settings.auth.modrinth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        body: markdown,
        donation_urls: config.kofi ? [{
          id: "ko-fi",
          platform: "Ko-fi",
          url: config.kofi
        }] : undefined,
        requested_status: "approved",
        status: live ? undefined : "processing"
      })
    })

    if (!r.ok) {
      error("Failed to write Description", await r.text())
    }

    log("Written description")
  }
}