import { S3Client } from "bun";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const assetPath = Bun.argv[2];

const r2 = new S3Client();

async function localKeys(dir: string): Promise<Set<string>> {
	const keys = new Set<string>();
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() || entry.isSymbolicLink()) {
			const abs = join(entry.parentPath, entry.name);
			keys.add(relative(dir, abs));
		}
	}
	return keys;
}

async function bucketKeys(): Promise<Set<string>> {
	const keys = new Set<string>();
	let startAfter: string | undefined;

	while (true) {
		const page = await r2.list({ maxKeys: 1000, startAfter });
		for (const obj of page.contents ?? []) {
			keys.add(obj.key);
		}
		if (!page.isTruncated) break;
		startAfter = page.contents?.at(-1)?.key;
	}

	return keys;
}

const [local, remote] = await Promise.all([
	localKeys(assetPath!),
	bucketKeys(),
]);

const toUpload = [...local].filter((k) => !remote.has(k));
const toDelete = [...remote].filter((k) => !local.has(k));
const unchanged = local.size - toUpload.length;

console.log(`  ${local.size} local files — ${remote.size} remote keys`);
console.log(
	`  ↑ ${toUpload.length} to upload   ✗ ${toDelete.length} to delete   = ${unchanged} unchanged`,
);

let uploadDone = 0;
for (const key of toUpload) {
	const file = Bun.file(join(assetPath!, key));
	const fileName = key.slice(key.indexOf("/") + 1);
	await r2.write(key, file, {
		type: file.type,
		contentDisposition: `attachment; filename="${fileName}"`,
	});
	console.log(`\r  ↑ uploaded ${key} (${++uploadDone}/${toUpload.length})`);
}

if (toUpload.length) {
	console.log("\nDone uploading!");
	console.log("---------------------\n");
}

let deleteDone = 0;
for (const key of toDelete) {
	await r2.delete(key);
	console.log(`\r  ✗ deleted ${key} (${++deleteDone}/${toDelete.length})`);
}
if (toDelete.length > 0) console.log();
