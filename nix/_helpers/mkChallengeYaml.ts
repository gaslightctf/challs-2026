import { Glob, YAML } from "bun";
import { readdir } from "node:fs/promises";

const CONTAINER_REGISTRY = "ghcr.io/gaslightctf/challs-2026";
const ATTACHMENTS_SERVER =
	process.env.targetEnv === "prod"
		? "https://pantry.gaslightctf.cooking"
		: "https://pantry-dev.gaslightctf.cooking";
const CHALL_NAME = process.env.chall;

const chall = YAML.parse(await Bun.file("./chall.yaml").text()) as any;

if (chall.spec.containers) {
	for (const ctr of chall.spec.containers) {
		if (ctr.image === "CHALLENGE_IMAGE") {
			ctr.image = `${CONTAINER_REGISTRY}/${CHALL_NAME}:${process.env.targetEnv}`;
		}
	}
}

const attachmentGlob = new Glob("attachments/*");

chall.spec.attachments ??= [];
for await (const file of attachmentGlob.scan(".")) {
	console.error("adding attachment", file);
	const fileName = file.slice(file.indexOf("/") + 1);
	chall.spec.attachments.push({
		fileName,
		downloadUrl: `${ATTACHMENTS_SERVER}/${process.env.baseName}/${fileName}`,
	});
}

try {
	const handoutFiles = await readdir("./handout");
	if (handoutFiles.length > 0) {
		console.error("adding handout");
		const fileName = `${CHALL_NAME}.tar.zst`;
		chall.spec.attachments.push({
			fileName,
			downloadUrl: `${ATTACHMENTS_SERVER}/${process.env.baseName}/${fileName}`,
		});
	}
} catch (e) {
	if ((e as any)?.code !== "ENOENT") {
		console.error("error getting handout files", e);
		throw e;
	} else {
		console.error("no handout files found");
	}
}

console.log(JSON.stringify(chall));
