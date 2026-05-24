import fetch from "node-fetch";

const apiKey = "REDACTED_OLLAMA_API_KEY";
const baseUrl = "https://ollama.com/v1/chat/completions";
const model = "gemma3:12b";

async function test() {
	console.log("Sending request to Ollama Cloud...");
	try {
		const res = await fetch(baseUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: model,
				messages: [{ role: "user", content: "Say hello in 3 words." }],
				stream: false,
			}),
		});
		console.log("Status:", res.status);
		const data = await res.json();
		console.log("Response:", JSON.stringify(data, null, 2));
	} catch (err) {
		console.error("Error:", err);
	}
}

test();
