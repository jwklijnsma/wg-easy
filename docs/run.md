# Run it

```bash
docker run -d --name wg-easy --restart unless-stopped \
  -e WG_HOST=vpn.example.org \
  -e PASSWORD='choose-a-password' \
  -v ~/.wg-easy:/etc/wireguard \
  -p 51820:51820/udp -p 51821:51821/tcp \
  --cap-add NET_ADMIN --cap-add SYS_MODULE \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  --sysctl net.ipv4.ip_forward=1 \
  ghcr.io/jwklijnsma/wg-easy:main
```

Open `http://<host>:51821`, log in, and add a client. Scan its QR code with the WireGuard app
or download the configuration.

| Port | |
|---|---|
| `51820/udp` | WireGuard (forward this on your router) |
| `51821/tcp` | Web UI (keep it on your LAN or behind a reverse proxy with TLS) |

The server keys and clients are stored in `/etc/wireguard` (`WG_PATH`); keep that volume.

!!! warning "Protect the web UI"
    Without `PASSWORD` anyone who reaches port 51821 can create VPN clients. Set a password and
    don't expose the UI to the internet without TLS.
