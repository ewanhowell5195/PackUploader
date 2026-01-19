import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({ headless: true })

process.on("exit", () => browser?.close())
process.on("SIGINT", () => process.exit())
process.on("SIGTERM", () => process.exit())
process.on("uncaughtException", err => {
  console.error(err)
  process.exit(1)
})
process.on("unhandledRejection", err => {
  console.error(err)
  process.exit(1)
})

export async function getHtml(url, cookie) {
  const page = await browser.newPage()

  await page.setExtraHTTPHeaders({ cookie })

  const response = await page.goto(url)
  const status = response.status()

  const html = await page.content()
  await page.close()

  return { status, html }
}

export async function makePost(referrerUrl, requestUrl, cookie, headers, body) {
  const page = await browser.newPage()

  await page.setExtraHTTPHeaders({ cookie })

  await page.goto(referrerUrl, { waitUntil: "domcontentloaded" })

  const { cookie: _skip, ...safeHeaders } = headers

  let entries = null
  let isForm = false

  if (body instanceof FormData) {
    isForm = true
    entries = []
    for (const [key, value] of body.entries()) {
      if (Buffer.isBuffer(value)) {
        entries.push({
          key,
          value: Array.from(value),
          file: true,
          filename: "upload.bin"
        })
      } else {
        entries.push({
          key,
          value,
          file: false
        })
      }
    }
  }

  const script = `
    ;(async () => {
      try {
        const headers = ${JSON.stringify(safeHeaders)}
        const isForm = ${JSON.stringify(isForm)}

        let body

        if (isForm) {
          const fd = new FormData()
          const entries = ${JSON.stringify(entries)}
          for (const e of entries) {
            if (e.file) {
              const uint = new Uint8Array(e.value)
              const file = new File([uint], e.filename)
              fd.append(e.key, file)
            } else {
              fd.append(e.key, e.value)
            }
          }
          body = fd
        } else {
          body = ${JSON.stringify(body)}
        }

        const r = await fetch("${requestUrl}", {
          method: "POST",
          credentials: "include",
          headers,
          body
        })

        window.__pmc_response = {
          status: r.status,
          text: await r.text()
        }
      } catch (err) {
        window.__pmc_response = {
          status: 0,
          text: String(err)
        }
      }
    })()
  `

  await page.addScriptTag({ content: script })

  await page.waitForFunction(() => window.__pmc_response !== undefined)

  const result = await page.evaluate(() => window.__pmc_response)

  await page.evaluate(() => delete window.__pmc_response)
  await page.close()

  return result
}