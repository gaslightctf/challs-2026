import { type FormEvent, useCallback, useEffect, useState } from "react";
import "./index.css";

type Mode = "login" | "signup";

type Story = {
	author: string;
	visibility: "public" | "close_friends";
	story: string;
	expiry: string;
};

function expiresIn(expiry: string) {
	const ms = new Date(expiry).getTime() - Date.now();
	if (ms <= 0) return "expired";

	const minutes = Math.round(ms / 60000);
	if (minutes < 60) return `${minutes}m left`;
	return `${Math.round(minutes / 60)}h left`;
}

export function App() {
	const [name, setName] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<Mode>("login");
	const [error, setError] = useState<string | null>(null);
	const [stories, setStories] = useState<Story[]>([]);
	const [column, setColumn] = useState("name");
	const [order, setOrder] = useState("ASC");
	const [friends, setFriends] = useState("");

	const refresh = useCallback(async () => {
		const res = await fetch(`/api/stories?column=${column}&order=${order}`);
		setStories(res.ok ? await res.json() : []);
	}, [column, order]);

	useEffect(() => {
		fetch("/api/me")
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => setName(data?.name ?? null))
			.catch(() => setName(null))
			.finally(() => setLoading(false));
	}, []);

	// (re)load the feed on login and whenever the sort changes
	useEffect(() => {
		if (name) refresh();
	}, [name, refresh]);

	useEffect(() => {
		if (!name) return;

		fetch("/api/friends")
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => setFriends((data?.friends ?? []).join(", ")))
			.catch(() => {});
	}, [name]);

	const auth = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);

		const form = new FormData(e.currentTarget);
		const res = await fetch(`/api/${mode}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: form.get("name"),
				password: form.get("password"),
			}),
		});

		const data = await res.json();
		if (!res.ok) {
			setError(data.error ?? "something went wrong");
			return;
		}

		setName(data.name);
	};

	const post = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);

		const form = e.currentTarget;
		const data = new FormData(form);
		const res = await fetch("/api/stories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				story: data.get("story"),
				visibility: data.get("visibility"),
				minutes: Number(data.get("minutes")),
			}),
		});

		if (!res.ok) {
			const body = await res.json();
			setError(body.error ?? "something went wrong");
			return;
		}

		form.reset();
		await refresh();
	};

	const saveFriends = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);

		const res = await fetch("/api/friends", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				friends: friends
					.split(",")
					.map((friend) => friend.trim())
					.filter(Boolean),
			}),
		});

		const data = await res.json();
		if (!res.ok) {
			setError(data.error ?? "something went wrong");
			return;
		}

		setFriends(data.friends.join(", "));
		await refresh();
	};

	const logout = async () => {
		await fetch("/api/logout", { method: "POST" });
		setName(null);
		setStories([]);
	};

	if (loading) return null;

	if (!name) {
		return (
			<main className="w-full max-w-sm p-8">
				<h1 className="mb-6 text-center text-3xl font-bold">messageboard</h1>

				<form onSubmit={auth} className="flex flex-col gap-3">
					<div className="mb-1 grid grid-cols-2 gap-2">
						{(["login", "signup"] as Mode[]).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => {
									setMode(m);
									setError(null);
								}}
								className={`cursor-pointer rounded-lg px-4 py-2 font-medium ${
									mode === m
										? "bg-neutral-200 text-neutral-900"
										: "bg-neutral-800 hover:bg-neutral-700"
								}`}
							>
								{m}
							</button>
						))}
					</div>

					<input
						name="name"
						placeholder="username"
						autoComplete="username"
						required
						className="rounded-lg bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-500"
					/>
					<input
						name="password"
						type="password"
						placeholder="password"
						autoComplete="current-password"
						required
						className="rounded-lg bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-500"
					/>

					{error && <p className="text-sm text-red-400">{error}</p>}

					<button
						type="submit"
						className="cursor-pointer rounded-lg bg-neutral-200 px-4 py-2 font-bold text-neutral-900 hover:bg-white"
					>
						{mode}
					</button>
				</form>
			</main>
		);
	}

	return (
		<main className="w-full max-w-2xl p-8">
			<header className="mb-6 flex items-baseline justify-between gap-4">
				<h1 className="text-3xl font-bold">messageboard</h1>
				<div className="flex items-baseline gap-3">
					<p>
						welcome, <span className="font-bold">{name}</span>
					</p>
					<button
						type="button"
						onClick={logout}
						className="cursor-pointer text-sm text-neutral-400 underline hover:text-neutral-200"
					>
						log out
					</button>
				</div>
			</header>

			<form
				onSubmit={post}
				className="mb-8 flex flex-col gap-3 rounded-xl bg-neutral-800/50 p-4"
			>
				<textarea
					name="story"
					required
					maxLength={280}
					rows={2}
					placeholder="post a story..."
					className="resize-y rounded-lg bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-500"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<select
						name="visibility"
						className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-2 outline-none"
					>
						<option value="public">public</option>
						<option value="close_friends">close friends</option>
					</select>
					<input
						name="minutes"
						type="number"
						min={1}
						max={1440}
						defaultValue={60}
						className="w-24 rounded-lg bg-neutral-800 px-3 py-2 outline-none"
					/>
					<span className="text-sm text-neutral-400">minutes</span>
					<button
						type="submit"
						className="ml-auto cursor-pointer rounded-lg bg-neutral-200 px-4 py-2 font-bold text-neutral-900 hover:bg-white"
					>
						post
					</button>
				</div>
				{error && <p className="text-sm text-red-400">{error}</p>}
			</form>

			<form
				onSubmit={saveFriends}
				className="mb-8 flex flex-wrap items-center gap-2 rounded-xl bg-neutral-800/50 p-4"
			>
				<label htmlFor="friends" className="text-sm text-neutral-400">
					close friends
				</label>
				<input
					id="friends"
					value={friends}
					onChange={(e) => setFriends(e.target.value)}
					placeholder="alice, bob"
					className="min-w-0 flex-1 rounded-lg bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-500"
				/>
				<button
					type="submit"
					className="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 font-medium hover:bg-neutral-600"
				>
					save
				</button>
			</form>

			<div className="mb-3 flex items-center gap-2 text-sm">
				<span className="text-neutral-400">sort by</span>
				<select
					value={column}
					onChange={(e) => setColumn(e.target.value)}
					className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 outline-none"
				>
					<option value="name">name</option>
					<option value="expiry">expiry</option>
				</select>
				<select
					value={order}
					onChange={(e) => setOrder(e.target.value)}
					className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 outline-none"
				>
					<option value="ASC">ascending</option>
					<option value="DESC">descending</option>
				</select>
			</div>

			<div className="flex flex-col gap-3">
				{stories.length === 0 && (
					<p className="text-center text-neutral-400">no stories yet</p>
				)}

				{stories.map((s) => (
					<article
						key={`${s.author}-${s.visibility}`}
						className={`rounded-xl border p-4 ${
							s.visibility === "close_friends"
								? "border-green-700 bg-green-950/30"
								: "border-neutral-700 bg-neutral-800/50"
						}`}
					>
						<div className="mb-1 flex items-baseline justify-between gap-3">
							<span className="font-bold">
								{s.author}
								{s.author === name && (
									<span className="ml-2 text-xs font-normal text-neutral-400">
										you
									</span>
								)}
							</span>
							<span className="text-xs text-neutral-400">
								{s.visibility === "close_friends" && "close friends · "}
								{expiresIn(s.expiry)}
							</span>
						</div>
						<p className="break-words whitespace-pre-wrap">{s.story}</p>
					</article>
				))}
			</div>
		</main>
	);
}

export default App;
