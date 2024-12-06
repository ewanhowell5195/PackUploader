function log(message) {
  console.log(`CurseForge: ${message}`)
}

async function error(err, req) {
  throw new Error(`CurseForge: ${err} - ${await req.text()}`)
}

export default {
  async createProject() {
    // Icon Upload

    const iconForm = new FormData()
    iconForm.append("file", new Blob([fs.readFileSync("data/pack.png")], {
      type: "image/png"
    }), "pack.png")

    const iconRequest = await fetch("https://authors.curseforge.com/_api/projects/null/upload-avatar", {
      method: "POST",
      headers: {
        cookie: settings.auth.curseforge.cookie
      },
      body: iconForm
    })

    if (!iconRequest.ok) {
      await error("Icon upload failed", iconRequest)
    }

    const iconURL = await iconRequest.text()

    log("Icon uploaded")

    // Project Creation

    const projectCreationRequest = await fetch("https://authors.curseforge.com/_api/projects", {
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

    if (!projectCreationRequest.ok) {
      await error("Project creation failed", projectCreationRequest)
    }

    project.curseforge.id = await projectCreationRequest.json().then(e => e.id)

    save()

    log("Project created")

    // Get Project Details

    const projectRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}`, {
      headers: {
        cookie: settings.auth.curseforge.cookie
      }
    })

    if (!projectRequest.ok) {
      await error("Failed getting project details", projectRequest)
    }

    project.curseforge.slug = await projectRequest.json().then(e => e.slug)

    save()

    console.log(`CurseForge: Project URL: https://www.curseforge.com/minecraft/texture-packs/${project.curseforge.slug}`)

    await new Promise(fulfil => setTimeout(fulfil, 5000))
  },
  async uploadPack() {
    // Get Version Ids

    let versionsRequest = await fetch(`https://authors.curseforge.com/_api/project-files/${project.curseforge.id}/create-project-file-form-data`, {
      headers: {
        cookie: settings.auth.curseforge.cookie
      }
    })

    if (!versionsRequest.ok) {
      await error("CurseForge: Failed getting version list", versionsRequest)
    }

    versionsRequest = await versionsRequest.json().then(e => e[0].flatMap(e => e.choices))

    if (!config.versions.curseforge.snapshots) {
      versionsRequest = versionsRequest.filter(e => !e.name.endsWith("Snapshot"))
    }

    const versions = []

    switch (config.versions.curseforge.type) {
      case "latest":
        versions.push(versionsRequest[0].id)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.name === config.versions.curseforge.version) + 1).map(e => e.id))
        break
    }

    // Pack Upload

    const packForm = makeForm({
      metadata: {
        displayName: `${project.config.name} - v${config.version}`,
        changelog: config.changelog ?? "Initial release",
        gameVersions: versions,
        releaseType: "release"
      }
    })
    packForm.append("file", new Blob([fs.readFileSync("data/pack.zip")], {
      type: "application/zip"
    }), `${project.config.name}.zip`)

    const packUploadRequest = await fetch(`https://minecraft.curseforge.com/api/projects/${project.curseforge.id}/upload-file`, {
      method: "POST",
      headers: {
        "X-Api-Token": settings.auth.curseforge.token
      },
      body: packForm
    })

    if (!packUploadRequest.ok) {
      await error("Failed to upload pack", packUploadRequest)
    }

    log("Pack uploaded")
  },
  async uploadImages() {
    for (const image of config.images) {
      try {
        const imageForm = new FormData()
        imageForm.append("id", project.curseforge.id)
        imageForm.append("files", new Blob([image.buffer], {
          type: "image/jpeg"
        }), image.file + ".jpg")

        const imagesRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}`, {
          method: "POST",
          headers: {
            cookie: settings.auth.curseforge.cookie
          },
          body: imageForm
        })

        if (!imagesRequest.ok) {
          await error("Image uploads failed", imagesRequest)
        }

        log(`Image "${image.file}" uploaded`)
      } catch (err) {
        throw new Error(`CurseForge: Image "${image.file}" failed to upload - ` + JSON.stringify(err))
      }
    }

    const imageData = await this.getImages()

    for (const image of config.images) {
      const data = imageData.find(e => e.title === image.file + ".jpg")
      if (!data) {
        throw new Error(`CurseForge: Image "${image.file}" failed to upload - ` + JSON.stringify(err))
      }
      const r = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}`, {
        method: "PUT",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: image.name,
          description: image.description,
          id: data.id,
          isFeatured: true
        })
      })
      if (r.ok) {
        log(`Updated metadata for image "${image.file}"`)
      } else {
        console.error(`Failed to update metadata for image "${image.file}" - ${await r.text()}`)
      }
    }
  },
  async getImages() {
    const imageDataRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}?filter=%7B%7D&range=%5B0%2C24%5D&sort=%5B%22id%22%2C%22DESC%22%5D`, {
      headers: {
        cookie: settings.auth.curseforge.cookie
      }
    })

    if (!imageDataRequest.ok) {
      await error("Failed to get image data", imageDataRequest)
    }

    return imageDataRequest.json()
  },
  async setDetails() {
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
        await error("Failed to set GitHub link", r)
      }
      log("GitHub link set")
    }

    const imageData = await this.getImages()

    let html = fs.readFileSync("templates/curseforge.html", "utf-8")
    const replacements = html.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        for (const part of config.description.description) {
          str += `<p>${part}</p>`
        }
      } else if (replacement[1] === "images") {
        const images = config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<br><img src="${imageData.find(e => e.title === image.file + ".jpg" || e.title === image.name).imageUrl}" width="600" alt="${image.name}"><br>`
        }
      } else if (replacement[1] === "video") {
        if (config.video) {
          str = `<br><br><iframe src="https://www.youtube.com/embed/${config.video}" width="600" height="336" allowfullscreen="allowfullscreen"></iframe><br>`
        }
      } else if (replacement[1] === "logo") {
        if (fs.existsSync("./data/logo.png")) {
          str = `<img src="https://ewanhowell.com/assets/images/resourcepacks/${config.id}/logo.webp" alt="${config.name} Logo"><br><br>`
        } else {
          str = `<div style="color: ${config.description.titleColour}; background-image: linear-gradient(160deg, ${config.description.titleBackground}, ${config.description.titleBackground2});">
        <br>
        <h1 style="font-size: 5ic; font-weight: 700; text-decoration: underline; display: inline-block;">${config.name}</h1>
      </div>`
        }
      } else {
        str = config.description[replacement[1]] ?? config[replacement[1]]
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      html = html.replaceAll(replacement[0], str)
    }

    const r = await fetch(`https://authors.curseforge.com/_api/projects/description/${project.curseforge.id}`, {
      method: "PUT",
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: html,
        descriptionType: 1
      })
    })

    if (!r.ok) {
      await error("Failed to write description", r)
    }

    log("Written description")
  }
}