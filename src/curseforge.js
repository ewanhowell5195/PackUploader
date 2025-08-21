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
    iconForm.append("file", new Blob([config.icon], {
      type: "image/png"
    }), "pack.png")

    const iconRequest = await fetch("https://authors.curseforge.com/_api/projects/game/432/upload-avatar", {
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
        name: project.config.name,
        avatarUrl: iconURL,
        summary: project.config.summary,
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

    versionsRequest = await versionsRequest.json().then(e => e.versionsData[0].flatMap(e => e.choices))

    if (!project.config.versions.curseforge.snapshots) {
      versionsRequest = versionsRequest.filter(e => !e.name.toLowerCase().endsWith("snapshot"))
    }

    const versions = []

    switch (project.config.versions.curseforge.type) {
      case "latest":
        versions.push(versionsRequest[0].id)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.name === project.config.versions.curseforge.version) + 1).map(e => e.id))
        break
    }

    // Pack Upload

    const packForm = makeForm({
      metadata: {
        displayName: `${project.config.name} - v${project.config.version}`,
        changelog: config.changelog ?? "Initial release",
        gameVersions: versions,
        releaseType: "release"
      }
    })
    packForm.append("file", new Blob([config.pack], {
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
    for (const image of project.config.images) {
      if (settings.ewan && image.logo) continue
      try {
        const imageForm = new FormData()
        imageForm.append("id", project.curseforge.id)
        if (image.logo) {
          imageForm.append("files", new Blob([image.buffer], {
            type: "image/png"
          }), image.file + ".png")
        } else {
          imageForm.append("files", new Blob([image.buffer], {
            type: "image/jpeg"
          }), image.file + ".jpg")
        }

        const imagesRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/image/${project.curseforge.id}`, {
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

    const imageData = await this.getMedia()

    for (const image of project.config.images) {
      if (settings.ewan && image.logo) continue
      const data = imageData.find(e => e.type === 1 && (image.logo ? e.title === "logo.png" : e.title === image.file + ".jpg"))
      if (!data) {
        throw new Error(`CurseForge: Image "${image.file}" failed to upload`)
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
          isFeatured: image.logo ? false : true,
          type: 1
        })
      })
      if (r.ok) {
        log(`Updated metadata for image "${image.file}"`)
      } else {
        console.error(`Failed to update metadata for image "${image.file}" - ${await r.text()}`)
      }
    }
  },
  async uploadIcon() {
    const iconForm = new FormData()
    iconForm.append("file", new Blob([config.icon], {
      type: "image/png"
    }), "pack.png")

    const iconRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}/upload-avatar`, {
      method: "POST",
      headers: {
        cookie: settings.auth.curseforge.cookie
      },
      body: iconForm
    })
    if (!iconRequest.ok) {
      await error("Failed to upload icon", iconRequest)
    }

    log("Icon uploaded")

    const updateRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}/update-details`, {
      method: "PUT",
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: project.config.name,
        avatarUrl: await iconRequest.text(),
        slug: project.curseforge.slug,
        allowComments: true,
        enableProjectPages: false,
        primaryCategoryId: 393,
        summary: project.config.summary
      })
    })
    if (!updateRequest.ok) {
      await error("Failed to upload icon", updateRequest)
    }

    log("Icon set")
  },
  async getMedia() {
    const mediaDataRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}?filter=%7B%7D&range=%5B0%2C24%5D&sort=%5B%22id%22%2C%22DESC%22%5D`, {
      headers: {
        cookie: settings.auth.curseforge.cookie
      }
    })

    if (!mediaDataRequest.ok) {
      await error("Failed to get media data", mediaDataRequest)
    }

    return mediaDataRequest.json()
  },
  async removeImages() {
    const images = await this.getMedia()
    for (const image of images) {
      if (image.type !== 1) continue
      const deleteRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}/${image.id}/1`, {
        method: "DELETE",
        headers: {
          cookie: settings.auth.curseforge.cookie
        }
      })
      if (!deleteRequest.ok) {
        await error(`Failed to remove image "${image.title}"`, deleteRequest)
      }
      log(`Removed image "${image.title}"`)
    }
  },
  async setDetails() {
    const sourceRequest = await fetch(`https://authors.curseforge.com/_api/project-source/source/${project.curseforge.id}`, {
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      }
    })
    if (!sourceRequest.ok) {
      await error("Failed to get GitHub link", sourceRequest)
    }
    const existingGithub = (await sourceRequest.json()).sourceHostUrl

    if (project.config.github && existingGithub !== project.config.github) {
      const r = await fetch(`https://authors.curseforge.com/_api/project-source/${project.curseforge.id}/update`, {
        method: "PUT",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceHostUrl: project.config.github,
          sourceHost: 3,
          packagerMode: 1
        })
      })
      if (!r.ok) {
        await error("Failed to update GitHub link", r)
      }
      log("GitHub link updated")
    } else if (existingGithub && !project.config.github) {
      const r = await fetch(`https://authors.curseforge.com/_api/project-source/${project.curseforge.id}/update`, {
        method: "PUT",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceHostUrl: null,
          sourceHost: 1,
          packagerMode: 1
        })
      })
      if (!r.ok) {
        await error("Failed to remove GitHub link", r)
      }
      log("GitHub link removed")
    }

    const imageData = await this.getMedia()
    let skip
    const existingVideos = imageData.filter(e => e.type === 2)
    for (const existing of existingVideos) {
      const id = existing.url.split("?")[0].split("/").at(-1)
      if (project.config.video === id && !skip) {
        skip = true
      } else {
        const deleteRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}/${existing.id}/2`, {
          method: "DELETE",
          headers: {
            cookie: settings.auth.curseforge.cookie
          }
        })
        const mode = project.config.video === id && skip ? "duplicate" : "old"
        if (!deleteRequest.ok) {
          await error(`Failed to remove ${mode} video "https://youtu.be/${id}"`, deleteRequest)
        }
        log(`Removed ${mode} video "https://youtu.be/${id}"`)
      }
    }
    if (project.config.video && !skip) {
      const videoRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/external-link/${project.curseforge.id}`, {
        method: "POST",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: `${project.config.name} Video`,
          url: `https://www.youtube.com/embed/${project.config.video}`,
          thumbnailUrl: `https://img.youtube.com/vi/${project.config.video}/maxresdefault.jpg`
        })
      })
      if (!videoRequest.ok) {
        await error("Failed to update video", videoRequest)
      }

      log(`Video updated`)

      const videoData = await videoRequest.json()

      const metadataRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}`, {
        method: "PUT",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: `${project.config.name} Video`,
          id: videoData.result.attachmentId,
          isFeatured: true,
          type: 2
        })
      })
      if (metadataRequest.ok) {
        log(`Updated metadata for video`)
      } else {
        console.error(`Failed to update metadata for video - ${await metadataRequest.text()}`)
      }

      const orderRequest = await fetch(`https://authors.curseforge.com/_api/image-attachments/${project.curseforge.id}/update-display-order`, {
        method: "PUT",
        headers: {
          cookie: settings.auth.curseforge.cookie,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          {
            id: videoData.result.attachmentId,
            displayIndex: 1
          },
          ...imageData.filter(e => e.type === 1).map((e, i) => {
            e.displayIndex = i + 2
            return e
          })
        ])
      })
      if (!orderRequest.ok) {
        await error("Failed to move video before images", orderRequest)
      }
    }

    let html = fs.readFileSync("templates/curseforge.html", "utf-8")
    const replacements = html.matchAll(/{{\s*([a-z0-9]+)\s*}}/gi)

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        for (const part of project.config.description) {
          str += `<p>${part}</p>`
        }
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<br><img src="${imageData.find(e => e.type === 1 && (e.title === image.file + ".jpg" || e.title === image.name)).url}" width="600" alt="${image.name}"><br>`
        }
      } else if (replacement[1] === "logo") {
        if (project.config.images.some(e => e.logo)) {
          if (settings.ewan) {
            str = `<img src="https://ewanhowell.com/assets/images/resourcepacks/${project.config.id}/logo.webp" alt="${project.config.name} Logo"><br><br>`
          } else {
            str = `<img src="${imageData.find(e => e.type === 1 && (e.title === "logo.png" || e.title === "Project Logo"))?.url}" alt="${project.config.name} Logo"><br><br>`
          }
        } else {
          str = `<h1 style="font-size: 3ic; font-weight: 700; text-decoration: underline; display: inline-block;">${project.config.name}</h1>`
        }
      } else {
        str = config[replacement[1]] ?? defaultConfig[replacement[1]]
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
  },
  async import() {
    const projectRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}`, {
      headers: {
        cookie: settings.auth.curseforge.cookie
      }
    })
    if (!projectRequest.ok) {
      await error("Failed getting project details", projectRequest)
    }
    const data = await projectRequest.json()

    const sourceRequest = await fetch(`https://authors.curseforge.com/_api/project-source/source/${project.curseforge.id}`, {
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      }
    })
    if (!sourceRequest.ok) {
      await error("Failed to get GitHub link", sourceRequest)
    }

    const filesRequest = await fetch(`https://authors.curseforge.com/_api/project-files?${new URLSearchParams({
      filter: `{"projectId": ${project.curseforge.id}}`,
      range: "[0, 0]",
      sort: '["DateCreated", "DESC"]'
    })}`, {
      headers: {
        cookie: settings.auth.curseforge.cookie,
        "Content-Type": "application/json"
      }
    })
    if (!filesRequest.ok) {
      await error("Failed to get project files", filesRequest)
    }
    const files = await filesRequest.json()

    const media = await this.getMedia()

    config.name = data.name
    config.summary = data.summary
    config.description = [data.summary]
    config.optifine = false
    config.video = media.find(e => e.type === 2)?.url.split("?")[0].split("/").at(-1) ?? false
    config.github = (await sourceRequest.json()).sourceHostUrl ?? false
    config.version = "1.0.0"
    config.versions = {
      curseforge: {
        type: "exact",
        version: files[0].gameVersions[0].Label
      },
      planetminecraft: {
        type: "exact",
        version: files[0].gameVersions[0].Label
      },
      modrinth: {
        type: "exact",
        version: files[0].gameVersions[0].Label
      }
    }
    config.images = media.filter(e => e.type === 1 && e.title !== "Project Thumbnail" && e.title !== "Project Logo").map((e, i) => ({
      name: e.title,
      description: e.description || e.title,
      file: e.title.toLowerCase().replaceAll(" ", "_"),
      embed: i < 3 ? true : undefined,
      featured: i ? undefined : true
    }))
    for (const image of media.filter(e => e.type === 1)) {
      let name, imgPath
      if (image.title === "Project Thumbnail") {
        name = "thumbnail.png"
        imgPath = path.join("projects", config.id, name)
      } else if (image.title === "Project Logo") {
        name = "logo.png"
        imgPath = path.join("projects", config.id, name)
      } else {
        name = image.title.toLowerCase().replaceAll(" ", "_") + ".png"
        imgPath = path.join("projects", config.id, "images", name)
      }
      log(`Downloading image: ${name}`)
      await sharp(await fetch(image.url).then(e => e.arrayBuffer())).png().toFile(imgPath)
    }
    await this.importIcon(data)
  },
  async importIcon(data) {
    if (!data) {
      const projectRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}`, {
        headers: {
          cookie: settings.auth.curseforge.cookie
        }
      })
      if (!projectRequest.ok) {
        await error("Failed getting project details", projectRequest)
      }
      const data = await projectRequest.json()
    }
    log(`Downloading image: pack.png`)
    await sharp(await fetch(data.avatarUrl).then(e => e.arrayBuffer())).png().toFile(path.join("projects", project.config.id, "pack.png"))
  }
}