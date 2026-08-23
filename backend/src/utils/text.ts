export function normalizeSpaces(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

export function stripHtml(text: string): string {
	return normalizeSpaces(
		text.replace(/<\/?[^>]+(>|$)/g, " ").replace(/https?:\/\/\S+/g, " "),
	);
}

export function stripReaderChrome(text: string): string {
	return text
		.replace(/^Title:.*$/gim, "")
		.replace(/^URL Source:.*$/gim, "")
		.replace(/^Markdown Content:\s*/gim, "")
		.replace(/\r/g, "")
		.trim();
}

export function plainText(value = ""): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
		.replace(/[#*_`>[\]()|:.,;!?'"-]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

export function cleanMarkdownLine(line: string): string {
	return line
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/, "")
		.replace(/^\s*[-*]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();
}
