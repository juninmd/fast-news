import { describe, expect, it } from "vitest";
import {
	buildTwitterNewsArticle,
	DEFAULT_TWITTER_TRENDS,
	fetchLiveTwitterTrends,
} from "./twitterTrends.js";

describe("twitterTrends", () => {
	it("has default trending topics with required fields and sample tweets", () => {
		expect(DEFAULT_TWITTER_TRENDS.length).toBeGreaterThan(0);
		for (const topic of DEFAULT_TWITTER_TRENDS) {
			expect(topic.id).toBeDefined();
			expect(topic.rank).toBeGreaterThan(0);
			expect(topic.name).toBeTruthy();
			expect(topic.description).toBeTruthy();
			expect(topic.context).toBeTruthy();
			expect(topic.category).toBeTruthy();
			expect(topic.sampleTweets.length).toBeGreaterThan(0);

			for (const tweet of topic.sampleTweets) {
				expect(tweet.id).toBeTruthy();
				expect(tweet.authorName).toBeTruthy();
				expect(tweet.authorHandle).toMatch(/^@/);
				expect(tweet.text).toBeTruthy();
				expect(tweet.likes).toBeGreaterThanOrEqual(0);
				expect(tweet.retweets).toBeGreaterThanOrEqual(0);
				expect(tweet.url).toMatch(/^https:\/\/x\.com/);
			}
		}
	});

	it("generates an editorial news article from trending topics", () => {
		const article = buildTwitterNewsArticle(
			DEFAULT_TWITTER_TRENDS,
			"2026-10-31T20:00:00.000Z",
		);

		expect(article.id).toBe("twitter-trends-2026-10-31");
		expect(article.title).toContain("Trending Topics no X (Twitter)");
		expect(article.category).toBe("Redes Sociais");
		expect(article.source).toBe("X / Twitter Trends");
		expect(article.topicsCount).toBe(DEFAULT_TWITTER_TRENDS.length);
		expect(article.readingTimeMinutes).toBeGreaterThan(0);
		expect(article.content).toContain("## O termômetro da opinião pública");

		for (const topic of DEFAULT_TWITTER_TRENDS) {
			expect(article.content).toContain(topic.name);
			expect(article.content).toContain(topic.description);
		}
	});

	it("fetches live trends report with fallback", async () => {
		const report = await fetchLiveTwitterTrends();
		expect(report).toBeDefined();
		expect(report.region).toBe("Brasil");
		expect(report.topics.length).toBeGreaterThanOrEqual(3);
		expect(report.newsArticle).toBeDefined();
		expect(report.newsArticle.title).toBeTruthy();
	});
});
