function log(message) {
  console.log(`CurseForge: ${message}`)
}

async function error(err, req) {
  throw new Error(`CurseForge: ${err} - ${await req.text()}`)
}

const categories = {
  "16x": 393,
  "32x": 394,
  "64x": 395,
  "128x": 396,
  "256x": 397,
  "512x and Higher": 398,
  "Data Packs": 5193,
  "Font Packs": 5244
}

const subCategories = {
  animated: 404,
  dataPacks: 5193,
  fontPacks: 5244,
  medieval: 402,
  modSupport: 4465,
  modern: 401,
  photoRealistic: 400,
  steampunk: 399,
  traditional: 403,
  miscellaneous: 405
}

const licenses = {
  "Academic Free License v3.0": 3,
  "Ace3 Style BSD": 162,
  "All Rights Reserved": 1,
  "Apache License version 2.0": 14,
  "Apple Public Source License version 2.0 (APSL)": 15,
  "Attribution-NonCommercial-ShareAlike 4.0 International": 22004,
  "BSD License": 5,
  "Common Development and Distribution License (CDDL)": 550,
  "Creative Commons 4.0": 22002,
  "Creative Commons Attribution-NonCommercial 3.0 Unported": 22001,
  "Eclipse Public License - v 2.0": 22003,
  "GNU Affero General Public License version 3 (AGPLv3)": 10,
  "GNU General Public License version 2 (GPLv2)": 6,
  "GNU General Public License version 3 (GPLv3)": 7,
  "GNU Lesser General Public License version 2.1 (LGPLv2.1)": 8,
  "GNU Lesser General Public License version 3 (LGPLv3)": 9,
  "ISC License (ISCL)": 18,
  "Microsoft Public License (Ms-PL)": 16,
  "Microsoft Reciprocal License (Ms-RL)": 17,
  "MIT License": 4,
  "Mozilla Public License 1.0 (MPL)": 11,
  "Mozilla Public License 1.1 (MPL 1.1)": 13,
  "Mozilla Public License 2.0": 22000,
  "PolyForm Shield License 1.0.0": 22005,
  "Public Domain": 2,
  "WTFPL": 4184,
  "zlib/libpng License": 12
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
        cookie: auth.curseforge.cookie
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
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: project.config.curseforge.name ?? project.config.name,
        avatarUrl: iconURL,
        summary: project.config.summary,
        description: "placeholder",
        primaryCategoryId: categories[project.config.curseforge.mainCategory],
        subCategoryIds: Object.entries(project.config.curseforge.additionalCategories).filter(e => e[1]).map(e => subCategories[e[0]]),
        allowComments: true,
        allowDistribution: false,
        gameId: 432,
        classId: 12,
        descriptionType: 1,
        licenseId: licenses[project.config.curseforge.license] ?? 1
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
        cookie: auth.curseforge.cookie
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
        cookie: auth.curseforge.cookie
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
      case "exact":
        versions.push(versionsRequest.find(e => e.name === project.config.versions.curseforge.version).id)
        break
      case "after":
        versions.push(...versionsRequest.slice(0, versionsRequest.findIndex(e => e.name === project.config.versions.curseforge.version) + 1).map(e => e.id))
        break
      case "range":
        const start = versionsRequest.findIndex(e => e.name === project.config.versions.curseforge.version)
        const end = versionsRequest.findIndex(e => e.name === project.config.versions.curseforge.to)
        versions.push(...versionsRequest.slice(Math.min(start, end), Math.max(start, end) + 1).map(e => e.id))
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
        "X-Api-Token": auth.curseforge.token
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
            cookie: auth.curseforge.cookie
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
          cookie: auth.curseforge.cookie,
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
        cookie: auth.curseforge.cookie
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
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: project.config.curseforge.name ?? project.config.name,
        avatarUrl: await iconRequest.text(),
        slug: project.curseforge.slug,
        allowComments: true,
        enableProjectPages: false,
        primaryCategoryId: categories[project.config.curseforge.mainCategory],
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
        cookie: auth.curseforge.cookie
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
          cookie: auth.curseforge.cookie
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
        cookie: auth.curseforge.cookie,
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
          cookie: auth.curseforge.cookie,
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
          cookie: auth.curseforge.cookie,
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

    const socialTypes = {
      mastodon: 1,
      discord: 2,
      website: 3,
      facebook: 4,
      twitter: 5,
      instagram: 6,
      patreon: 7,
      twitch: 8,
      reddit: 9,
      youtube: 10,
      tiktok: 11,
      pinterest: 12,
      github: 13,
      bluesky: 14
    }

    const socialsRequest = await fetch(`https://authors.curseforge.com/_api/projects/social-links/${project.curseforge.id}`, {
      method: "PUT",
      headers: {
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        links: Object.entries(settings.curseforge.socials).filter(e => e[1]).map(([k, v]) => ({
          type: socialTypes[k],
          url: v
        }))
      })
    })
    if (!socialsRequest.ok) {
      console.error(`Failed to set social links - ${await socialsRequest.text()}`)
    }
    log("Social links set")

    const donationTypes = {
      none: -1,
      paypal: 1,
      paypalHosted: 2,
      patreon: 6,
      github: 7,
      kofi: 8,
      buyMeACoffee: 9
    }

    const updateRequest = await fetch(`https://authors.curseforge.com/_api/projects/${project.curseforge.id}/update-details`, {
      method: "PUT",
      headers: {
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: project.config.curseforge.name ?? project.config.name,
        slug: project.curseforge.slug,
        allowComments: true,
        enableProjectPages: false,
        primaryCategoryId: categories[project.config.curseforge.mainCategory],
        subCategoryIds: Object.entries(project.config.curseforge.additionalCategories).filter(e => e[1]).map(e => subCategories[e[0]]),
        summary: project.config.summary,
        donationTypeId: donationTypes[settings.curseforge.donation.type],
        donationIdentifier: settings.curseforge.donation.type === "none" ? "" : settings.curseforge.donation.value,
        licenseId: licenses[project.config.curseforge.license] ?? 1
      })
    })
    if (!updateRequest.ok) {
      await error("Failed to upload details", updateRequest)
    }

    log("Details updated")

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
            cookie: auth.curseforge.cookie
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
          cookie: auth.curseforge.cookie,
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
          cookie: auth.curseforge.cookie,
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
          cookie: auth.curseforge.cookie,
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

    let html = fs.readFileSync(path.join("projects", project.config.id, "templates", "curseforge.html"), "utf-8")

    html = html.replace(/{{\s*snippet:([a-z0-9_-]+)\s*}}/gi, (m, name) => {
      const snippetPath = path.join("templates", "snippets", "curseforge", name + ".html")
      return fs.existsSync(snippetPath) ? fs.readFileSync(snippetPath, "utf-8") : "undefined"
    })

    const replacements = Array.from(html.matchAll(/{{\s*([a-z0-9_.\[\]]+)\s*}}/gi))

    for (const replacement of replacements) {
      let str = ""
      if (replacement[1] === "description") {
        str += project.config.description.map(e => `<p>${e.replaceAll("\n", "<br>")}</p>`).join("")
      } else if (replacement[1] === "images") {
        const images = project.config.images.filter(e => e.embed)
        for (const image of images) {
          str += `<br><img src="${imageData.find(e => e.type === 1 && (e.title === image.file + ".jpg" || e.title === image.name))?.url}" width="600" alt="${image.name}"><br>`
        }
      } else if (replacement[1] === "logo") {
        const logo = imageData.find(e => e.type === 1 && (e.title === "logo.png" || e.title === "Project Logo"))?.url
        if (project.config.images.some(e => e.logo) && (logo || settings.ewan)) {
          if (settings.ewan) {
            str = `<img src="https://ewanhowell.com/assets/images/resourcepacks/${project.config.id}/logo.webp" width="700" alt="${project.config.name} Logo"><br><br>`
          } else {
            str = `<img src="${logo}" width="700" alt="${project.config.name} Logo"><br><br>`
          }
        } else {
          str = `<h1 style="font-size: 3ic; font-weight: 700; text-decoration: underline; display: inline-block;">${project.config.name}</h1>`
        }
      } else {
        str = getReplacementPath(config, replacement[1]) ?? getReplacementPath(settings.templateDefaults, replacement[1])
        if (typeof str !== "string") {
          str = "undefined"
        }
      }
      html = html.replaceAll(replacement[0], str)
    }

    const r = await fetch(`https://authors.curseforge.com/_api/projects/description/${project.curseforge.id}`, {
      method: "PUT",
      headers: {
        cookie: auth.curseforge.cookie,
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
        cookie: auth.curseforge.cookie
      }
    })
    if (!projectRequest.ok) {
      await error("Failed getting project details", projectRequest)
    }
    const data = await projectRequest.json()

    const sourceRequest = await fetch(`https://authors.curseforge.com/_api/project-source/source/${project.curseforge.id}`, {
      headers: {
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      }
    })
    if (!sourceRequest.ok) {
      await error("Failed to get GitHub link", sourceRequest)
    }

    const licenseRequest = await fetch(`https://authors.curseforge.com/_api/project-license/license/${project.curseforge.id}`, {
      headers: {
        cookie: auth.curseforge.cookie,
        "Content-Type": "application/json"
      }
    })
    if (!licenseRequest.ok) {
      await error("Failed to get license", licenseRequest)
    }
    const license = (await licenseRequest.json()).licenseId

    const filesRequest = await fetch(`https://authors.curseforge.com/_api/project-files?${new URLSearchParams({
      filter: `{"projectId": ${project.curseforge.id}}`,
      range: "[0, 0]",
      sort: '["DateCreated", "DESC"]'
    })}`, {
      headers: {
        cookie: auth.curseforge.cookie,
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
    config.video = media.find(e => e.type === 2)?.url.split("?")[0].split("/").at(-1) ?? false
    config.github = (await sourceRequest.json()).sourceHostUrl ?? false
    
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

    config.curseforge.mainCategory = Object.entries(categories).find(e => e[1] === data.primaryCategoryId)[0]
    config.curseforge.additionalCategories = Object.fromEntries(Object.entries(subCategories).map(([k, v]) => [k, data.subCategoryIds.includes(v)] || 0))
    config.curseforge.license = Object.entries(licenses).find(e => e[1] === license)[0]

    log(`Downloading image: pack.png`)
    await sharp(await fetch(data.avatarUrl).then(e => e.arrayBuffer())).png().toFile(path.join("projects", project.config.id, "pack.png"))
    
    if (!settings.ewan) {
      config.images = media.filter(e => e.type === 1 && e.title !== "Project Thumbnail" && e.title !== "Project Logo").map((e, i) => ({
        name: e.title || e.url.split("/").at(-1).split(".").slice(0, -1).join(".").split("-").slice(0, -1).join("_").split("_").map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(" "),
        description: e.description || e.title,
        file: e.title.toLowerCase().replaceAll(" ", "_").replace(/[^a-z0-9_]/g, "") || e.url.split("/").at(-1).split(".").slice(0, -1).join(".").split("-").slice(0, -1).join("_"),
        embed: i < 3 ? true : undefined,
        featured: i ? undefined : true
      }))
      for (const image of media.filter(e => e.type === 1)) {
        let name, imgPath
        if (image.title === "Project Thumbnail") {
          name = "thumbnail.png"
          imgPath = path.join(projectPath, name)
        } else if (image.title === "Project Logo") {
          name = "logo.png"
          imgPath = path.join(projectPath, name)
        } else {
          name = image.title.toLowerCase().replaceAll(" ", "_").replace(/[^a-z0-9_]/g, "") + ".png"
          imgPath = path.join(projectPath, "images", name)
        }
        log(`Downloading image: ${name}`)
        await sharp(await fetch(image.url).then(e => e.arrayBuffer())).png().toFile(imgPath)
      }
    }
  }
}