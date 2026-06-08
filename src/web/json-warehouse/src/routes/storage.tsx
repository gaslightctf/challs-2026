import { Elysia, redirect } from "elysia";
import * as z from "zod";
import { Html } from "@elysiajs/html";
import { userPlugin } from "../plugins/user";
import { deleteItem, getItem, getItems, setItem } from "../data";
import {
	CreateItemButton,
	CreateItemForm,
	ItemEditForm,
	ItemPage,
	ItemCard,
	ItemView,
	StoragePage,
} from "../ui/Storage";

const parseJson = (raw: string) => {
	try {
		return { value: JSON.parse(raw) as unknown };
	} catch {
		return { error: "invalid json" };
	}
};

const storage = new Elysia({ prefix: "/storage" })
	.use(userPlugin)
	.get("/new", () => <CreateItemForm />)
	.get("/new-button", () => <CreateItemButton />)
	.get("/", ({ user }) => {
		if (!user) return redirect("/auth/login");

		return <StoragePage user={user} items={getItems(user.id) ?? new Map()} />;
	})
	.post(
		"/",
		({ user, body: { key, value }, set }) => {
			if (!user) return redirect("/auth/login");

			if (getItem(user.id, key) !== undefined) {
				set.headers["HX-Reswap"] = "innerHTML";
				set.headers["HX-Retarget"] = "#create-item-error";
				return <p>item already exists</p>;
			}

			const parsed = parseJson(value);
			if ("error" in parsed) {
				set.headers["HX-Reswap"] = "innerHTML";
				set.headers["HX-Retarget"] = "#create-item-error";
				return <p>{parsed.error}</p>;
			}

			setItem(user.id, key, parsed.value);
			return (
				<>
					<CreateItemButton />
					<div id="storage-items" hx-swap-oob="beforeend">
						<ItemCard itemKey={key} value={parsed.value} />
					</div>
				</>
			);
		},
		{
			body: z.object({
				key: z.string().min(1),
				value: z.string(),
			}),
		},
	)
	.guard({
		schema: "standalone",
		params: z.object({
			key: z.string().min(1),
		}),
		body: z.any(),
	})
	.get("/:key", ({ user, params: { key }, set }) => {
		if (!user) return redirect("/auth/login");

		const value = getItem(user.id, key);
		if (value === undefined) {
			set.status = 404;
			return "item not found";
		}

		return <ItemPage user={user} itemKey={key} value={value} />;
	})
	.get("/:key/view", ({ user, params: { key }, set }) => {
		if (!user) return redirect("/auth/login");

		const value = getItem(user.id, key);
		if (value === undefined) {
			set.status = 404;
			return "item not found";
		}

		return <ItemView itemKey={key} value={value} />;
	})
	.get("/:key/edit", ({ user, params: { key }, set }) => {
		if (!user) return redirect("/auth/login");

		const value = getItem(user.id, key);
		if (value === undefined) {
			set.status = 404;
			return "item not found";
		}

		return <ItemEditForm itemKey={key} value={value} />;
	})
	.put(
		"/:key",
		({ user, params: { key }, body: { value }, set }) => {
			if (!user) return redirect("/auth/login");

			const existing = getItem(user.id, key);
			if (existing === undefined) {
				set.status = 404;
				return "item not found";
			}

			const parsed = parseJson(value);
			if ("error" in parsed) {
				return (
					<ItemEditForm itemKey={key} value={existing} error={parsed.error} />
				);
			}

			setItem(user.id, key, parsed.value);
			return <ItemView itemKey={key} value={parsed.value} />;
		},
		{
			body: z.object({
				value: z.string(),
			}),
		},
	)
	.delete("/:key", ({ user, params: { key }, set }) => {
		if (!user) return redirect("/auth/login");

		deleteItem(user.id, key);
		set.headers["HX-Redirect"] = "/storage";
		return "";
	});

export default storage;
