import { describe, expect, it } from "vitest";
import { resolveVideo } from "./articleVideo";

describe("resolveVideo", () => {
	it("embeds YouTube in privacy mode from any url shape", () => {
		for (const url of [
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			"https://youtu.be/dQw4w9WgXcQ",
			"https://www.youtube.com/embed/dQw4w9WgXcQ",
		]) {
			expect(resolveVideo(url)).toEqual({
				kind: "embed",
				provider: "youtube",
				embedUrl:
					"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
			});
		}
	});

	it("embeds Vimeo and plays other http(s) urls as files", () => {
		expect(resolveVideo("https://vimeo.com/123456789")).toMatchObject({
			provider: "vimeo",
		});
		expect(resolveVideo("https://cdn.x/clip.mp4")).toEqual({
			kind: "file",
			src: "https://cdn.x/clip.mp4",
			hls: false,
		});
		expect(resolveVideo("https://cdn.x/master.m3u8")).toMatchObject({
			hls: true,
		});
	});

	it("rejects empty and non-http values", () => {
		expect(resolveVideo(null)).toBeNull();
		expect(resolveVideo("javascript:alert(1)")).toBeNull();
	});
});
