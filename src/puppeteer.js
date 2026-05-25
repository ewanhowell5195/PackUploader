import puppeteer from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

puppeteer.use(StealthPlugin())

const browser = await puppeteer.launch({ headless: true })

export async function closeBrowser() {
  if (browser?.connected) await browser.close()
}

process.on("SIGINT", async () => { await closeBrowser(); process.exit() })
process.on("SIGTERM", async () => { await closeBrowser(); process.exit() })
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

export async function getBuffer(url, cookie) {
  const page = await browser.newPage()

  await page.setExtraHTTPHeaders({ cookie })

  let status = 0
  let buffer = null

  const stripQuery = u => u.split("?")[0]
  const target = stripQuery(url)

  const client = await page.createCDPSession()
  await client.send("Fetch.enable", {
    patterns: [{ urlPattern: "*", requestStage: "Response" }]
  })

  client.on("Fetch.requestPaused", async event => {
    const { requestId, responseHeaders = [], responseStatusCode, request } = event
    try {
      const { body, base64Encoded } = await client.send("Fetch.getResponseBody", { requestId })
      if (stripQuery(request.url) === target && body && ![301, 302, 303, 307, 308].includes(responseStatusCode)) {
        const data = Buffer.from(body, base64Encoded ? "base64" : "utf8")
        if (data.length) {
          status = responseStatusCode
          buffer = data
        }
      }
      const headers = responseHeaders.filter(h => h.name.toLowerCase() !== "content-disposition")
      await client.send("Fetch.fulfillRequest", {
        requestId,
        responseCode: responseStatusCode,
        responseHeaders: headers,
        body
      })
    } catch {
      try { await client.send("Fetch.continueRequest", { requestId }) } catch {}
    }
  })

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 })
  } catch (e) {
    if (!/ERR_ABORTED|Navigation timeout/.test(e.message)) {
      await page.close()
      throw e
    }
  }

  await page.close()

  if (!buffer) {
    throw new Error(`getBuffer: no response body captured for ${url}`)
  }

  return { status, buffer }
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
      } else if (value instanceof Blob) {
        const arrayBuffer = await value.arrayBuffer()
        entries.push({
          key,
          value: Array.from(new Uint8Array(arrayBuffer)),
          file: true,
          filename: value.name || "upload.bin"
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