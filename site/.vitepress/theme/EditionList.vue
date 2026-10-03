<script setup lang="ts">
import { withBase } from "vitepress";
import { computed } from "vue";
import { data as editions } from "../editions.data";

const props = defineProps<{ limit?: number }>();
const list = computed(() =>
	props.limit ? editions.slice(0, props.limit) : editions,
);
</script>

<template>
	<p v-if="!list.length">Nenhuma edição publicada ainda.</p>
	<ul v-else class="edition-list">
		<li v-for="e in list" :key="e.url">
			<a :href="withBase(e.url)">{{ e.title }}</a>
			<p v-if="e.description">{{ e.description }}</p>
		</li>
	</ul>
</template>

<style scoped>
.edition-list { list-style: none; padding: 0; }
.edition-list li { padding: 12px 0; border-bottom: 1px solid var(--vp-c-divider); }
.edition-list p { margin: 4px 0 0; color: var(--vp-c-text-2); font-size: 0.9em; }
</style>
