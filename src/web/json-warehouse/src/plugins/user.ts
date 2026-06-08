import { Elysia } from "elysia";
import * as z from "zod";
import { getUser } from "../data";

export const userPlugin = new Elysia({ name: "user" })
	.guard({
		cookie: z.object({
			user: z.string().optional(),
		}),
	})
	.resolve(({ cookie }) => ({
		user:
			cookie.user.value !== undefined ? getUser(+cookie.user.value) : undefined,
	}))
	.as("scoped");
