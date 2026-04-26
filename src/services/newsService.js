
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const FEED_SOURCES = [
    // Tecnologia
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Tecnologia' },
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tecnologia' },
    { url: 'https://techcrunch.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia' },
    { url: 'https://rss.tecmundo.com.br/feed', category: 'Tecnologia' },
    { url: 'https://gizmodo.uol.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://canaltech.com.br/rss/', category: 'Tecnologia' },
    { url: 'https://www.wired.com/feed/rss', category: 'Tecnologia' },
    { url: 'https://arstechnica.com/feed/', category: 'Tecnologia' },
    { url: 'https://olhardigital.com.br/rss', category: 'Tecnologia' },
    { url: 'https://www.engadget.com/rss.xml', category: 'Tecnologia' },
    { url: 'https://www.macrumors.com/macrumors.xml', category: 'Tecnologia' },
    { url: 'https://9to5mac.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.androidpolice.com/feed/', category: 'Tecnologia' },
    { url: 'https://tecnoblog.net/feed/', category: 'Tecnologia' },
    { url: 'https://meiobit.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.adrenaline.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://mundoconectado.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.tudocelular.com/rss/', category: 'Tecnologia' },
    { url: 'https://macmagazine.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.b9.com.br/feed/', category: 'Tecnologia' },

    // Brasil / Política / Geral
    { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/politica/', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Brasil' },
    { url: 'https://rss.uol.com.br/feed/noticias.xml', category: 'Brasil' },
    { url: 'https://rss.uol.com.br/feed/economia.xml', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Brasil' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
    { url: 'https://jovempan.com.br/feed', category: 'Brasil' },
    { url: 'https://noticias.r7.com/feed.xml', category: 'Brasil' },
    { url: 'https://www.estadao.com.br/rss/ultimas', category: 'Brasil' },
    { url: 'https://www.poder360.com.br/feed', category: 'Brasil' },
    { url: 'https://www.cartacapital.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.bbc.com/portuguese/index.xml', category: 'Brasil' },
    { url: 'https://veja.abril.com.br/feed/', category: 'Brasil' },
    { url: 'https://odia.ig.com.br/_conteudo/noticias/rss.xml', category: 'Brasil' },
    { url: 'https://www.terra.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://www.correiobraziliense.com.br/rss/noticia/brasil/rss.xml', category: 'Brasil' },
    { url: 'https://www.gazetadopovo.com.br/feed/rss/republica.xml', category: 'Brasil' },
    { url: 'https://diariodonordeste.verdesmares.com.br/rss', category: 'Brasil' },
    { url: 'https://www.em.com.br/rss/noticia/nacional/rss.xml', category: 'Brasil' },
    { url: 'https://www.brasil247.com/feed', category: 'Brasil' },
    { url: 'https://www.diariodocentrodomundo.com.br/feed/', category: 'Brasil' },
    { url: 'https://revistaforum.com.br/feed', category: 'Brasil' },
    { url: 'https://catracalivre.com.br/feed/', category: 'Brasil' },

    // Mundo
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
    { url: 'https://rss.dw.com/rdf/rss-br-all', category: 'Mundo' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
    { url: 'https://www.theguardian.com/world/rss', category: 'Mundo' },
    { url: 'https://feeds.washingtonpost.com/rss/world', category: 'Mundo' },
    { url: 'https://g1.globo.com/rss/g1/mundo/', category: 'Mundo' },
    { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },
    { url: 'https://feeds.npr.org/1001/rss.xml', category: 'Mundo' },

    // Negócios
    { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negócios' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negócios' },
    { url: 'https://epocanegocios.globo.com/rss/ultimas/feed.xml', category: 'Negócios' },
    { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
    { url: 'https://exame.com/feed/', category: 'Negócios' },
    { url: 'https://www.forbes.com/business/feed/', category: 'Negócios' },
    { url: 'https://www.economist.com/business/rss.xml', category: 'Negócios' },

    // Ciência
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', category: 'Ciência' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Ciência' },
    { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Ciência' },
    { url: 'https://revistagalileu.globo.com/rss/ultimas/feed.xml', category: 'Ciência' },
    { url: 'https://hypescience.com/feed/', category: 'Ciência' },
    { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciência' },

    // Esportes
    { url: 'https://www.espn.com.br/rss/news', category: 'Esportes' },
    { url: 'https://ge.globo.com/rss/ge/', category: 'Esportes' },
    { url: 'https://www.lance.com.br/rss', category: 'Esportes' },
    { url: 'https://rss.uol.com.br/feed/esporte.xml', category: 'Esportes' },

    // Entretenimento / Games / Música
    { url: 'https://www.omelete.com.br/rss/rss.aspx', category: 'Entretenimento' },
    { url: 'https://billboard.com.br/feed/', category: 'Música' },
    { url: 'https://rollingstone.uol.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://jovemnerd.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://anmtv.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/cinema.xml', category: 'Entretenimento' },
    { url: 'https://br.ign.com/feed.xml', category: 'Games' },
    { url: 'https://www.theenemy.com.br/rss', category: 'Games' },
    { url: 'https://www.eurogamer.net/?format=rss', category: 'Games' },
    { url: 'https://kotaku.com/rss', category: 'Games' },
    { url: 'https://www.arkade.com.br/feed/', category: 'Games' },
    { url: 'https://voxel.com.br/rss', category: 'Games' },

    // Saúde
    { url: 'https://www.metropoles.com/saude/feed', category: 'Saúde' },
    { url: 'https://drauziovarella.uol.com.br/feed/', category: 'Saúde' },

    // Automóveis
    { url: 'https://quatrorodas.abril.com.br/feed/', category: 'Automóveis' },
    { url: 'https://autoesporte.globo.com/rss/autoesporte/', category: 'Automóveis' },

    // Turismo
    { url: 'https://viagemeturismo.abril.com.br/feed/', category: 'Turismo' },

    // Crypto
    { url: 'https://cointelegraph.com.br/rss', category: 'Crypto' },
    { url: 'https://livecoins.com.br/feed/', category: 'Crypto' }
];

const cache = new Map();
const CACHE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

export const fetchNews = async (sources = FEED_SOURCES) => {
    // Determine the sources to fetch.
    // To respect API limits, the caller should slice FEED_SOURCES.

    const now = Date.now();
    const results = await Promise.all(sources.map(async (source) => {
        const cacheKey = source.url;
        const cachedItem = cache.get(cacheKey);

        if (cachedItem && (now - cachedItem.timestamp < CACHE_EXPIRATION_MS)) {
            return cachedItem.data;
        }

        try {
            const res = await fetch(`${RSS2JSON_API}${encodeURIComponent(source.url)}`);
            const data = await res.json();
            const resultData = { ...data, category: source.category };

            cache.set(cacheKey, {
                timestamp: now,
                data: resultData
            });

            return resultData;
        } catch (err) {
            console.error(`Error fetching ${source.url}:`, err);
            return null;
        }
    }));

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

    // Sort by date (newest first)
    allNews.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    return allNews;
};

export const fetchTrendingTopics = async () => {
    // Using Google News Top Stories as a proxy for "Trending" since Google Trends RSS is often blocked or rate-limited via rss2json
    const TRENDS_URL = 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419';
    try {
        const res = await fetch(`${RSS2JSON_API}${encodeURIComponent(TRENDS_URL)}`);
        const data = await res.json();
        if (data.status === 'ok') {
            return data.items.map(item => ({
                title: item.title, // In Google News, title often includes source "Title - Source"
                link: item.link,
                pubDate: item.pubDate,
                description: item.description
            })).slice(0, 10); // Take top 10
        }
        return [];
    } catch (err) {
        console.error('Error fetching trending topics:', err);
        return [];
    }
};
