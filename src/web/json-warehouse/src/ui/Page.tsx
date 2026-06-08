import { Html } from "@elysiajs/html";
import type { Children } from "@kitajs/html";

export const Page = ({
	children,
	title,
	user,
}: {
	children: Children;
	title: string;
	user?: { username: string };
}) => (
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>{title} | json-warehouse</title>

			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				rel="preconnect"
				href="https://fonts.gstatic.com"
				crossorigin="anonymous"
			/>
			<link
				href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap"
				rel="stylesheet"
			/>

			<script
				src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.10/dist/htmx.min.js"
				integrity="sha384-H5SrcfygHmAuTDZphMHqBJLc3FhssKjG7w/CeCpFReSfwBWDTKpkzPP8c+cLsK+V"
				crossorigin="anonymous"
			></script>
			<script
				src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3/dist/index.global.js"
				integrity="sha384-2ql948lIdLcGEE0/qxNiudyTjgauA3RDJERu5xW75kFCvSl5a9odyQYCb6tEjnmB"
				crossorigin="anonymous"
			></script>
		</head>
		<body
			style="font-family: 'Comic Sans MS', 'Comic Neue', cursive;"
			class="bg-gradient-to-br from-fuchsia-400 via-yellow-300 to-cyan-400 min-h-screen bg-fixed"
		>
			<nav class="flex gap-6 items-center bg-pink-500 border-8 border-dashed border-lime-400 rounded-3xl m-4 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				<span class="text-2xl font-extrabold text-white -rotate-2">
					json-warehouse
				</span>
				<a
					href="/"
					class="bg-cyan-400 border-4 border-black rounded-full px-4 py-2 text-white font-bold hover:bg-cyan-500"
				>
					home
				</a>
				<a
					href="/storage"
					class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 text-white font-bold hover:bg-lime-500"
				>
					storage
				</a>
				{user ? (
					<span class="ml-auto flex gap-2 items-center bg-orange-400 border-4 border-black rounded-full px-4 py-2 text-white font-bold">
						welcome, {user.username}
						<a
							href="/auth/logout"
							hx-post="/auth/logout"
							class="underline hover:text-black"
						>
							logout
						</a>
					</span>
				) : (
					<a
						href="/auth/login"
						class="ml-auto bg-orange-400 border-4 border-black rounded-full px-4 py-2 text-white font-bold hover:bg-orange-500"
					>
						login
					</a>
				)}
			</nav>
			<main class="bg-purple-300 border-8 border-solid border-yellow-400 rounded-3xl m-4 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				<h1 class="text-4xl font-extrabold text-red-600 bg-white border-4 border-dotted border-blue-500 rounded-xl px-4 py-2 mb-4 w-fit rotate-1">
					{title}
				</h1>
				{children}
			</main>
			<footer class="bg-blue-500 border-8 border-dashed border-pink-400 rounded-3xl m-4 p-4 text-center text-white font-bold shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
				✦ json-warehouse ✦ constructed by claude ✦
			</footer>
		</body>
	</html>
);
