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

const licenses = {
  "All Rights Reserved/No License": "LicenseRef-All-Rights-Reserved",
  "Apache License 2.0": "Apache-2.0",
  'BSD 2-Clause "Simplified" License': "BSD-2-Clause",
  'BSD 3-Clause "New" or "Revised" License': "BSD-3-Clause",
  "CC Zero (Public Domain equivalent)": "CC0-1.0",
  "CC-BY 4.0": "CC-BY-4.0",
  "CC-BY-NC 4.0": "CC-BY-NC-4.0",
  "CC-BY-NC-ND 4.0": "CC-BY-NC-ND-4.0",
  "CC-BY-NC-SA 4.0": "CC-BY-NC-SA-4.0",
  "CC-BY-ND 4.0": "CC-BY-ND-4.0",
  "CC-BY-SA 4.0": "CC-BY-SA-4.0",
  "GNU Affero General Public License v3": "AGPL-3.0",
  "GNU General Public License v2": "GPL-2.0",
  "GNU General Public License v3": "GPL-3.0",
  "GNU Lesser General Public License v2.1": "LGPL-2.1",
  "GNU Lesser General Public License v3": "LGPL-3.0",
  "ISC License": "ISC",
  "MIT License": "MIT",
  "Mozilla Public License 2.0": "MPL-2.0",
  "zlib License": "Zlib"
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
        issues_url: project.config.github ? project.config.github.replace(/\/+$/, "") + "/issues" : undefined,
        source_url: project.config.github || undefined,
        discord_url: settings.modrinth.discord,
        license_id: licenses[project.config.modrinth.license] ?? "LicenseRef-All-Rights-Reserved",
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
        Authorization: auth.modrinth
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
      case "exact":
        versions.push(versionsRequest.find(e => e.version === project.config.versions.modrinth.version).version)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.version === project.config.versions.modrinth.version) + 1).map(e => e.version))
        break
      case "range":
        const start = versionsRequest.findIndex(e => e.version === project.config.versions.modrinth.version)
        const end = versionsRequest.findIndex(e => e.version === project.config.versions.modrinth.to)
        versions.push(...versionsRequest.slice(Math.min(start, end), Math.max(start, end) + 1).map(e => e.version))
        break
    }

    const form = makeForm({
      data: {
        name: project.config.name,
        version_number: project.config.version.toString(),
        changelog: config.changelog?.replace("\n", "\n\n") ?? "Initial release",
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
        Authorization: auth.modrinth
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
          Authorization: auth.modrinth,
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
        Authorization: auth.modrinth,
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
        Authorization: auth.modrinth
      }
    }).then(e => e.json()).then(e => e.gallery)
  },
  async removeImages() {
    const images = await this.getImages()
    for (const image of images) {
      const deleteRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/gallery?url=${image.url}`, {
        method: "DELETE",
        headers: {
          Authorization: auth.modrinth
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

    let markdown = fs.readFileSync(path.join("projects", project.config.id, "templates", "modrinth.md"), "utf-8")

    markdown = markdown.replace(/{{\s*snippet:([a-z0-9_-]+)\s*}}/gi, (m, name) => {
      const snippetPath = path.join("templates", "snippets", "modrinth", name + ".md")
      return fs.existsSync(snippetPath) ? fs.readFileSync(snippetPath, "utf-8") : "undefined"
    })

    const replacements = Array.from(markdown.matchAll(/{{\s*([a-z0-9_.\[\]]+)\s*}}/gi))

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        str = project.config.description.map(e => e + "\n\n").join("").trim()
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<img src="${gallery.find(e => e.title === image.name)?.raw_url}" width="600" alt="${image.name}"><br><br>\n`
        }
        str = str.trim()
      } else if (replacement[1] === "video") {
        if (project.config.video) {
          str = `<iframe src="https://www.youtube.com/embed/${project.config.video}" width="${project.config.imageWidths ?? settings.imageWidths ?? 600}" allowfullscreen="allowfullscreen"></iframe><br><br><br>\n\n`
        }
      } else if (replacement[1] === "logo") {
        const logo = gallery.find(e => e.title === "Project Logo")?.raw_url
        if (project.config.images.some(e => e.logo) && (logo || settings.ewan)) {
          if (settings.ewan) {
            str += `<img src="https://ewanhowell.com/assets/images/resourcepacks/${project.config.id}/logo.webp" width="${project.config.logoWidth ?? settings.logoWidth ?? 700}" alt="${project.config.name} Logo">`
          } else {
            str += `<img src="${logo}" width="${project.config.logoWidth ?? settings.logoWidth ?? 700}" alt="${project.config.name} Logo">`
          }
        } else {
          str = "# " + project.config.name
        }
      } else {
        str = getReplacementPath(config, replacement[1]) ?? getReplacementPath(settings.templateDefaults, replacement[1])
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      markdown = markdown.replaceAll(replacement[0], str)
    }

    const donationTypes = {
      buyMeACoffee: {
        id: "bmac",
        name: "Buy Me A Coffee"
      },
      github: {
        id: "github",
        name: "GitHub Sponsors"
      },
      kofi: {
        id: "ko-fi",
        name: "Ko-fi"
      },
      other: {
        id: "other",
        name: "Other"
      },
      patreon: {
        id: "patreon",
        name: "Patreon"
      },
      paypal: {
        id: "paypal",
        name: "PayPal"
      }
    }

    const donationUrls = Object.entries(settings.modrinth.donation).filter(e => e[1]).map(([k, v]) => ({
      id: donationTypes[k].id,
      platform: donationTypes[k].name,
      url: v
    }))

    const r = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      method: "PATCH",
      headers: {
        Authorization: auth.modrinth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: project.config.name,
        description: project.config.summary,
        categories: Object.entries(project.config.modrinth.tags).filter(e => e[1] === "featured").map(e => e[0]),
        additional_categories: Object.entries(project.config.modrinth.tags).filter(e => e[1] && e[1] !== "featured").map(e => e[0]),
        body: markdown,
        donation_urls: donationUrls.length ? donationUrls : undefined,
        issues_url: project.config.github ? project.config.github.replace(/\/+$/, "") + "/issues" : undefined,
        source_url: project.config.github || undefined,
        discord_url: settings.modrinth.discord,
        license_id: licenses[project.config.modrinth.license] ?? "LicenseRef-All-Rights-Reserved",
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
    const dataRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}`, {
      headers: {
        Authorization: auth.modrinth,
        "Content-Type": "application/json"
      }
    })
    if (!dataRequest.ok) {
      error("Failed to get project", await dataRequest.text())
    }
    const data = await dataRequest.json()

    config.versions.modrinth.version = data.game_versions.at(-1)

    for (const category of data.categories) {
      config.modrinth.tags[category] = "featured"
    }

    for (const category of data.additional_categories) {
      config.modrinth.tags[category] = true
    }

    config.modrinth.license = Object.entries(licenses).find(e => e[1] === data.license.id)[0]

    if (!project.curseforge.id) {
      config.name = data.title
      config.summary = data.description
      config.description = [data.description]
      config.video = data.body.match(/src="https:\/\/www\.youtube\.com\/embed\/([A-Za-z0-9_-]+)"/)?.[1] ?? false
      
      if (data.source_url?.includes("github.com")) {
        config.github = data.source_url
      }

      const versionsRequest = await fetch(`https://api.modrinth.com/v2/project/${project.modrinth.id}/version`, {
        headers: {
          Authorization: auth.modrinth,
          "Content-Type": "application/json"
        }
      })
      if (!versionsRequest.ok) {
        error("Failed to get project files", await versionsRequest.text())
      }
      const versions = await versionsRequest.json()

      config.version = versions[0].version_number

      config.versions = {
        curseforge: {
          type: "exact",
          version: data.game_versions.at(-1)
        },
        planetminecraft: {
          type: "exact",
          version: data.game_versions.at(-1)
        },
        modrinth: {
          type: "exact",
          version: data.game_versions.at(-1)
        }
      }

      const iconPath = path.join("projects", project.config.id, "pack.png")
      if (!fs.existsSync(iconPath)) {
        log(`Downloading image: pack.png`)
        await sharp(await fetch(data.icon_url).then(e => e.arrayBuffer())).png().toFile(iconPath)
      }

      if (!settings.ewan) {
        const hasFeatured = data.gallery.some(e => e.featured)
        config.images = data.gallery.filter(e => e.title !== "Project Logo").map((e, i) => ({
          name: e.title,
          description: e.description || e.title,
          file: e.title.toLowerCase().replaceAll(" ", "_").replace(/[^a-z0-9_]/g, ""),
          embed: i < 3 ? true : undefined,
          featured: (hasFeatured ? e.featured : !i) ? true : undefined
        }))
        for (const image of data.gallery) {
          let name, imgPath
          if (image.title === "Project Logo") {
            name = "logo.png"
            imgPath = path.join(projectPath, name)
          } else {
            name = image.title.toLowerCase().replaceAll(" ", "_").replace(/[^a-z0-9_]/g, "") + ".png"
            imgPath = path.join(projectPath, "images", name)
          }
          log(`Downloading image: ${name}`)
          await sharp(await fetch(image.raw_url).then(e => e.arrayBuffer())).png().toFile(imgPath)
        }
      }
    }
  }
}