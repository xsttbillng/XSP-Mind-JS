# Security Policy

## HTML rendering (`allowHtmlText`)

When `option.allowHtmlText` is `true`, node `text` is inserted with `innerHTML`.

- Only enable it when the JSON content is **trusted** (authored by your team / sanitized on the server).
- Do **not** enable it for user-submitted or untrusted remote JSON.
- Prefer plain text (`allowHtmlText: false`) for public data.

## Reporting a vulnerability

Please open a private security report via GitHub Security Advisories on
https://github.com/xsttbillng/XSP-Mind-JS,
or contact the maintainers listed in `package.json` (author: WUYUANBIAO).
