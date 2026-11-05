import { ExternalLink, Flame, TrendingUp } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
	fetchTrendingTopics,
	fetchTwitterTrends,
} from "../services/newsService";

const TrendingTopicsSkeleton = () => (
	<div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 mb-6">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
			<div className="flex items-center gap-3 mb-2">
				<div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
				<div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
			</div>
			<div className="flex overflow-x-auto pb-2 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-full px-4 py-1.5 animate-pulse"
					>
						<div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded-full" />
					</div>
				))}
			</div>
		</div>
	</div>
);

const TrendingTopics = () => {
	const [activeSource, setActiveSource] = useState("twitter"); // 'twitter' | 'google'
	const [trends, setTrends] = useState([]);
	const [twitterTopics, setTwitterTopics] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);
				const [googleData, twData] = await Promise.allSettled([
					fetchTrendingTopics(),
					fetchTwitterTrends(),
				]);

				if (isMounted) {
					if (googleData.status === "fulfilled") {
						setTrends(googleData.value || []);
					}
					if (twData.status === "fulfilled" && twData.value?.topics) {
						setTwitterTopics(twData.value.topics);
					}
				}
			} catch (err) {
				console.error("[TrendingTopics] Failed to load trends:", err);
				if (isMounted) setError(err);
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		loadData();
		return () => {
			isMounted = false;
		};
	}, []);

	if (loading) return <TrendingTopicsSkeleton />;
	if (error) return null;

	const hasTwitter = twitterTopics.length > 0;
	const hasGoogle = trends.length > 0;
	if (!hasTwitter && !hasGoogle) return null;

	return (
		<div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 mb-6">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
				<div className="flex flex-wrap items-center justify-between gap-3 mb-2">
					<div className="flex items-center gap-3">
						{activeSource === "twitter" ? (
							<Flame className="h-5 w-5 text-amber-500" />
						) : (
							<TrendingUp className="h-5 w-5 text-red-600" />
						)}
						<h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
							{activeSource === "twitter"
								? "Trending Topics no X (Twitter) Brasil"
								: "Em alta no Brasil hoje"}
						</h2>
					</div>

					<div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg text-xs font-medium">
						<button
							type="button"
							onClick={() => setActiveSource("twitter")}
							className={`px-2.5 py-1 rounded-md transition-colors ${
								activeSource === "twitter"
									? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
									: "text-gray-600 dark:text-gray-300 hover:text-gray-900"
							}`}
						>
							X (Twitter)
						</button>
						<button
							type="button"
							onClick={() => setActiveSource("google")}
							className={`px-2.5 py-1 rounded-md transition-colors ${
								activeSource === "google"
									? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
									: "text-gray-600 dark:text-gray-300 hover:text-gray-900"
							}`}
						>
							Notícias Gerais
						</button>
					</div>
				</div>

				<div className="flex overflow-x-auto pb-2 gap-3 scrollbar-hide">
					{activeSource === "twitter"
						? twitterTopics.map((topic, index) => (
								<a
									key={topic.name}
									href={
										topic.sampleTweets?.[0]?.url ||
										`https://x.com/search?q=${encodeURIComponent(topic.name)}`
									}
									target="_blank"
									rel="noopener noreferrer"
									className="flex-shrink-0 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full px-3.5 py-1.5 border border-gray-200 dark:border-gray-600 transition-colors group flex items-center gap-1.5"
									title={topic.summary}
								>
									<span className="text-xs font-bold text-blue-600 dark:text-blue-400">
										#{index + 1}
									</span>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap">
										{topic.name}
									</span>
									{topic.volume && (
										<span className="text-[11px] text-gray-500 dark:text-gray-400">
											· {topic.volume}
										</span>
									)}
								</a>
							))
						: trends.map((trend, index) => (
								<a
									key={index}
									href={trend.link}
									target="_blank"
									rel="noopener noreferrer"
									className="flex-shrink-0 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full px-4 py-1.5 border border-gray-200 dark:border-gray-600 transition-colors group"
								>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap flex items-center gap-2">
										{index + 1}. {trend.title}
									</span>
								</a>
							))}
				</div>
			</div>
		</div>
	);
};

export default TrendingTopics;
