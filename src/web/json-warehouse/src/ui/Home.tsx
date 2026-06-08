import { Html } from "@elysiajs/html";
import { Page } from "./Page";
import { type User, getItems } from "../data";

const funFacts = [
	"The world's largest warehouse by floor area is a facility in China that spans over 1.5 million square feet.",
	"Amazon operates thousands of fulfillment centers worldwide, some of which use over 100,000 robots.",
	"The term 'warehouse' comes from the combination of 'ware' (goods) and 'house' (building).",
	"Some modern warehouses use vertical storage systems reaching heights of over 100 feet.",
	"Ancient Rome had massive grain warehouses called 'horrea' to store food for the city's population.",
	"The invention of the forklift in the early 20th century revolutionized warehouse logistics.",
	"Cold storage warehouses can be kept as low as -20°F (-29°C) to preserve frozen goods.",
	"Automated Storage and Retrieval Systems (AS/RS) can move goods without any human intervention.",
	"The Federal Reserve Bank of New York stores gold in a vault beneath its Manhattan building, one of the largest gold depositories in the world.",
	"Some warehouses use drones internally to scan inventory and check stock levels.",
	"The largest warehouses can have enough floor space to fit dozens of football fields.",
	"Cross-docking is a technique where goods go directly from inbound to outbound trucks with minimal storage time.",
	"Warehouse robotics company Kiva Systems was acquired by Amazon in 2012 for $775 million, forming the basis of Amazon Robotics.",
	"Some warehouses are built entirely underground to save on land costs and maintain stable temperatures.",
	"The Sears, Roebuck and Co. mail-order warehouse in Chicago, built in 1906, was one of the largest buildings in the world at the time.",
	"RFID tags allow warehouses to track thousands of items simultaneously without manual scanning.",
	"Some warehouses use 'pick-to-light' systems where lights indicate which items to grab next.",
	"The Svalbard Global Seed Vault is essentially a warehouse for seeds, designed to preserve global crop diversity in case of disaster.",
	"Warehouse aisles are often designed just wide enough for forklifts, sometimes as narrow as 5 feet, to maximize storage density.",
	"Self-storage, a form of small-scale personal warehousing, became a booming industry in the U.S. starting in the 1960s.",
];

const Home = ({ user }: { user: User }) => (
	<Page title="home" user={user}>
		<p>
			welcome, {user.username}! you have
			<span class="text-amber-600"> {getItems(user.id)!.size} </span>
			<a href="/storage" class="underline text-blue-500">
				items stored
			</a>
			.
		</p>
		<br />
		<p>Did you know? {funFacts[Math.floor(Math.random() * funFacts.length)]}</p>
	</Page>
);
export default Home;
