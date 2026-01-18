
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

const FEED_SOURCES = [
    // Tecnologia
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Tecnologia' },
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tecnologia' },
    { url: 'https://techcrunch.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia' },
    { url: 'https://rss.tecmundo.com.br/feed', category: 'Tecnologia' },
    { url: 'https://gizmodo.uol.com.br/feed/', category: 'Tecnologia' },

    // Brasil
    { url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'Brasil' },
    { url: 'https://rss.uol.com.br/feed/noticias.xml', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Brasil' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
    { url: 'https://jovempan.com.br/feed', category: 'Brasil' },

    // Mundo
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },

    // Negócios
    { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negócios' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negócios' },
    { url: 'https://epocanegocios.globo.com/rss/ultimas/feed.xml', category: 'Negócios' },

    // Ciência
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', category: 'Ciência' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Ciência' },

    // Esportes
    { url: 'https://www.espn.com.br/rss/news', category: 'Esportes' },
    { url: 'https://ge.globo.com/rss/ge/', category: 'Esportes' },

    // Entretenimento
    { url: 'https://www.omelete.com.br/rss/rss.aspx', category: 'Entretenimento' },
    { url: 'https://rollingstone.uol.com.br/feed/', category: 'Entretenimento' },

    // Saúde
    { url: 'https://www.metropoles.com/saude/feed', category: 'Saúde' },
    { url: 'https://drauziovarella.uol.com.br/feed/', category: 'Saúde' }
];

export const fetchNews = async () => {
    // We shuffle the feeds slightly or just fetch them all.
    // To avoid hitting rate limits effectively if we had massive amounts, we might batch.
    // For ~20-25 feeds, simple Promise.all is okay, but let's be careful.

    const promises = FEED_SOURCES.map(source =>
        fetch(`${RSS2JSON_API}${encodeURIComponent(source.url)}`)
            .then(res => res.json())
            .then(data => ({ ...data, category: source.category })) // Attach category to the result
            .catch(err => {
                console.error(`Error fetching ${source.url}:`, err);
                return null;
            })
    );

    const results = await Promise.all(promises);

    // Flatten and clean data
    let allNews = [];
    results.forEach(result => {
        if (result && result.status === 'ok') {
            const sourceTitle = result.feed.title;
            const category = result.category;
            const items = result.items.map(item => ({
                ...item,
                source: sourceTitle,
                category: category,
                id: item.guid || item.link
            }));
            allNews = [...allNews, ...items];
        }
    });

    // Sort by date (newest first) with safety check
    allNews.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    return allNews;
};
