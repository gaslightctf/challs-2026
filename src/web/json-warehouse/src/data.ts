import { randomUUID } from "node:crypto";

export interface User {
	id: number;
	username: string;
	password: string;
}
const users = new Map<number, User>();

const warehouse = new Map<number, Map<string, any>>();

let uid = 1000;
export function createUser(username: string, password: string) {
	const id = uid++;
	users.set(id, { id, username, password });
	warehouse.set(id, new Map());

	return id;
}

export function getUser(id: number) {
	return users.get(+id);
}

export function getUserByUsername(username: string) {
	for (const [id, user] of users) {
		if (user.username === username) {
			return id;
		}
	}
}

export function getItems(id: number) {
	return warehouse.get(+id);
}

export function getItem(id: number, key: string) {
	return getItems(id)?.get(key);
}

export function setItem(id: number, key: string, value: any) {
	getItems(id)?.set(key, value);
}

export function deleteItem(id: number, key: string) {
	return getItems(id)?.delete(key) ?? false;
}

setItem(
	createUser(
		"admin",
		process.env.NODE_ENV === "development" ? "hunter2" : randomUUID(),
	),
	"flag",
	process.env.FLAG || "gaslightCTF{flag}",
);
