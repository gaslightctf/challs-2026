import { Elysia } from "elysia";
import * as z from "zod";
import { Html } from "@elysiajs/html";
import { Page } from "../ui/Page";
import { LoginForm, RegisterForm } from "../ui/Auth";
import { userPlugin } from "../plugins/user";
import { createUser, getUser, getUserByUsername } from "../data";

const auth = new Elysia({ prefix: "/auth" })
	.use(userPlugin)
	.get("/login", ({ user }) => (
		<Page title="login" user={user}>
			<LoginForm />
		</Page>
	))
	.post(
		"/login",
		({ body: { username, password }, cookie, set }) => {
			const id = getUserByUsername(username);
			const user = id !== undefined ? getUser(id) : undefined;

			if (id === undefined || !user || user.password !== password) {
				return <LoginForm error="invalid username or password" />;
			}

			cookie.user.value = id.toString();
			set.headers["HX-Redirect"] = "/";
			return "";
		},
		{
			body: z.object({
				username: z.string(),
				password: z.string(),
			}),
		},
	)
	.post("/logout", ({ cookie, set }) => {
		cookie.user.remove();
		set.headers["HX-Redirect"] = "/";
		return "";
	})
	.get("/register", ({ user }) => (
		<Page title="create account" user={user}>
			<RegisterForm />
		</Page>
	))
	.post(
		"/register",
		({ body: { username, password }, cookie, set }) => {
			if (getUserByUsername(username) !== undefined) {
				return <RegisterForm error="username already taken" />;
			}

			const id = createUser(username, password);
			cookie.user.value = id.toString();
			set.headers["HX-Redirect"] = "/";
			return "";
		},
		{
			body: z.object({
				username: z.string(),
				password: z.string(),
			}),
		},
	);

export default auth;
