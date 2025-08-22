# PackUploader

Easily upload resource packs to **CurseForge**, **Planet Minecraft**, and **Modrinth**.

---

## `auth.json`

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
- `token`
- `CobaltSession` cookie

### Token

1. Go to [CurseForge API Tokens](https://authors-old.curseforge.com/account/api-tokens).
2. Create a new API token.
3. Add this to your `auth.json`.

### Cookie

1. Go to [CurseForge Authors](https://authors.curseforge.com/) and log in.
2. Open your browser's developer tools.
   - **Firefox:** Storage tab
   - **Chrome:** Application tab
3. Under **Cookies**, select the site.
4. Copy the `CobaltSession` name and value into your `auth.json`.

## Planet Minecraft

You will need:
- `pmc_autologin` cookie

### Cookie

1. Go to [Planet Minecraft](https://www.planetminecraft.com/) and log in.
2. Open your browser's developer tools.
   - **Firefox:** Storage tab
   - **Chrome:** Application tab
3. Under **Cookies**, select the site.
4. Copy the `pmc_autologin` name and value into your `auth.json`.

## Modrinth

You will need:
- `token`

### Token

1. Go to [Modrinth Personal Access Tokens](https://modrinth.com/settings/pats).
2. Create a new token.
3. Enable the following scopes for the token:
   - Create Projects
   - Read Projects
   - Write Projects
   - Create Versions
   - Read Versions
   - Write Versions
4. Set the expiry date some time far in the future.
5. Paste it into your `auth.json`.
