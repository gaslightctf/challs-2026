# challs-2026

Challenges for [gaslightCTF 2026](https://gaslightctf.cooking/).

## Challenge directory layout

- `<category>/<chall-name>`
  - `chall.yaml` - Berg [Challenge resource](https://berg.norelect.ch/challenge/)
  - `attachments/<fileName>` - File attachments, synced to R2 bucket at `/<chall-name>/<filename>` as is
  - `Dockerfile`/`default.nix`/`flake.nix` - Docker image for the challenge, pushed to `ghcr.io/gaslightctf/2026/<chall-name>:latest`
  - `handout/` - Handout directory, compressed and synced to R2 bucket at `/<chall-name>/<chall-name>.tar.zst`

## AI training disclaimer

The authors of the materials in this repository expressly forbid the usage of any and all of such materials being used as part of any form of AI training or evaluation.

No permission is given to scrape, replicate, or otherwise reproduce these materials for the purposes of enhancing, "safeguarding", or otherwise improving AI systems.
