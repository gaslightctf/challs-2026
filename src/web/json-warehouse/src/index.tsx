import { Elysia, redirect } from "elysia";
import { randomUUID } from "node:crypto";
import { html } from "@elysiajs/html";
import auth from "./routes/auth";
import storage from "./routes/storage";
import { userPlugin } from "./plugins/user";
import Home from "./ui/Home";

const app = new Elysia({
	cookie: {
		secrets: process.env.NODE_ENV === "development" ? "hunter2" : randomUUID(),
		sign: ["user"],
	},
})
	.use(html())
	.use(userPlugin)
	.use(auth)
	.use(storage)
	.get("/", ({ user }) => (user ? Home({ user }) : redirect("/auth/login")))
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
