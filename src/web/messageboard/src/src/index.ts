import { serve } from "bun";
import index from "./index.html";
import { clean, filter, query, seed } from "./db";

await seed();

const sessions = new Map<string, string>();
const SESSION_COOKIE = "__Host-session";

type Credentials = { name: string; password: string };

async function credentials(req: Request): Promise<Credentials | Response> {
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "nuh uh" }, { status: 400 });
	}

	const { name, password } = (body ?? {}) as Partial<Credentials>;
	if (typeof name !== "string" || typeof password !== "string") {
		return Response.json({ error: "nuh uh" }, { status: 400 });
	}

	if (!name || name.length > 32 || !password || password.length > 64) {
		return Response.json({ error: "nuh uh" }, { status: 400 });
	}

	if (!filter(name) || !filter(password)) {
		return Response.json({ error: "nuh uh" }, { status: 400 });
	}

	return { name, password };
}

function login(cookies: Bun.CookieMap, name: string) {
	const token = crypto.randomUUID();
	sessions.set(token, name);
	cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		path: "/",
		maxAge: 60 * 60 * 24,
	});
}

function session(req: Bun.BunRequest) {
	const token = req.cookies.get(SESSION_COOKIE);
	return token ? sessions.get(token) : undefined;
}

const server = serve({
	routes: {
		// Serve index.html for all unmatched routes.
		"/*": index,

		"/api/signup": {
			async POST(req) {
				const creds = await credentials(req);
				if (creds instanceof Response) return creds;
				const { name, password } = creds;

				const [existing] = await query(
					`SELECT name FROM users WHERE name = '${name}'`,
				);
				if (existing) {
					return Response.json({ error: "name is taken" }, { status: 409 });
				}

				await query(
					`INSERT INTO users (name, secret) VALUES ('${name}', '${password}')`,
				);

				login(req.cookies, name);
				return Response.json({ name });
			},
		},

		"/api/login": {
			async POST(req) {
				const creds = await credentials(req);
				if (creds instanceof Response) return creds;
				const { name, password } = creds;

				const [user] = await query(
					`SELECT name, secret FROM users WHERE name = '${name}'`,
				);
				if (!user || user.secret !== password) {
					return Response.json(
						{ error: "invalid name or password" },
						{ status: 401 },
					);
				}

				login(req.cookies, user.name);
				return Response.json({ name: user.name });
			},
		},

		"/api/me": {
			async GET(req) {
				const name = session(req);
				if (!name) {
					return Response.json({ error: "not logged in" }, { status: 401 });
				}

				return Response.json({ name });
			},
		},

		"/api/logout": {
			async POST(req) {
				const token = req.cookies.get(SESSION_COOKIE);
				if (token) sessions.delete(token);
				req.cookies.delete(SESSION_COOKIE, { path: "/" });

				return Response.json({ ok: true });
			},
		},

		"/api/stories": {
			async GET(req) {
				const name = session(req);
				if (!name) {
					return Response.json({ error: "not logged in" }, { status: 401 });
				}

				const url = new URL(req.url);
				const column = url.searchParams.get("column") || "name";
				const order = url.searchParams.get("order") || "ASC";
				if (!filter(column) || !filter(order)) {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				const publicStories = await query(`
                      SELECT name          AS author,
                             'public'      AS visibility,
                             public        AS story,
                             public_expiry AS expiry
                      FROM users
                      WHERE public IS NOT NULL
                        AND public_expiry > now()
                      ORDER BY ${column} ${order}`);
				const cfStories = await query(`
                      SELECT name                 AS author,
                             'close_friends'      AS visibility,
                             close_friends        AS story,
                             close_friends_expiry AS expiry
                      FROM users
                      WHERE close_friends IS NOT NULL
                        AND close_friends_expiry > now()
                        AND (close_friends_list @> ARRAY['${name}'] OR name = '${name}')
                      ORDER BY ${column} ${order}`);

				return Response.json([...publicStories, ...cfStories]);
			},

			async POST(req) {
				const name = session(req);
				if (!name) {
					return Response.json({ error: "not logged in" }, { status: 401 });
				}

				let body: unknown;
				try {
					body = await req.json();
				} catch {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				const { story, visibility, minutes } = (body ?? {}) as Partial<{
					story: string;
					visibility: string;
					minutes: number;
				}>;

				if (visibility !== "public" && visibility !== "close_friends") {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				if (typeof story !== "string" || !story || story.length > 300) {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				const ttl = minutes ?? 60;
				if (!Number.isInteger(ttl) || ttl < 1 || ttl > 60 * 24) {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				await query(`
                      UPDATE users
                      SET ${visibility}        = '${clean(story)}',
                          ${visibility}_expiry = now() + INTERVAL '${ttl} minutes'
                      WHERE name = '${name}'`);

				return Response.json({ ok: true });
			},
		},

		"/api/friends": {
			async GET(req) {
				const name = session(req);
				if (!name) {
					return Response.json({ error: "not logged in" }, { status: 401 });
				}

				const [user] = await query(
					`SELECT close_friends_list FROM users WHERE name = '${name}'`,
				);

				return Response.json({ friends: user?.close_friends_list ?? [] });
			},

			async POST(req) {
				const name = session(req);
				if (!name) {
					return Response.json({ error: "not logged in" }, { status: 401 });
				}

				let body: unknown;
				try {
					body = await req.json();
				} catch {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				const { friends } = (body ?? {}) as Partial<{ friends: string[] }>;
				if (!Array.isArray(friends) || friends.length > 32) {
					return Response.json({ error: "nuh uh" }, { status: 400 });
				}

				for (const friend of friends) {
					if (typeof friend !== "string" || !friend || friend.length > 32) {
						return Response.json({ error: "nuh uh" }, { status: 400 });
					}

					if (!filter(friend)) {
						return Response.json({ error: "nuh uh" }, { status: 400 });
					}
				}

				await query(`
                      UPDATE users
                      SET close_friends_list = ARRAY[${friends.map((friend) => `'${friend}'`).join(",")}]::TEXT[]
                      WHERE name = '${name}'`);

				return Response.json({ friends });
			},
		},
	},

	development: process.env.NODE_ENV !== "production" && {
		// Enable browser hot reloading in development
		hmr: true,

		// Echo console logs from the browser to the server
		console: true,
	},
});

console.log(`🚀 Server running at ${server.url}`);
