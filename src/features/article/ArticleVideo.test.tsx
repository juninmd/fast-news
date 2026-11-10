import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleVideo } from "./ArticleVideo";

describe("ArticleVideo", () => {
	it("loads the YouTube iframe only after the click", () => {
		const { container } = render(
			<ArticleVideo
				url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
				title="Demo"
				poster="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
			/>,
		);
		expect(container.querySelector("iframe")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: /reproduzir vídeo/i }));
		expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
			"youtube-nocookie.com/embed/dQw4w9WgXcQ",
		);
	});

	it("plays direct files with the native player and the poster", () => {
		const { container } = render(
			<ArticleVideo
				url="https://cdn.example/clip.mp4"
				title="Clipe"
				poster="https://cdn.example/p.jpg"
			/>,
		);
		const video = container.querySelector("video");
		expect(video?.getAttribute("poster")).toBe("https://cdn.example/p.jpg");
		expect(video?.querySelector("source")?.getAttribute("src")).toBe(
			"https://cdn.example/clip.mp4",
		);
	});

	it("links out for HLS streams the browser cannot play", () => {
		render(
			<ArticleVideo
				url="https://cdn.example/master.m3u8"
				title="Live"
				fallbackUrl="https://site.example/post"
			/>,
		);
		expect(
			screen
				.getByRole("link", { name: /assistir no site/i })
				.getAttribute("href"),
		).toBe("https://site.example/post");
	});

	it("renders nothing for unusable urls", () => {
		const { container } = render(<ArticleVideo url="ftp://x" title="x" />);
		expect(container.firstChild).toBeNull();
	});
});
