import { Html } from "@elysiajs/html";
import { Page } from "./Page";
import type { User } from "../data";

export const CreateItemButton = () => (
	<button
		hx-get="/storage/new"
		hx-swap="outerHTML"
		class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-lime-500 cursor-pointer"
	>
		+ create new item
	</button>
);

export const CreateItemForm = () => (
	<form
		hx-post="/storage"
		hx-swap="outerHTML"
		class="flex flex-col gap-4 max-w-sm bg-white border-4 border-black rounded-2xl p-6"
	>
		<p
			class="bg-red-500 text-white font-bold border-4 border-black rounded-xl px-3 py-2 empty:hidden"
			id="create-item-error"
		></p>
		<label class="flex flex-col gap-1 font-bold">
			key
			<input
				type="text"
				name="key"
				required
				class="border-4 border-black rounded-full px-3 py-2"
			/>
		</label>
		<label class="flex flex-col gap-1 font-bold">
			value (json)
			<textarea
				name="value"
				required
				rows="4"
				class="border-4 border-black rounded-2xl px-3 py-2 font-mono"
			/>
		</label>
		<div class="flex gap-3">
			<button
				type="submit"
				class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-lime-500 cursor-pointer"
			>
				create
			</button>
			<button
				type="button"
				hx-get="/storage/new-button"
				hx-target="closest form"
				class="bg-white border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-gray-100 cursor-pointer"
			>
				cancel
			</button>
		</div>
	</form>
);

export const ItemView = ({
	itemKey,
	value,
}: {
	itemKey: string;
	value: unknown;
}) => (
	<div
		class="item-content flex flex-col gap-3"
		hx-target="closest .item-content"
		hx-swap="outerHTML"
	>
		<pre class="bg-yellow-50 border-4 border-black rounded-2xl p-4 font-mono overflow-x-auto">
			{JSON.stringify(value, null, 2)}
		</pre>
		<div class="flex gap-3">
			<button
				hx-get={`/storage/${encodeURIComponent(itemKey)}/edit`}
				class="bg-cyan-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-cyan-500 cursor-pointer"
			>
				edit item
			</button>
			<button
				hx-delete={`/storage/${encodeURIComponent(itemKey)}`}
				hx-confirm={`delete "${itemKey}"? this can't be undone.`}
				class="bg-red-500 border-4 border-black rounded-full px-4 py-2 text-white font-bold hover:bg-red-600 cursor-pointer"
			>
				delete item
			</button>
		</div>
	</div>
);

export const ItemEditForm = ({
	itemKey,
	value,
	error,
}: {
	itemKey: string;
	value: unknown;
	error?: string;
}) => (
	<form
		hx-put={`/storage/${encodeURIComponent(itemKey)}`}
		hx-target="closest .item-content"
		hx-swap="outerHTML"
		class="item-content flex flex-col gap-3"
	>
		{error && (
			<p class="bg-red-500 text-white font-bold border-4 border-black rounded-xl px-3 py-2">
				{error}
			</p>
		)}
		<label class="flex flex-col gap-1 font-bold">
			value (json)
			<textarea
				name="value"
				required
				rows="8"
				class="bg-yellow-50 border-4 border-black rounded-2xl p-4 font-mono"
			>
				{JSON.stringify(value, null, 2)}
			</textarea>
		</label>
		<div class="flex gap-3">
			<button
				type="submit"
				class="bg-lime-400 border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-lime-500 cursor-pointer"
			>
				save
			</button>
			<button
				type="button"
				hx-get={`/storage/${encodeURIComponent(itemKey)}/view`}
				class="bg-white border-4 border-black rounded-full px-4 py-2 font-bold hover:bg-gray-100 cursor-pointer"
			>
				cancel
			</button>
		</div>
	</form>
);

export const ItemCard = ({
	itemKey,
	value,
}: {
	itemKey: string;
	value: unknown;
}) => (
	<div class="flex flex-col gap-3 bg-white border-4 border-black rounded-2xl px-4 py-3">
		<a
			href={`/storage/${encodeURIComponent(itemKey)}`}
			class="font-bold break-all hover:underline hover:text-blue-500 cursor-pointer"
		>
			{itemKey}
		</a>
		<ItemView itemKey={itemKey} value={value} />
	</div>
);

export const StoragePage = ({
	user,
	items,
}: {
	user: User;
	items: Map<string, unknown>;
}) => (
	<Page title="storage" user={user}>
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-4" id="storage-items">
				{Array.from(items.entries()).map(([itemKey, value]) => (
					<ItemCard itemKey={itemKey} value={value} />
				))}
			</div>
			<CreateItemButton />
		</div>
	</Page>
);

export const ItemPage = ({
	user,
	itemKey,
	value,
}: {
	user: User;
	itemKey: string;
	value: unknown;
}) => (
	<Page title={itemKey} user={user}>
		<a
			href="/storage"
			class="inline-block mb-4 font-bold underline hover:text-blue-500 cursor-pointer"
		>
			&lt;- back
		</a>
		<ItemView itemKey={itemKey} value={value} />
	</Page>
);
