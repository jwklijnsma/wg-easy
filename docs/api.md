# API

The web UI is a client of this JSON API (see
[`src/lib/Server.js`](https://github.com/jwklijnsma/wg-easy/blob/main/src/lib/Server.js)).
With `PASSWORD` set, log in first; the session is a cookie.

| Method | Path | |
|---|---|---|
| `GET` | `/api/release` | Release number |
| `GET` | `/api/session` | Whether a password is needed and whether you're logged in |
| `POST` | `/api/session` | Log in: `{"password": "…"}` |
| `DELETE` | `/api/session` | Log out |
| `GET` | `/api/wireguard/client` | List clients with transfer and handshake data |
| `POST` | `/api/wireguard/client` | Create a client: `{"name": "phone"}` |
| `DELETE` | `/api/wireguard/client/:clientId` | Delete a client |
| `POST` | `/api/wireguard/client/:clientId/enable` | Enable |
| `POST` | `/api/wireguard/client/:clientId/disable` | Disable |
| `PUT` | `/api/wireguard/client/:clientId/name` | Rename: `{"name": "…"}` |
| `PUT` | `/api/wireguard/client/:clientId/address` | Change address: `{"address": "10.8.0.9"}` |
| `GET` | `/api/wireguard/client/:clientId/qrcode.svg` | QR code of the config |
| `GET` | `/api/wireguard/client/:clientId/configuration` | The client `.conf` as a download |

```bash
curl -c jar -H 'Content-Type: application/json' -d '{"password":"…"}' http://host:51821/api/session
curl -b jar http://host:51821/api/wireguard/client
```
