# wg-easy

**WireGuard VPN with a simple web UI** to add, enable, disable and remove clients and show
their QR codes — an own build of [wg-easy](https://github.com/wg-easy/wg-easy) (by Emile
Nijssen), with its own tests and nightly image `ghcr.io/jwklijnsma/wg-easy`.

<div class="grid cards" markdown>

-   :material-rocket-launch: **[Run it](run.md)**

    One container with `NET_ADMIN`, UDP 51820 and the UI on 51821.

-   :material-cog: **[Configuration](configuration.md)**

    `WG_HOST`, `PASSWORD`, addresses, DNS, allowed IPs and hooks.

-   :material-api: **[API](api.md)**

    The JSON API behind the web UI.

-   :material-code-braces: **[Development](development.md)**

    `npm run serve`, lint and tests.

</div>

## Features

| | |
|---|---|
| **Web UI** | Create, rename, enable, disable and delete clients |
| **QR codes and configs** | Scan with the phone app or download the `.conf` |
| **Password** | Optional login for the UI (`PASSWORD`) |
| **NAT out of the box** | Default `PostUp` masquerades the client subnet |
| **Image** | Ubuntu 22.04 + Node, WireGuard tools, `dumb-init`; rebuilt nightly |
