
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEED_URLS = [
    // Tech
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    // World
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    // Brazil (since the user spoke Portuguese)
    'https://g1.globo.com/rss/g1/tecnologia/',
    'https://rss.uol.com.br/feed/noticias.xml',
];

export const fetchNews = async () => {
    const promises = FEED_URLS.map(url =>
        fetch(`${RSS2JSON_API}${encodeURIComponent(url)}`)
            .then(res => res.json())
            .catch(err => {
                console.error(`Error fetching ${url}:`, err);
                return null;
            })
    );

    const results = await Promise.all(promises);

    // Flatten and clean data
    let allNews = [];
    results.forEach(result => {
        if (result && result.status === 'ok') {
            const source = result.feed.title;
            const items = result.items.map(item => ({
                ...item,
                source,
                id: item.guid || item.link
            }));
            allNews = [...allNews, ...items];
        }
    });

    // Sort by date (newest first)
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return allNews;
};
