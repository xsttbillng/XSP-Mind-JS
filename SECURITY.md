# Security Policy

## HTML rendering (`allowHtmlText`)

When `option.allowHtmlText` is `true`, node `text` is inserted with `innerHTML`.

- Only enable it when the JSON content is **trusted** (authored by your team / sanitized on the server).
- Do **not** enable it for user-submitted or untrusted remote JSON without sanitization.
- Prefer plain text (`allowHtmlText: false`) for public data.

## Built-in sanitizer (`sanitizeHtml`)

When `allowHtmlText` is enabled, you can set `option.sanitizeHtml` (default **`true`**) to strip common XSS vectors before rendering:

- Removes `script`, `iframe`, `object`, `embed`, `link`, `meta` elements
- Strips `on*` event attributes (`onclick`, `onerror`, …)
- Blocks `javascript:` and `data:text` in `href` / `src`
- Removes dangerous `style` values containing `expression` or `javascript:`

```js
app.initflow({
  option: {
    allowHtmlText: true,
    sanitizeHtml: true // recommended for any non-fully-trusted JSON
  },
  data: [...]
});
```

For **fully trusted** rich HTML (your own templates only), you may set `sanitizeHtml: false`.

You can also sanitize on the server or with your own library, then pass plain trusted HTML.

Static helper (same logic as runtime):

```js
const safe = XSPMindJS.sanitizeHtml(untrustedHtml);
```

Live demo: [examples/html-safety.html](examples/html-safety.html)

## Reporting a vulnerability

Please open a private security report via GitHub Security Advisories on
https://github.com/xsttbillng/XSP-Mind-JS,
or contact the maintainers listed in `package.json` (author: WUYUANBIAO).
