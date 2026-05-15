import { Glob, YAML } from "bun";
import { readdir } from "node:fs/promises";

const CONTAINER_REGISTRY = "ghcr.io/gaslightctf/challs-2026";
const ATTACHMENTS_SERVER =
  process.env.targetEnv === "prod"
    ? "https://pantry.gaslightctf.cooking"
    : "https://pantry-dev.gaslightctf.cooking";

const chall = YAML.parse(await Bun.file("./chall.yaml").text());

if (chall.spec.containers) {
  for (const ctr of chall.spec.containers) {
    if (ctr.image === "CHALLENGE_IMAGE") {
      ctr.image = `${CONTAINER_REGISTRY}/${chall.metadata.name}:${process.env.targetEnv}`;
    }
  }
}

const attachmentGlob = new Glob("attachments/*");

chall.spec.attachments ??= [];
for await (const file of attachmentGlob.scan(".")) {
  console.error("adding attachment", file);
  chall.spec.attachments.push({
    fileName: file,
    downloadUrl: `${ATTACHMENTS_SERVER}/${process.env.baseName}/${file}`,
  });
}

try {
  const handoutFiles = await readdir("./handout");
  if (handoutFiles.length > 0) {
    chall.spec.attachments.push({
      fileName: `${chall.metadata.name}.tar.zst`,
      downloadUrl: `${ATTACHMENTS_SERVER}/${process.env.baseName}/${chall.metadata.name}.tar.zst`,
    });
  }
} catch (e) {
  if (e.code !== "ENOENT") {
    console.error("error getting handout files", e);
    throw e;
  } else {
    console.error("no handout files found");
  }
}

console.log(JSON.stringify(chall));
