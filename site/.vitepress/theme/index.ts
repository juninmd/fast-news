import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import EditionList from "./EditionList.vue";

export default {
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component("EditionList", EditionList);
	},
} satisfies Theme;
