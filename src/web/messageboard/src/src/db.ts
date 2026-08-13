import { SQL } from "bun";

export const sql = new SQL({
	url:
		process.env.DATABASE_URL ??
		"postgres://messageboard:04433efaf902245f@db:5432/messageboard",
});
export const query = sql.unsafe;

const secret = () => crypto.getRandomValues(new Uint8Array(8)).toHex();

type Seed = {
	name: string;
	secret?: string;
	public?: string;
	publicExpiry?: number;
	closeFriends?: string;
	closeFriendsExpiry?: number;
	closeFriendsList?: string[];
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const seeds: Seed[] = [
	{
		name: "admin",
		public: "welcome to my board!",
		publicExpiry: HOUR,
		closeFriends: process.env.FLAG ?? "gaslightCTF{fake_flag}",
		closeFriendsExpiry: HOUR,
		closeFriendsList: ["alice", "carol", "dave"],
	},
	{
		name: "alice",
		public: "hello world",
		publicExpiry: 5 * MINUTE,
	},
	{
		name: "bob",
		secret: "iamthebuilder",
		public: "anyone know how to get on the admin close friends list?",
		publicExpiry: 30 * MINUTE,
		closeFriendsList: ["alice"],
	},
	{
		name: "carol",
		public: "just got added to the cool people list :)",
		publicExpiry: 45 * MINUTE,
		closeFriends: "ok it is not that cool, they just post cat pictures",
		closeFriendsExpiry: 20 * MINUTE,
		closeFriendsList: ["admin", "alice", "bob"],
	},
	{
		name: "dave",
		closeFriends: "shhh, this one is a secret",
		closeFriendsExpiry: 2 * HOUR,
		closeFriendsList: ["admin"],
	},
	{
		name: "eve",
		public: "nothing to see here",
		publicExpiry: 10 * MINUTE,
	},
];

const expiry = (offset?: number) =>
	offset === undefined ? "NULL" : `NOW() + INTERVAL '${offset} milliseconds'`;

const str = (value?: string) => (value === undefined ? "NULL" : `'${value}'`);

const list = (value?: string[]) =>
	`ARRAY[${(value ?? []).map(str).join(",")}]::TEXT[]`;

export async function seed() {
	// wait for the database to come up
	for (let i = 0; ; i++) {
		try {
			await query("SELECT 1");
			break;
		} catch (err) {
			if (i >= 30) throw err;
			await Bun.sleep(1000);
		}
	}

	const users = seeds.map((user) => ({ secret: secret(), ...user }));

	await query("DELETE FROM users");
	await query(
		`INSERT INTO users (name, secret, public, public_expiry, close_friends, close_friends_expiry, close_friends_list) VALUES ${users
			.map(
				(user) =>
					`(${str(user.name)}, ${str(user.secret)}, ${str(user.public)}, ${expiry(user.publicExpiry)}, ${str(user.closeFriends)}, ${expiry(user.closeFriendsExpiry)}, ${list(user.closeFriendsList)})`,
			)
			.join(",")}`,
	);

	for (const user of users) {
		console.log(`seeded ${user.name}:${user.secret}`);
	}
}

const whitelist =
	"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function filter(str: string) {
	for (const c of [...str]) {
		if (!whitelist.includes(c)) {
			return false;
		}
	}

	return true;
}
export const clean = (str: string) =>
	str
		.split(/\s+/)
		.map((w) => (filter(w) ? w : ""))
		.join(" ");
