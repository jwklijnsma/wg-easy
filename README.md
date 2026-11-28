# wg-easy

WireGuard VPN with a simple web UI to manage clients — an own build of
[wg-easy](https://github.com/wg-easy/wg-easy), image `ghcr.io/jwklijnsma/wg-easy`.

```bash
docker run -d -e WG_HOST=vpn.example.org -e PASSWORD=… -v ~/.wg-easy:/etc/wireguard \
  -p 51820:51820/udp -p 51821:51821/tcp --cap-add NET_ADMIN --cap-add SYS_MODULE \
  --sysctl net.ipv4.ip_forward=1 --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  ghcr.io/jwklijnsma/wg-easy:main
```

Documentation: <https://jwklijnsma.github.io/wg-easy/>
