
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const FEED_SOURCES = [
    // Tecnologia
    { url: 'https://www.cnet.com/rss/news/', category: 'Tecnologia' },
    { url: 'https://www.zdnet.com/news/rss.xml', category: 'Tecnologia' },
    { url: 'https://www.techradar.com/rss', category: 'Tecnologia' },
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
    { url: 'https://rss.slashdot.org/Slashdot/slashdot', category: 'Tecnologia' },
    { url: 'https://manualdousuario.net/feed/', category: 'Tecnologia' },
    { url: 'https://computerworld.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://itforum.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://imasters.com.br/feed', category: 'Tecnologia' },
    { url: 'https://news.ycombinator.com/rss', category: 'Tecnologia' },

    // Brasil / Política / Geral
    { url: 'https://www.campograndenews.com.br/rss/rss.xml', category: 'Brasil' },
    { url: 'https://feeds.feedburner.com/pragmatismopolitico', category: 'Brasil' },
    { url: 'https://www.metropoles.com/feed', category: 'Brasil' },
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
    { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml', category: 'Brasil' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml', category: 'Brasil' },
    { url: 'https://istoe.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.jb.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://congressoemfoco.uol.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.conjur.com.br/rss.xml', category: 'Brasil' },

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
    { url: 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml', category: 'Mundo' },

    // Negócios
    { url: 'https://neofeed.com.br/feed/', category: 'Negócios' },
    { url: 'https://braziljournal.com/feed/', category: 'Negócios' },
    { url: 'https://www.suno.com.br/feed/', category: 'Negócios' },
    { url: 'https://www.cnnbrasil.com.br/economia/feed/', category: 'Negócios' },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negócios' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negócios' },
    { url: 'https://epocanegocios.globo.com/rss/ultimas/feed.xml', category: 'Negócios' },
    { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
    { url: 'https://exame.com/feed/', category: 'Negócios' },
    { url: 'https://www.forbes.com/business/feed/', category: 'Negócios' },
    { url: 'https://www.economist.com/business/rss.xml', category: 'Negócios' },
    { url: 'https://www.valor.com.br/rss', category: 'Negócios' },
    { url: 'https://investnews.com.br/feed/', category: 'Negócios' },

    // Ciência
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', category: 'Ciência' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Ciência' },
    { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Ciência' },
    { url: 'https://revistagalileu.globo.com/rss/ultimas/feed.xml', category: 'Ciência' },
    { url: 'https://hypescience.com/feed/', category: 'Ciência' },
    { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciência' },
    { url: 'https://www.space.com/feeds/all', category: 'Ciência' },
    { url: 'https://super.abril.com.br/feed/', category: 'Ciência' },

    // Esportes
    { url: 'https://trivela.com.br/feed/', category: 'Esportes' },
    { url: 'https://www.espn.com.br/rss/news', category: 'Esportes' },
    { url: 'https://ge.globo.com/rss/ge/', category: 'Esportes' },
    { url: 'https://www.lance.com.br/rss', category: 'Esportes' },
    { url: 'https://rss.uol.com.br/feed/esporte.xml', category: 'Esportes' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml', category: 'Esportes' },
    { url: 'https://motorsport.uol.com.br/rss/f1/news/', category: 'Esportes' },
    { url: 'https://www.grandepremio.com.br/feed/', category: 'Esportes' },

    // Automóveis
    { url: 'https://quatrorodas.abril.com.br/feed/', category: 'Automóveis' },
    { url: 'https://autoesporte.globo.com/rss/autoesporte/', category: 'Automóveis' },
    { url: 'https://motor1.uol.com.br/rss/news/all/', category: 'Automóveis' },

    // Entretenimento / Games
    { url: 'https://www.papelpop.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://hugogloss.uol.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://www.omelete.com.br/rss/rss.aspx', category: 'Entretenimento' },
    { url: 'https://rollingstone.uol.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://jovemnerd.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://anmtv.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/cinema.xml', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/filmes-e-series.xml', category: 'Entretenimento' },
    { url: 'https://observatoriodocinema.uol.com.br/feed', category: 'Entretenimento' },
    { url: 'https://br.ign.com/feed.xml', category: 'Games' },
    { url: 'https://www.theenemy.com.br/rss', category: 'Games' },
    { url: 'https://www.eurogamer.net/?format=rss', category: 'Games' },
    { url: 'https://kotaku.com/rss', category: 'Games' },
    { url: 'https://www.arkade.com.br/feed/', category: 'Games' },
    { url: 'https://voxel.com.br/rss', category: 'Games' },
    { url: 'https://www.gamevicio.com/rss/', category: 'Games' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/cultura/feed.xml', category: 'Entretenimento' },

    // Saúde
    { url: 'https://www.metropoles.com/saude/feed', category: 'Saúde' },
    { url: 'https://drauziovarella.uol.com.br/feed/', category: 'Saúde' },
    { url: 'https://vidadebebe.globo.com/rss/vidadebebe/', category: 'Saúde' },

    // Cripto & Finanças
    { url: 'https://br.cointelegraph.com/rss', category: 'Cripto' },
    { url: 'https://portaldobitcoin.uol.com.br/feed/', category: 'Cripto' },
    { url: 'https://www.criptofacil.com/feed/', category: 'Cripto' },

    // Marketing & Mídia
    { url: 'https://www.meioemensagem.com.br/feed', category: 'Marketing' },
    { url: 'https://propmark.com.br/feed/', category: 'Marketing' },

    // Moda & Lifestyle
    { url: 'https://vogue.globo.com/rss/ultimas/feed.xml', category: 'Moda' },
    { url: 'https://gq.globo.com/rss/ultimas/feed.xml', category: 'Moda' }
];

const fetchWithConcurrency = async (sources, apiKey) => {
    // If API key is present, we can be more aggressive, but let's stick to safe limits.
    // Without API key, rate limit is 1 req/sec (approx).
    // With API key, it's higher.
    const BATCH_LIMIT = apiKey ? 5 : 2;
    const DELAY = 500; // ms delay between batches

    let results = [];
    for (let i = 0; i < sources.length; i += BATCH_LIMIT) {
        const chunk = sources.slice(i, i + BATCH_LIMIT);
        const promises = chunk.map(source => {
            let url = `${RSS2JSON_API}${encodeURIComponent(source.url)}`;
            if (apiKey) url += `&api_key=${apiKey}`;

            return fetch(url)
                .then(res => res.json())
                .then(data => ({ ...data, category: source.category }))
                .catch(err => {
                    console.error(`Error fetching ${source.url}:`, err);
                    return null;
                });
        });

        const chunkResults = await Promise.all(promises);
        results = [...results, ...chunkResults];

        // Add delay if there are more items to process
        if (i + BATCH_LIMIT < sources.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY));
        }
    }
    return results;
};

export const fetchNews = async (sources = FEED_SOURCES, apiKey = null) => {
    const results = await fetchWithConcurrency(sources, apiKey);

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

export const fetchTrendingTopics = async (apiKey = null) => {
    // Using Google News Top Stories as a proxy for "Trending" since Google Trends RSS is often blocked or rate-limited via rss2json
    const TRENDS_URL = 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419';
    try {
        let url = `${RSS2JSON_API}${encodeURIComponent(TRENDS_URL)}`;
        if (apiKey) url += `&api_key=${apiKey}`;

        const res = await fetch(url);
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
