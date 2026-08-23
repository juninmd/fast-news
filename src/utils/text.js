export const normalizeSpaces = (text) => text.replace(/\s+/g, " ").trim();

export const stripHtml = (text) =>
	normalizeSpaces(
		text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/https?:\/\/\S+/g, " "),
	);

export const stripReaderChrome = (text) =>
	text
		.replace(/^Title:.*$/gim, "")
		.replace(/^URL Source:.*$/gim, "")
		.replace(/^Markdown Content:\s*/gim, "")
		.replace(/\r/g, "")
		.trim();

export const plainText = (value = "") =>
	value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
		.replace(/[#*_`>[\]()|:.,;!?'"-]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

export const cleanMarkdownLine = (line) =>
	line
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/, "")
		.replace(/^\s*[-*]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();
