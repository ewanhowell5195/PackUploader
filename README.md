# PackUploader
Easily upload resource packs to **CurseForge**, **Planet Minecraft**, and **Modrinth**, all at the same time!

PackUploader is an automation tool that streamlines the process of publishing Minecraft resource packs across multiple platforms simultaneously. Instead of manually uploading to each site individually, configure your project once and deploy everywhere with a single command.

## Showcase Video

[![YouTube Video](https://img.youtube.com/vi/aaxGk7OHAeg/maxresdefault.jpg)](https://www.youtube.com/watch?v=aaxGk7OHAeg)

## Features
- **Multi-platform deployment** - Upload to CurseForge, Modrinth, and Planet Minecraft, all at once
- **Template system** - Create dynamic descriptions that adapt to each platform's formatting
- **Version management** - Support version ranges and automatically target multiple Minecraft versions at once
- **Project synchronization** - Keep project details, images, and descriptions in sync across platforms
- **Import existing projects** - Bring your current projects into the system for unified management

## Important Disclaimers

**Unofficial Tool:** This is a community-created automation tool and is not officially supported by CurseForge or Planet Minecraft. CurseForge and Planet Minecraft functionality relies on reverse-engineered website interactions, while Modrinth uses the official API. Use at your own discretion.

**Personal Tool:** This tool was built for my personal workflow and remains primarily designed for my use. I've made it available for others to use, but some features and defaults may reflect my specific needs and preferences.

**All Platforms Required:** You must have accounts and configure authentication for all three platforms (CurseForge, Planet Minecraft, and Modrinth) during setup, even if you don't plan to use all of them initially.

## Table of Contents
- [First Time Setup](#first-time-setup)
  - [Installation](#installation)
  - [Authentication](#authentication)
  - [Configuration](#configuration)
- [Description Templates](#description-templates)
- [Creating Projects](#creating-projects)
- [Importing Projects](#importing-projects)
- [Updating Projects](#updating-projects)
- [Editing Project Details](#editing-project-details)
- [The Queue](#the-queue)

---

# First Time Setup

## Installation
1. [Download and install Node.js](https://nodejs.org/en/download) 
2. [Download this repository as a ZIP](https://github.com/ewanhowell5195/PackUploader/archive/refs/heads/main.zip)
3. Extract the ZIP to a folder of your choice
4. Open a terminal in that folder
5. Run `npm i` to install all required dependencies

## Authentication
The `auth.json` file stores your authentication tokens and cookies, allowing the program to interact with the websites on your behalf.

Cookies must be provided in the format:
```
CookieName=CookieValue
```
Example:
```
CobaltSession=hguoewhguoewhudofewhfuioewhfuopewufjeiwohgoewpgwe
```

<details>
  <summary><strong>CurseForge Setup</strong></summary>

You will need:
- `token`
- `CobaltSession` cookie

### Token
1. Go to [CurseForge API Tokens](https://authors-old.curseforge.com/account/api-tokens)
2. Create a new API token
3. Add this to your `auth.json`

### Cookie
1. Go to [CurseForge Authors](https://authors.curseforge.com/) and log in
2. Open your browser's developer tools
   - **Firefox:** Storage tab
   - **Chrome:** Application tab
3. Under **Cookies**, select the site
4. Copy the `CobaltSession` name and value into your `auth.json`

</details>

<details>
  <summary><strong>Modrinth Setup</strong></summary>

You will need:
- `token`

### Token
1. Go to [Modrinth Personal Access Tokens](https://modrinth.com/settings/pats)
2. Create a new token.
3. Enable the following scopes for the token:
   - Create Projects
   - Read Projects
   - Write Projects
   - Create Versions
   - Read Versions
   - Write Versions
4. Set the expiry date some time far in the future
5. Paste it into your `auth.json`

</details>

<details>
  <summary><strong>Planet Minecraft Setup</strong></summary>

You will need:
- `pmc_autologin` cookie

### Cookie
1. Go to [Planet Minecraft](https://www.planetminecraft.com/) and log in
2. Open your browser's developer tools.
   - **Firefox:** Storage tab
   - **Chrome:** Application tab
3. Under **Cookies**, select the site
4. Copy the `pmc_autologin` name and value into your `auth.json`

</details>

## Configuration

After setting up authentication, you need to configure your settings in `settings.json`:

Not all settings are described here, only ones that need clarification.

First, change `"ewan": true` to `"ewan": false` to disable ewanhowell.com support.

### Image Widths
There are two image width options:
- `logoWidth`: The width that project logos will be when included in project descriptions
- `imageWidths`: The width that project images will be when included in project descriptions

These can also both be set per project by including them in a projects config JSON.

### Site settings

<details>
  <summary><strong>CurseForge Settings</strong></summary>

**Donation Settings:**
- Set the donation `type` to one of: `none`, `paypal`, `paypalHosted`, `patreon`, `github`, `kofi`, `buyMeACoffee`
- Set the `value` to your username/ID for the chosen platform

**Social Links:**
Configure your social media links. **Important:** Links must match CurseForge's expected formats or this will fail. For example, use direct Discord invite links (like `https://discord.gg/xxxxx`) rather than custom redirect URLs.

</details>

<details>
  <summary><strong>Planet Minecraft Settings</strong></summary>

**Website Link:** This is displayed underneath the primary download button as a secondary button
- `link`: URL to your website/social media
- `title`: Display text for the link

**Platform Preference:**
- `prefer`: Set to either `"curseforge"` or `"modrinth"` to determine which platform Planet Minecraft should link to as the primary download

**Note:** Planet Minecraft does not host the actual pack file - it redirects users to your preferred platform for downloads. This allows you to benefit from CurseForge/Modrinth creator reward systems.

</details>

<details>
  <summary><strong>Template Defaults</strong></summary>

These are default values used in project description templates. When you use template tags like `{{ youtube }}` in your descriptions, they'll be replaced with these values.

Configure things that will be staying the same across all your project descriptions, for example social media links and icon URLs. I strongly recommend NOT using my icon URLs in case I change them in the future.

</details>

### Clean Up
Before creating your first project, you may want to remove the existing project folders in `/projects/` - these are my personal projects. You can delete them or keep them as references for configuration examples.

---

# Description Templates

PackUploader uses a templating system to generate project descriptions for each platform. Templates allow you to create dynamic content that automatically pulls from your project configuration and settings.

## Template Files

There are three template files in the `templates/` folder:
- `curseforge.html` - HTML template for CurseForge descriptions  
- `modrinth.md` - Markdown template for Modrinth descriptions
- `planetminecraft.bbcode` - BBCode template for Planet Minecraft descriptions

The templates included in the repository can be used as references for creating your own.

## Setting Up Templates

**Recommendation:** Write your descriptions directly on each platform first to ensure they look good, then extract the source code for your templates. Replace static content with template variables so it can be dynamically inserted.

### CurseForge
1. Use the WYSIWYG editor to create your description
2. Click the triple dot button, then "Source Code" to get the raw HTML
3. Copy this stripped-down HTML into `curseforge.html`
4. Replace static content with template variables (e.g., replace your project name with `{{ name }}`)
5. Note: HTML is used for CurseForge, but not all HTML features will work

### Modrinth
1. Write your description in the Markdown editor
2. Copy the markdown directly into `modrinth.md`
3. Replace static content with template variables

### Planet Minecraft  
1. Create your description using the editor
2. Click the "BBCode Source" button to get the raw BBCode
3. Copy this into `planetminecraft.bbcode`
4. Replace static content with template variables

## Template Variables

Templates use `{{ var }}` syntax to insert dynamic content. You can use any property from your project configuration or from the `templateDefaults` section of your `settings.json`, including JSON paths.

### Standard Examples:
- `{{ name }}` - Project name
- `{{ summary }}` - Project summary  
- `{{ curseforge.license }}` - CurseForge license setting
- `{{ id }}` - Project ID

### Special Variables:
These variables have special handling and are not standard text insertion:
- `{{ logo }}` - Logo image (or project name as text if no logo)
- `{{ description }}` - Project description paragraphs (formatted for each platform)
- `{{ images }}` - Embedded project images
- `{{ video }}` - YouTube video embed (Modrinth only - CurseForge and Planet Minecraft use native video support)

## Snippets

Snippets are reusable components shared across projects. They're formatted as `{{ snippet:snippetname }}` and loaded from the `templates/snippets/` folder:

- `templates/snippets/curseforge/snippetname.html`
- `templates/snippets/modrinth/snippetname.md`  
- `templates/snippets/planetminecraft/snippetname.bbcode`

Snippets are merged into the template before variables are replaced, and can use template variables themselves.

## Example Template

Here's an example CurseForge template using snippets and variables:

```html
<div style="text-align: center; font-family: Arial">
  {{ snippet:header }}
  <br>
  {{ description }}
  {{ images }}
  <br>
  {{ snippet:footer }}
</div>
```

With a corresponding header snippet:

```html
{{ logo }}
<h2 style="font-weight: 700; font-size: 32px">{{ summary }}</h2>
<a href="https://ewanhowell.com/resourcepacks/{{ id }}" target="_blank" style="font-size: 20px; line-height: 40px; color: #1EA1F1; display: block;">View the pack on my website!</a>
```

## Per-Project Templates

Once projects are created, templates are copied into individual project folders. This allows you to customize templates for specific projects without affecting others.

**For Unique Project Descriptions:** If you need custom descriptions for a specific project, it's recommended to:
1. Create the project first using the create script with your standard templates
2. Modify the templates in the project folder (`/projects/yourprojectid/templates/`)  
3. Use the details script to update the descriptions

This approach saves you from having to edit your main templates for one project, then change them back afterward.

---

# Creating Projects

Used for creating new projects on all platforms.

## Usage
1. Navigate to the `data/create/` folder
2. Configure your project settings (see configuration details below)
3. Add your required files (pack.zip, pack.png, create.json)
4. Double-click `create.bat` to create and upload the project

Your project will have been created and uploaded. You will now have a project folder within the `/projects/` directory with all your project information.

Note: Planet Minecraft projects are created in draft state by default. You must manually set them to live on the Planet Minecraft website once your CurseForge/Modrinth projects get moderator approved.

### Alternative Usage
If you already have a project imported but it's missing from some platforms (e.g., exists on CurseForge and Planet Minecraft but not Modrinth), you can use this script to create it on the missing platforms. In this case:
- Only `pack.zip` and `create.json` are required in the create folder
- Only the `id` field in `create.json` is used - everything else is ignored
- All other configuration comes from the existing project folder and its `project.json` file

## Required Files
- `create.json` - Main configuration file for your project
- `pack.zip` - Your resource pack file (must be named exactly this)
- `pack.png` - Project icon (recommended 512x512px)
- At least one image in the `images/` folder (CurseForge and Modrinth will reject projects without images)

## Optional Files
- `logo.png` - Logo image for your project description (replaces `{{ logo }}` template tag). If not provided, `{{ logo }}` becomes the project name as text. Logo images are uploaded as the last image in your project gallery. On CurseForge the image will not be marked as featured so will not appear in CurseForge's main image carousel.
- `thumbnail.png` - Thumbnail image (used as first image on CurseForge and Planet Minecraft)
- `images/` - Folder containing additional project images (must be PNG format)

**Note:** `thumbnail.png` is not used on Modrinth. On Planet Minecraft it appears as the project thumbnail, on CurseForge as the first large image on the project page.

## Configuration (create.json)

The `create.json` file contains all settings for your project. You can see an example in the repository.

**Important:** All properties are required even if set to `false` - this helps you remember available options for future use.

### Template System
Any property in `create.json` can be used in description templates:
- `{{ summary }}` - Inserts the project summary
- `{{ curseforge.license }}` - Inserts the CurseForge license
- You can add custom properties for your own template tags

### Basic Settings
- `id` - Unique project identifier (used for URLs)
- `name` - Display name of your project
- `summary` - Short description
- `description` - Array of description paragraphs (each array entry is a paragraph, use `\n` for newlines within paragraphs)
- `optifine` - Set to `false` (used only for ewanhowell.com)
- `video` - YouTube video ID only (not full URL), or `false` if none
- `github` - Repository URL, or `false` if none
- `version` - Version number for this release

### Version Targeting
Configure which Minecraft versions your pack supports on each platform:

**Version Types:**
- `"latest"` - Uses the latest available version on that platform
- `"exact"` - Specific version (provide `"version"` field)
- `"after"` - All versions from specified version onwards (provide `"version"` field, CurseForge/Modrinth only)
- `"range"` - Version range from one version to another (provide `"version"` and `"to"` fields, CurseForge/Modrinth only)

**Additional Options:**
- `snapshots: true/false` - Include/exclude snapshot versions (CurseForge/Modrinth only)

**Examples:**
```json
"versions": {
  "curseforge": {
    "type": "after",
    "version": "1.20",
    "snapshots": false
  },
  "planetminecraft": {
    "type": "exact",
    "version": "1.21"
  },
  "modrinth": {
    "type": "range",
    "version": "1.20",
    "to": "1.21",
    "snapshots": true
  }
}
```

**Note:** Use version IDs exactly as they appear on each platform, not the game's version names. For example, CurseForge uses `1.21.9-snapshot` for snapshots rather than the game's `25w34a`. Don't include "Minecraft" in version IDs (use `"1.21"` not `"Minecraft 1.21"`).

### Images Configuration
Configure your project images in the `images` array. Each image object supports:

- `name` - Display name for the image (required)
- `description` - Description text for the image (encouraged, use empty string `""` if none)
- `file` - Filename without the .png extension (required)
- `embed` - Whether to include this image in the project description via the `{{ images }}` template section
- `featured` - Whether to use as the featured image on Modrinth (the image shown in gallery view on the resource packs page)

**Example:**
```json
"images": [
  {
    "name": "House",
    "description": "A wooden house next to a larger house",
    "file": "house",
    "featured": true,
    "embed": true
  },
  {
    "name": "Farm",
    "description": "A farm with scarecrows in it", 
    "file": "farm",
    "embed": true
  }
]
```

### CurseForge Settings

<details>
  <summary>Main Category: Choose one of</summary>

- `16x`
- `32x`
- `64x`
- `128x`
- `256x`
- `512x and Higher`
- `Data Packs`
- `Font Packs`

</details>

**Additional Categories:** Enable relevant secondary categories (use `0` for false, `true` for true - `false` is still supported, but using `0` makes the enabled categories stand out more)

<details>
  <summary>License: Choose one of</summary>

- `Academic Free License v3.0`
- `Ace3 Style BSD`
- `All Rights Reserved`
- `Apache License version 2.0`
- `Apple Public Source License version 2.0 (APSL)`
- `Attribution-NonCommercial-ShareAlike 4.0 International`
- `BSD License`
- `Common Development and Distribution License (CDDL)`
- `Creative Commons 4.0`
- `Creative Commons Attribution-NonCommercial 3.0 Unported`
- `Eclipse Public License - v 2.0`
- `GNU Affero General Public License version 3 (AGPLv3)`
- `GNU General Public License version 2 (GPLv2)`
- `GNU General Public License version 3 (GPLv3)`
- `GNU Lesser General Public License version 2.1 (LGPLv2.1)`
- `GNU Lesser General Public License version 3 (LGPLv3)`
- `ISC License (ISCL)`
- `Microsoft Public License (Ms-PL)`
- `Microsoft Reciprocal License (Ms-RL)`
- `MIT License`
- `Mozilla Public License 1.0 (MPL)`
- `Mozilla Public License 1.1 (MPL 1.1)`
- `Mozilla Public License 2.0`
- `PolyForm Shield License 1.0.0`
- `Public Domain`
- `WTFPL`
- `zlib/libpng License`

</details>

### Modrinth Settings

**Tags:** Enable relevant tags (use `0` for false, `true` for true, `"featured"` for featured tags - you can have up to 3 featured tags)

<details>
 <summary>License: Choose one of</summary>

- `All Rights Reserved/No License`
- `Apache License 2.0`
- `BSD 2-Clause "Simplified" License`
- `BSD 3-Clause "New" or "Revised" License`
- `CC Zero (Public Domain equivalent)`
- `CC-BY 4.0`
- `CC-BY-NC 4.0`
- `CC-BY-NC-ND 4.0`
- `CC-BY-NC-SA 4.0`
- `CC-BY-ND 4.0`
- `CC-BY-SA 4.0`
- `GNU Affero General Public License v3`
- `GNU General Public License v2`
- `GNU General Public License v3`
- `GNU Lesser General Public License v2.1`
- `GNU Lesser General Public License v3`
- `ISC License`
- `MIT License`
- `Mozilla Public License 2.0`
- `zlib License`

</details>

### Planet Minecraft Settings

<details>
  <summary>Category: Choose one of</summary>

- `Experimental`
- `PvP`
- `Realistic`
- `Simplistic`
- `Themed`
- `Unreleased`
- `Other`

</details>

<details>
  <summary>Resolution: Choose one of</summary>

- `8`
- `16`
- `32`
- `64`
- `128`
- `256`
- `512`
- `1024`
- `2048`
- `4096`

</details>

**Progress:** Completion percentage of your pack (0-100)

**Credit:** Credits text for your pack

**Modifies:** Features your pack changes in-game (use `0` for false, `true` for true)

**Tags:** Array of tag strings for your pack

---

# Importing Projects

Used for importing existing projects from platforms into your local system.

## Usage
1. Navigate to the `data/` folder
2. Configure your `import.json` file (see configuration below)
3. Double-click `import.bat` to import the project

After importing, your project will appear in `/projects/yourprojectid/`. Check this folder to ensure everything looks correct and make any required changes.

## Configuration (import.json)

Configure which platforms to import from using project IDs and slugs:

```json
{
  "id": "f8thful",
  "curseforge": {
    "id": 364688,
    "slug": "f8thful"
  },
  "modrinth": {
    "id": "ZrW0og1b",
    "slug": "f8thful"
  },
  "planetminecraft": {
    "id": 4595209,
    "slug": "f8thful-the-complete-vanilla-8x8-resource-pack"
  }
}
```

### Settings
- `id` - Your local project identifier. This determines the folder name in `/projects/` and is how you'll reference this project in other scripts
- For each platform: provide both the `id` and `slug` for the project
- If the project doesn't exist on a platform yet, set that platform's `id` to `null`

### Finding Project IDs
**CurseForge:** Found in the sidebar of your project page, or in the URL on the project management page

**Modrinth:** On your project page, click the triple dot menu and select "Copy ID"

**Planet Minecraft:** Found in the URL when editing your project

### After Importing
- Check your project folder in `/projects/yourprojectid/` 
- Verify all information imported correctly
- Add your description. Due to the complexity of descriptions, they cannot be nicely imported. You must add it yourself after importing
- Add missing files like `thumbnail.png` or `logo.png` if desired
- Use the create script to add the project to any missing platforms

---

# Updating Projects

Used for uploading updates to existing projects on all platforms.

## Usage
1. Navigate to the `data/update/` folder
2. Add your required files (pack.zip, update.json)
3. Configure your `update.json` file (see configuration below)
4. Double-click `update.bat` to upload the update

## Required Files
- `pack.zip` - Your updated resource pack file (must be named exactly this)
- `update.json` - Update configuration file

## Configuration (update.json)

Configure your update settings:

```json
{
  "id": "better-bows",
  "changelog": "Updated for 1.21.8\nThe crossbow now supports spectral arrows, tipped arrows, and multishot showing three arrows",
  "version": "1.2.0",
  "versions": {
    "curseforge": {
      "type": "after",
      "version": "1.20.2",
      "snapshots": false
    },
    "modrinth": {
      "type": "after",
      "version": "1.20.2",
      "snapshots": false
    },
    "planetminecraft": {
      "type": "latest"
    }
  }
}
```

### Settings
- `id` - Your project identifier (must match existing project)
- `changelog` - Description of changes in this update (supports `\n` for newlines)
- `version` - New version number for this release
- `versions` - Minecraft version targeting (same format as create script)

---

# Editing Project Details

Used for updating project information like description, name, summary, social links, categories, and images.

## Usage
1. Navigate to your project folder in `/projects/yourprojectid/`
2. Make any desired changes to your project files
3. Configure `data/details.json` (see configuration below)
4. Double-click `details.bat` to update the project details

### What Gets Updated
This script updates project information such as description, name, categories, social links, and more. If `images` is set to `true`, it will also reupload project icons and images across all platforms.

### Before Running
Make all desired changes to your project files in the `/projects/yourprojectid/` folder, then run the details script to sync these changes across all platforms.

## Configuration (details.json)

```json
{
  "id": "f8thful",
  "images": false,
  "live": true
}
```

### Settings
- `id` - Your project identifier (must match existing project)
- `images` - Set to `true` to also reupload project icon and images across all platforms
- `live` - If the Modrinth project is not yet approved, this must be set to `false` to prevent crashes, otherwise set to `true`. Also controls Planet Minecraft's live/draft status so it stays hidden until the Modrinth project is approved. Does nothing for CurseForge.

---

# The Queue

Planet Minecraft has a limit of how many project updates you can submit per day. If you are submitting updates and you reach this limit, these updates will be submit on CurseForge and Modrinth, but queued for Planet Minecraft. You can then process the queue once your limit has been reset to submit those updates.

## Usage
1. Have a project be added to the queue. You will be told when this happens
1. Double-click `queue.bat` to process your queue