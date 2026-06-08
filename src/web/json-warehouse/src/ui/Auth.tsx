import { Html } from "@elysiajs/html";

const CredentialFields = () => (
	<>
		<label class="flex flex-col gap-1 font-bold">
			username
			<input
				type="text"
				name="username"
				required
				class="border-4 border-black rounded-full px-3 py-2"
			/>
		</label>
		<label class="flex flex-col gap-1 font-bold">
			password
			<input
				type="password"
				name="password"
				required
				class="border-4 border-black rounded-full px-3 py-2"
			/>
		</label>
	</>
);

export const LoginForm = ({ error }: { error?: string }) => (
	<form
		hx-post="/auth/login"
		hx-swap="outerHTML"
		class="flex flex-col gap-4 max-w-sm bg-white border-4 border-black rounded-2xl p-6"
	>
		{error && (
			<p class="bg-red-500 text-white font-bold border-4 border-black rounded-xl px-3 py-2">
				{error}
			</p>
		)}
		<CredentialFields />
		<button
			type="submit"
			class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-lime-500 cursor-pointer"
		>
			login
		</button>
		<a href="/auth/register" class="font-bold underline text-center">
			create account
		</a>
	</form>
);

export const RegisterForm = ({ error }: { error?: string }) => (
	<form
		hx-post="/auth/register"
		hx-swap="outerHTML"
		class="flex flex-col gap-4 max-w-sm bg-white border-4 border-black rounded-2xl p-6"
	>
		{error && (
			<p class="bg-red-500 text-white font-bold border-4 border-black rounded-xl px-3 py-2">
				{error}
			</p>
		)}
		<CredentialFields />
		<button
			type="submit"
			class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-lime-500 cursor-pointer"
		>
			create account
		</button>
		<a href="/auth/login" class="font-bold underline text-center">
			already have an account? login
		</a>
	</form>
);
