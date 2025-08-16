# PackUploader

Easily upload resource packs to **CurseForge**, **Planet Minecraft**, and **Modrinth**.

---

## `settings.json`

This file stores your authentication tokens and cookies, allowing the program to interact with the websites on your behalf.

Cookies must be provided in the format:

```
CookieName=CookieValue
```

Example:

```
CobaltSession=hguoewhguoewhudofewhfuioewhfuopewufjeiwohgoewpgwe
```

## CurseForge

You will need:

* `token`
* `CobaltSession` cookie

### Token

1. Go to [CurseForge API Tokens](https://authors-old.curseforge.com/account/api-tokens).
2. Create a new API token.
3. Add this to your `settings.json`.

### Cookie

1. Go to [CurseForge Authors](https://authors.curseforge.com/) and log in.
2. Open your browser’s developer tools.

   * **Firefox:** Storage tab
   * **Chrome:** Application tab
3. Under **Cookies**, select the site.
4. Copy the `CobaltSession` name and value into your `settings.json`.

## Planet Minecraft

You will need:

* `token`
* `pmc_autologin` cookie

Make sure you are logged in at [Planet Minecraft](https://www.planetminecraft.com/) before starting.

### Token

Run this in the **Console** tab of your browser’s developer tools to copy your token:

```js
copy(document.getElementById("core-csrf-token").getAttribute("content"))
```

Paste the copied token into your `settings.json`.

### Cookie

1. Open your browser’s developer tools.

   * **Firefox:** Storage tab
   * **Chrome:** Application tab
2. Under **Cookies**, select the site.
3. Copy the `pmc_autologin` name and value into your `settings.json`.

## Modrinth

You will need:

* `token`

### Token

1. Go to [Modrinth Personal Access Tokens](https://modrinth.com/settings/pats).
2. Create a new token.
3. Paste it into your `settings.json`.

---
