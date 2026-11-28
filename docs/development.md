# Development

The app lives in `src/` (Node.js, Express-style server, Vue front end in `src/www`).

```bash
cd src
npm install
npm run serve                  # nodemon, DEBUG=Server,WireGuard
npm run serve-with-password    # same, with PASSWORD=wg
npm run lint
npm test                       # node --test test/*.test.js
```

`tests.yml` runs lint and the tests on every pull request and push to `main`.
`docker-publish.yml` builds the image on pull requests and pushes `ghcr.io/jwklijnsma/wg-easy`
from `main`, from tags you push (`vX.Y.Z`) and every night (`nightly`), signed with cosign.
