# Configuration

All settings are environment variables (see
[`src/config.js`](https://github.com/jwklijnsma/wg-easy/blob/main/src/config.js)).

| Variable | Default | Meaning |
|---|---|---|
| `WG_HOST` | — (required) | Public hostname or IP clients connect to |
| `PASSWORD` | — | Password for the web UI; no login when unset |
| `PORT` | `51821` | Web UI port |
| `WG_PORT` | `51820` | WireGuard port put in client configs |
| `WG_PATH` | `/etc/wireguard/` | Where `wg0.conf` and the client data live |
| `WG_DEVICE` | `eth0` | Interface used for NAT in the default `PostUp` |
| `WG_MTU` | — | MTU in client configs |
| `WG_PERSISTENT_KEEPALIVE` | `0` | Keepalive in seconds (`0` = off) |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | Client address pattern; `x` is the client number |
| `WG_DEFAULT_DNS` | `1.1.1.1` | DNS server for clients; empty string = none |
| `WG_ALLOWED_IPS` | `0.0.0.0/0, ::/0` | What clients route through the tunnel |
| `WG_PRE_UP` / `WG_POST_UP` | see below | Commands when the interface comes up |
| `WG_PRE_DOWN` / `WG_POST_DOWN` | — | Commands when it goes down |

## Default PostUp

Unless you set `WG_POST_UP`, the server masquerades the client subnet out of `WG_DEVICE`
and allows forwarding:

```bash
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT
iptables -A FORWARD -i wg0 -j ACCEPT
iptables -A FORWARD -o wg0 -j ACCEPT
```

## Split tunnel

Only send your home network through the VPN:

```bash
-e WG_ALLOWED_IPS=10.0.3.0/24 -e WG_DEFAULT_DNS=10.0.3.100
```
