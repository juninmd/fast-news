
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const FEED_SOURCES = [
    // --- TECNOLOGIA (MUNDO) ---
    { url: 'https://techcrunch.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia' },
    { url: 'https://www.theverge.com/tech/rss/index.xml', category: 'Tecnologia' },
    { url: 'https://www.wired.com/feed/rss', category: 'Tecnologia' },
    { url: 'https://arstechnica.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.engadget.com/rss.xml', category: 'Tecnologia' },
    { url: 'https://www.cnet.com/rss/news/', category: 'Tecnologia' },
    { url: 'https://www.zdnet.com/news/rss.xml', category: 'Tecnologia' },
    { url: 'https://www.techradar.com/rss', category: 'Tecnologia' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Tecnologia' },
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Tecnologia' },
    { url: 'https://rss.slashdot.org/Slashdot/slashdot', category: 'Tecnologia' },
    { url: 'https://news.ycombinator.com/rss', category: 'Tecnologia' },
    { url: 'https://venturebeat.com/feed/', category: 'Tecnologia' },
    { url: 'https://readwrite.com/feed/', category: 'Tecnologia' },
    { url: 'https://thenextweb.com/feed/', category: 'Tecnologia' },
    { url: 'https://mashable.com/feed/', category: 'Tecnologia' },
    { url: 'https://gizmodo.com/rss', category: 'Tecnologia' },
    { url: 'https://9to5mac.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.macrumors.com/macrumors.xml', category: 'Tecnologia' },
    { url: 'https://www.androidauthority.com/feed/', category: 'Tecnologia' },
    { url: 'https://www.androidcentral.com/feed', category: 'Tecnologia' },
    { url: 'https://www.theinformation.com/feed', category: 'Tecnologia' },
    { url: 'https://spectrum.ieee.org/rss/computing', category: 'Tecnologia' },
    { url: 'https://www.extremetech.com/feed', category: 'Tecnologia' },
    { url: 'https://www.tomshardware.com/feeds/all', category: 'Tecnologia' },
    { url: 'https://www.anandtech.com/rss/', category: 'Tecnologia' },
    { url: 'https://feeds.feedburner.com/TechCrunch/startups', category: 'Tecnologia' },
    { url: 'https://www.smashingmagazine.com/feed', category: 'Tecnologia' },
    { url: 'https://hackernoon.com/feed', category: 'Tecnologia' },
    { url: 'https://dev.to/feed', category: 'Tecnologia' },
    { url: 'https://www.sitepoint.com/feed', category: 'Tecnologia' },
    { url: 'https://www.sciencealert.com/feed', category: 'Tecnologia' },
    { url: 'https://www.theregister.com/headlines.atom', category: 'Tecnologia' },
    { url: 'https://www.bleepingcomputer.com/feed/', category: 'Tecnologia' },
    { url: 'https://krebsonsecurity.com/feed/', category: 'Tecnologia' },
    { url: 'https://threatpost.com/feed/', category: 'Tecnologia' },

    // --- TECNOLOGIA (BRASIL) ---
    { url: 'https://mundoconectado.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.showmetech.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://canaltech.com.br/rss/produtos', category: 'Tecnologia' },
    { url: 'https://rss.tecmundo.com.br/feed', category: 'Tecnologia' },
    { url: 'https://www.techtudo.com.br/feed', category: 'Tecnologia' },
    { url: 'https://teletime.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://canaltech.com.br/rss/', category: 'Tecnologia' },
    { url: 'https://canaltech.com.br/rss/produtos', category: 'Tecnologia' },
    { url: 'https://rss.techtudo.com.br/feed', category: 'Tecnologia' },
    { url: 'https://olhardigital.com.br/rss', category: 'Tecnologia' },
    { url: 'https://olhardigital.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://tecnoblog.net/feed/', category: 'Tecnologia' },
    { url: 'https://meiobit.com/feed/', category: 'Tecnologia' },
    { url: 'https://mundoconectado.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.tudocelular.com/rss/', category: 'Tecnologia' },
    { url: 'https://macmagazine.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://manualdousuario.net/feed/', category: 'Tecnologia' },
    { url: 'https://computerworld.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://itforum.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://imasters.com.br/feed', category: 'Tecnologia' },
    { url: 'https://tecnoblog.net/feed/', category: 'Tecnologia' },
    { url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'Tecnologia' },
    { url: 'https://nucleo.jor.br/feed/', category: 'Tecnologia' },
    { url: 'https://mittechreview.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://gizmodo.uol.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.hardware.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://adrena.me/feed/', category: 'Tecnologia' },
    { url: 'https://www.showmetech.com.br/feed/', category: 'Tecnologia' },
    { url: 'https://www.oficinadanet.com.br/rss.xml', category: 'Tecnologia' },

    // --- INTELIGÊNCIA ARTIFICIAL ---
    { url: 'https://www.unite.ai/feed/', category: 'IA' },
    { url: 'https://blogs.nvidia.com/feed/', category: 'IA' },
    { url: 'https://openai.com/blog/rss.xml', category: 'IA' },
    { url: 'https://www.artificialintelligence-news.com/feed/', category: 'IA' },
    { url: 'https://datanami.com/feed/', category: 'IA' },
    { url: 'https://www.marktechpost.com/feed/', category: 'IA' },
    { url: 'https://www.kdnuggets.com/feed', category: 'IA' },
    { url: 'https://mit-press.mit.edu/feed', category: 'IA' },
    { url: 'https://stability.ai/blog/rss', category: 'IA' },
    { url: 'https://www.deepmind.com/blog/rss.xml', category: 'IA' },
    { url: 'https://news.microsoft.com/source/feed/', category: 'IA' },
    { url: 'https://ai.googleblog.com/atom.xml', category: 'IA' },
    { url: 'https://aws.amazon.com/blogs/machine-learning/feed/', category: 'IA' },
    { url: 'https://machinelearningmastery.com/feed/', category: 'IA' },
    { url: 'https://towardsdatascience.com/feed', category: 'IA' },

    // --- BRASIL ---
    { url: 'https://jornaldebrasilia.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.correio24horas.com.br/rss', category: 'Brasil' },
    { url: 'https://www.bnews.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/rss', category: 'Brasil' },
    { url: 'https://jovempan.com.br/feed', category: 'Brasil' },
    { url: 'https://www.metropoles.com/feed', category: 'Brasil' },
    { url: 'https://www.estadao.com.br/rss/ultimas', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/', category: 'Brasil' },
    { url: 'https://www.tse.jus.br/rss', category: 'Brasil' },
    { url: 'https://www.em.com.br/rss/noticia/politica/rss.xml', category: 'Brasil' },
    { url: 'https://www.otempo.com.br/rss/politica', category: 'Brasil' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.terra.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://www.sbtnews.com.br/feed', category: 'Brasil' },
    { url: 'https://noticias.r7.com/feed.xml', category: 'Brasil' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil' },
    { url: 'https://gauchazh.clicrbs.com.br/rss/', category: 'Brasil' },
    { url: 'https://www.jota.info/feed', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/politica/', category: 'Brasil' },
    { url: 'https://oantagonista.uol.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.band.uol.com.br/rss', category: 'Brasil' },
    { url: 'https://rss.uol.com.br/feed/noticias.xml', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', category: 'Brasil' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.estadao.com.br/rss/ultimas', category: 'Brasil' },
    { url: 'https://www.poder360.com.br/feed', category: 'Brasil' },
    { url: 'https://www.poder360.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.cartacapital.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.bbc.com/portuguese/index.xml', category: 'Brasil' },
    { url: 'https://veja.abril.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.terra.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil' },
    { url: 'https://istoe.com.br/feed/', category: 'Brasil' },
    { url: 'https://noticias.r7.com/feed.xml', category: 'Brasil' },
    { url: 'https://www.em.com.br/rss/noticias/', category: 'Brasil' },
    { url: 'https://jc.ne10.uol.com.br/rss', category: 'Brasil' },
    { url: 'https://www.diariodepernambuco.com.br/rss/', category: 'Brasil' },
    { url: 'https://www.correiobraziliense.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://www.opovo.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://www.otempo.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://www.nsctotal.com.br/feed', category: 'Brasil' },
    { url: 'https://www.gazetadopovo.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.metropoles.com/feed', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/ultimas-noticias/rss.xml', category: 'Geral' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Geral' },
    { url: 'https://www.em.com.br/rss/noticia/gerais/rss.xml', category: 'Geral' },
    { url: 'https://www.correiobraziliense.com.br/rss/noticia/brasil/rss.xml', category: 'Geral' },
    { url: 'https://www.jb.com.br/rss.xml', category: 'Geral' },
    { url: 'https://www.gazetadopovo.com.br/rss/', category: 'Geral' },
    { url: 'https://congressoemfoco.uol.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.brasil247.com/feed', category: 'Brasil' },
    { url: 'https://www.diariodocentrodomundo.com.br/feed/', category: 'Brasil' },
    { url: 'https://revistaforum.com.br/feed', category: 'Brasil' },
    { url: 'https://www.conjur.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://oglobo.globo.com/rss/brasil.xml', category: 'Brasil' },
    { url: 'https://oglobo.globo.com/rss/economia.xml', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/educacao/', category: 'Brasil' },
    { url: 'https://apublica.org/feed/', category: 'Brasil' },
    { url: 'https://joioeotrigo.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.correiobraziliense.com.br/rss/noticia/brasil/rss.xml', category: 'Brasil' },
    { url: 'https://br.noticias.yahoo.com/rss', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/cotidiano/rss.xml', category: 'Brasil' },
    { url: 'https://agenciapublica.org/feed/', category: 'Brasil' },
    { url: 'https://piaui.folha.uol.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.sbtnews.com.br/feed', category: 'Brasil' },
    { url: 'https://jovempan.com.br/feed', category: 'Brasil' },
    { url: 'https://www.gazetadopovo.com.br/feed/rss/brasil.xml', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/politica/rss.xml', category: 'Brasil' },
    { url: 'https://diplomatique.org.br/feed/', category: 'Brasil' },
    { url: 'https://guiadoestudante.abril.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.nexojornal.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://revistaforum.com.br/feed/', category: 'Brasil' },
    { url: 'https://www.brasildefato.com.br/rss2.xml', category: 'Brasil' },


    // --- GERAL/ENTRETENIMENTO (EXTRAS) ---
    { url: 'https://catracalivre.com.br/feed/', category: 'Geral' },
    { url: 'https://www.brasildefato.com.br/rss2.xml', category: 'Geral' },
    { url: 'https://www.poder360.com.br/feed/', category: 'Geral' },
    { url: 'https://g1.globo.com/rss/g1/pop-arte/', category: 'Entretenimento' },
    { url: 'https://g1.globo.com/rss/g1/sao-paulo/', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/rio-de-janeiro/', category: 'Brasil' },
    { url: 'https://g1.globo.com/rss/g1/minas-gerais/', category: 'Brasil' },

    // --- MUNDO ---
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
    { url: 'https://www.thesun.co.uk/news/worldnews/feed/', category: 'Mundo' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
    { url: 'https://www.theguardian.com/world/rss', category: 'Mundo' },
    { url: 'https://feeds.washingtonpost.com/rss/world', category: 'Mundo' },
    { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },
    { url: 'https://nypost.com/world/feed/', category: 'Mundo' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', category: 'Mundo' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'Mundo' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
    { url: 'https://www.theguardian.com/world/rss', category: 'Mundo' },
    { url: 'https://feeds.washingtonpost.com/rss/world', category: 'Mundo' },
    { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },
    { url: 'https://feeds.npr.org/1001/rss.xml', category: 'Mundo' },
    { url: 'https://www.france24.com/en/rss', category: 'Mundo' },
    { url: 'https://rss.dw.com/rdf/rss-br-all', category: 'Mundo' },
    { url: 'https://news.un.org/feed/subscribe/pt/news/all/rss.xml', category: 'Mundo' },
    { url: 'https://apnews.com/hub/ap-top-news?format=rss', category: 'Mundo' },
    { url: 'https://www.independent.co.uk/news/world/rss', category: 'Mundo' },
    { url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', category: 'Mundo' },
    { url: 'https://www.rtp.pt/noticias/rss/mundo', category: 'Mundo' },
    { url: 'https://pt.euronews.com/rss?format=xml', category: 'Mundo' },
    { url: 'https://www.huffpost.com/section/world-news/feed', category: 'Mundo' },
    { url: 'https://www.cbsnews.com/latest/rss/world', category: 'Mundo' },
    { url: 'https://g1.globo.com/rss/g1/mundo/', category: 'Mundo' },
    { url: 'https://www.vox.com/rss/index.xml', category: 'Mundo' },
    { url: 'https://www.axios.com/feeds/feed.rss', category: 'Mundo' },
    { url: 'https://time.com/feed/', category: 'Mundo' },
    { url: 'https://www.politico.com/rss/politicopicks.xml', category: 'Mundo' },
    { url: 'https://slate.com/feeds/all.rss', category: 'Mundo' },

    // --- NEGÓCIOS & FINANÇAS ---
    { url: 'https://valor.globo.com/rss/financas/', category: 'Negócios' },
    { url: 'https://valor.globo.com/rss/empresas/', category: 'Negócios' },
    { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negócios' },
    { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negócios' },
    { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
    { url: 'https://exame.com/feed/', category: 'Negócios' },
    { url: 'https://www.forbes.com/business/feed/', category: 'Negócios' },
    { url: 'https://www.economist.com/business/rss.xml', category: 'Negócios' },
    { url: 'https://www.valor.com.br/rss', category: 'Negócios' },
    { url: 'https://investnews.com.br/feed/', category: 'Negócios' },
    { url: 'https://www.moneytimes.com.br/feed/', category: 'Negócios' },
    { url: 'https://braziljournal.com/feed/', category: 'Negócios' },
    { url: 'https://neofeed.com.br/feed/', category: 'Negócios' },
    { url: 'https://www.suno.com.br/feed/', category: 'Negócios' },
    { url: 'https://epocanegocios.globo.com/rss/ultimas/feed.xml', category: 'Negócios' },
    { url: 'https://br.investing.com/rss/news.rss', category: 'Negócios' },
    { url: 'https://economia.uol.com.br/rss', category: 'Negócios' },
    { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
    { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Negócios' },
    { url: 'https://www.wsj.com/xml/rss/3_7014.xml', category: 'Negócios' },
    { url: 'https://www.ft.com/?format=rss', category: 'Negócios' },
    { url: 'https://startupi.com.br/feed/', category: 'Negócios' },
    { url: 'https://startups.com.br/feed/', category: 'Negócios' },
    { url: 'https://www.wsj.com/xml/rss/3_7031.xml', category: 'Negócios' },
    { url: 'https://www.cnnbrasil.com.br/feed/economia', category: 'Negócios' },
    { url: 'https://www.bloomberglinea.com.br/arc/outboundfeeds/rss/', category: 'Negócios' },
    { url: 'https://einvestidor.estadao.com.br/feed/', category: 'Negócios' },
    { url: 'https://www.suno.com.br/noticias/feed/', category: 'Negócios' },
    { url: 'https://forbes.com.br/feed/', category: 'Negócios' },
    { url: 'https://revistapegn.globo.com/rss/ultimas/feed.xml', category: 'Negócios' },
    { url: 'https://valorinveste.globo.com/rss/valor-investe', category: 'Negócios' },

    // --- CRIPTOMOEDAS ---
    { url: 'https://br.cointelegraph.com/rss', category: 'Cripto' },
    { url: 'https://portaldobitcoin.uol.com.br/feed/', category: 'Cripto' },
    { url: 'https://www.criptofacil.com/feed/', category: 'Cripto' },
    { url: 'https://livecoins.com.br/feed/', category: 'Cripto' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Cripto' },
    { url: 'https://www.seudinheiro.com/feed/', category: 'Negócios' },
    { url: 'https://cointelegraph.com/rss', category: 'Cripto' },
    { url: 'https://decrypt.co/feed', category: 'Cripto' },
    { url: 'https://99bitcoins.com/feed/', category: 'Cripto' },
    { url: 'https://coinjournal.net/feed/', category: 'Cripto' },
    { url: 'https://blog.coinbase.com/feed', category: 'Cripto' },

    // --- CIÊNCIA & ESPAÇO ---
    { url: 'https://jornal.usp.br/feed/', category: 'Ciência' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', category: 'Ciência' },
    { url: 'https://revistapesquisa.fapesp.br/feed/', category: 'Ciência' },
    { url: 'https://www.jornaldaciencia.org.br/feed/', category: 'Ciência' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Ciência' },
    { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Ciência' },
    { url: 'https://revistagalileu.globo.com/rss/ultimas/feed.xml', category: 'Ciência' },
    { url: 'https://hypescience.com/feed/', category: 'Ciência' },
    { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciência' },
    { url: 'https://www.space.com/feeds/all', category: 'Ciência' },
    { url: 'https://super.abril.com.br/feed/', category: 'Ciência' },
    { url: 'https://www.nature.com/nature.rss', category: 'Ciência' },
    { url: 'https://www.nationalgeographicbrasil.com/rss.xml', category: 'Ciência' },
    { url: 'https://gizmodo.uol.com.br/ciencia/feed/', category: 'Ciência' },
    { url: 'https://www.newscientist.com/feed/home/', category: 'Ciência' },
    { url: 'https://phys.org/rss-feed/', category: 'Ciência' },
    { url: 'https://socientifica.com.br/feed/', category: 'Ciência' },
    { url: 'https://engenhariae.com.br/feed', category: 'Ciência' },
    { url: 'https://umsoplaneta.globo.com/rss/umsoplaneta/', category: 'Ciência' },
    { url: 'https://www.inovacaotecnologica.com.br/boletim/rss.xml', category: 'Ciência' },
    { url: 'https://canaltech.com.br/rss/ciencia', category: 'Ciência' },
    { url: 'https://olhardigital.com.br/ciencia-e-espaco/rss', category: 'Ciência' },
    { url: 'https://www.eurekalert.org/rss.xml', category: 'Ciência' },
    { url: 'https://www.livescience.com/feeds/all', category: 'Ciência' },
    { url: 'https://www.scientificamerican.com/feed/xml/', category: 'Ciência' },
    { url: 'https://www.popsci.com/feed/', category: 'Ciência' },
    { url: 'https://www.smithsonianmag.com/rss/science-nature/', category: 'Ciência' },
    { url: 'https://www.discovermagazine.com/feed', category: 'Ciência' },

    // --- GAMES ---
    { url: 'https://br.ign.com/feed.xml', category: 'Games' },
    { url: 'https://omelete.com.br/rss', category: 'Entretenimento' },
    { url: 'https://br.ign.com/playstation/feed.xml', category: 'Games' },
    { url: 'https://br.ign.com/xbox/feed.xml', category: 'Games' },
    { url: 'https://www.nintendolife.com/feeds/latest', category: 'Games' },
    { url: 'https://www.theenemy.com.br/rss', category: 'Games' },
    { url: 'https://www.eurogamer.net/?format=rss', category: 'Games' },
    { url: 'https://kotaku.com/rss', category: 'Games' },
    { url: 'https://www.arkade.com.br/feed/', category: 'Games' },
    { url: 'https://voxel.com.br/rss', category: 'Games' },
    { url: 'https://www.gamevicio.com/rss/', category: 'Games' },
    { url: 'https://www.gamespot.com/feeds/mashup/', category: 'Games' },
    { url: 'https://www.polygon.com/rss/index.xml', category: 'Games' },
    { url: 'https://nerdizmo.uai.com.br/feed/', category: 'Games' },
    { url: 'https://jovemnerd.com.br/feed/nerdbunker', category: 'Games' },
    { url: 'https://www.pcgamer.com/rss', category: 'Games' },
    { url: 'https://jovemnerd.com.br/feed/games', category: 'Games' },
    { url: 'https://adrenaline.com.br/rss', category: 'Games' },
    { url: 'https://www.rockpapershotgun.com/feed', category: 'Games' },
    { url: 'https://www.comboinfinito.com.br/principal/feed/', category: 'Games' },
    { url: 'https://switch-brasil.com/feed/', category: 'Games' },

    // --- ESPORTES ---
    { url: 'https://placar.com.br/feed/', category: 'Esportes' },
    { url: 'https://diariodonordeste.verdesmares.com.br/jogada/rss', category: 'Esportes' },
    { url: 'https://www.uol.com.br/esporte/volei/ultimas-noticias/rss.xml', category: 'Esportes' },
    { url: 'https://www.uol.com.br/esporte/basquete/ultimas-noticias/rss.xml', category: 'Esportes' },
    { url: 'https://www.uol.com.br/esporte/ultimas-noticias/rss.xml', category: 'Esportes' },
    { url: 'https://www.band.uol.com.br/esportes/rss', category: 'Esportes' },
    { url: 'https://trivela.com.br/feed/', category: 'Esportes' },
    { url: 'https://www.espn.com.br/rss/news', category: 'Esportes' },
    { url: 'https://ge.globo.com/rss/ge/', category: 'Esportes' },
    { url: 'https://www.lance.com.br/rss', category: 'Esportes' },
    { url: 'https://www.gazetaesportiva.com/feed/', category: 'Esportes' },
    { url: 'https://www.meutimao.com.br/rss/', category: 'Esportes' },
    { url: 'https://colunadofla.com/feed/', category: 'Esportes' },
    { url: 'https://rss.uol.com.br/feed/esporte.xml', category: 'Esportes' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/esportes/feed.xml', category: 'Esportes' },
    { url: 'https://motorsport.uol.com.br/rss/f1/news/', category: 'Esportes' },
    { url: 'https://www.grandepremio.com.br/feed/', category: 'Esportes' },
    { url: 'https://maquinadoesporte.com.br/feed/', category: 'Esportes' },
    { url: 'https://www.olimpiadatododia.com.br/feed/', category: 'Esportes' },
    { url: 'https://www.skysports.com/rss/12040', category: 'Esportes' },
    { url: 'https://www.goal.com/feeds/br/news', category: 'Esportes' },

    // --- AUTOMÓVEIS ---
    { url: 'https://quatrorodas.abril.com.br/feed/', category: 'Automóveis' },
    { url: 'https://www.icarros.com.br/noticias/rss.jsp', category: 'Automóveis' },
    { url: 'https://autoesporte.globo.com/rss/autoesporte/', category: 'Automóveis' },
    { url: 'https://motor1.uol.com.br/rss/news/all/', category: 'Automóveis' },
    { url: 'https://jornaldocarro.estadao.com.br/feed/', category: 'Automóveis' },
    { url: 'https://www.autoblog.com/rss.xml', category: 'Automóveis' },
    { url: 'https://www.noticiasautomotivas.com.br/feed/', category: 'Automóveis' },
    { url: 'https://garagem360.com.br/feed/', category: 'Automóveis' },
    { url: 'https://www.topgear.com/car-news/rss.xml', category: 'Automóveis' },
    { url: 'https://wm1.com.br/rss', category: 'Automóveis' },

    // --- ENTRETENIMENTO ---
    { url: 'https://f5.folha.uol.com.br/feed/rss091.xml', category: 'Entretenimento' },
    { url: 'https://www.papelpop.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://hugogloss.uol.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://www.omelete.com.br/rss/rss.aspx', category: 'Entretenimento' },
    { url: 'https://rollingstone.uol.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://jovemnerd.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://anmtv.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/cinema.xml', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/filmes-e-series.xml', category: 'Entretenimento' },
    { url: 'https://observatoriodocinema.uol.com.br/feed', category: 'Entretenimento' },
    { url: 'https://variety.com/feed/', category: 'Entretenimento' },
    { url: 'https://www.hollywoodreporter.com/feed/', category: 'Entretenimento' },
    { url: 'https://agenciabrasil.ebc.com.br/rss/cultura/feed.xml', category: 'Entretenimento' },
    { url: 'https://cinepop.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://pipocamoderna.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://catracalivre.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://www.hypeness.com.br/feed/', category: 'Entretenimento' },
    { url: 'https://www.adorocinema.com/rss/noticias.xml', category: 'Entretenimento' },
    { url: 'https://casavogue.globo.com/rss/ultimas/feed.xml', category: 'Entretenimento' },

    // --- SAÚDE & BEM-ESTAR ---
    { url: 'https://www.metropoles.com/saude/feed', category: 'Saúde' },
    { url: 'https://drauziovarella.uol.com.br/feed/', category: 'Saúde' },
    { url: 'https://vidadebebe.globo.com/rss/vidadebebe/', category: 'Saúde' },
    { url: 'https://www.minhavida.com.br/rss', category: 'Saúde' },
    { url: 'https://www.webmd.com/rss/rss.aspx?rssType=news', category: 'Saúde' },
    { url: 'https://veja.abril.com.br/saude/feed/', category: 'Saúde' },
    { url: 'https://cuidadospelavida.com.br/feed', category: 'Saúde' },
    { url: 'https://www.medicalnewstoday.com/feed', category: 'Saúde' },

    // --- MARKETING ---
    { url: 'https://www.meioemensagem.com.br/feed', category: 'Marketing' },
    { url: 'https://propmark.com.br/feed/', category: 'Marketing' },
    { url: 'https://adage.com/rss-feed', category: 'Marketing' },
    { url: 'https://exame.com/marketing/feed/', category: 'Marketing' },
    { url: 'https://www.b9.com.br/feed/', category: 'Marketing' },
    { url: 'https://www.promoview.com.br/feed/', category: 'Marketing' },
    { url: 'https://adnews.com.br/feed/', category: 'Marketing' },

    // --- MODA ---
    { url: 'https://vogue.globo.com/rss/ultimas/feed.xml', category: 'Moda' },
    { url: 'https://gq.globo.com/rss/ultimas/feed.xml', category: 'Moda' },
    { url: 'https://elle.com.br/feed', category: 'Moda' },
    { url: 'https://marieclaire.globo.com/rss/ultimas/feed.xml', category: 'Moda' },
    { url: 'https://ffw.uol.com.br/feed/', category: 'Moda' },

    // --- MÚSICA ---
    { url: 'https://pitchfork.com/rss/reviews/best/albums/', category: 'Música' },
    { url: 'https://whiplash.net/rss.xml', category: 'Música' },
    { url: 'https://www.tenhomaisdiscosqueamigos.com/feed/', category: 'Música' },
    { url: 'https://rollingstone.uol.com.br/rss', category: 'Música' },

    // --- TURISMO ---
    { url: 'https://g1.globo.com/rss/g1/turismo-e-viagem/', category: 'Turismo' },

    // --- ADICIONADOS ---
    { url: 'https://veja.abril.com.br/feed/', category: 'Brasil' },
    { url: 'https://exame.com/feed/', category: 'Negócios' },
    { url: 'https://oglobo.globo.com/rss/', category: 'Brasil' },
    { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
    { url: 'https://tecnoblog.net/feed/', category: 'Tecnologia' },
    { url: 'https://g1.globo.com/rss/g1/carros/', category: 'Automóveis' },
    { url: 'https://g1.globo.com/rss/g1/turismo-e-viagem/', category: 'Turismo' },
    { url: 'https://feeds.folha.uol.com.br/esporte/rss091.xml', category: 'Esportes' },
    { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', category: 'Negócios' },
    { url: 'https://feeds.folha.uol.com.br/ilustrada/rss091.xml', category: 'Entretenimento' },
    { url: 'https://rss.uol.com.br/feed/economia.xml', category: 'Negócios' },
    { url: 'https://rss.uol.com.br/feed/tecnologia.xml', category: 'Tecnologia' },
    { url: 'https://rss.uol.com.br/feed/entretenimento.xml', category: 'Entretenimento' },
    { url: 'https://www.tecmundo.com.br/rss', category: 'Tecnologia' },
    { url: 'https://www.meioemensagem.com.br/feed', category: 'Marketing' },

    // --- NOVOS PORTAIS ADICIONADOS (MAIS BRASIL E GERAL) ---
    { url: 'https://g1.globo.com/rss/g1/tecnologia/', category: 'Tecnologia' },
    { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Negócios' },
    { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Brasil' },
    { url: 'https://noticias.uol.com.br/rss.xml', category: 'Brasil' },
    { url: 'https://jovempan.com.br/noticias/mundo/feed', category: 'Mundo' },
    { url: 'https://jovempan.com.br/noticias/tecnologia/feed', category: 'Tecnologia' },
    { url: 'https://www.r7.com/tecnologia/feed.xml', category: 'Tecnologia' },
    { url: 'https://www.r7.com/economia/feed.xml', category: 'Negócios' },
    { url: 'https://noticias.uol.com.br/saude/rss.xml', category: 'Saúde' },
    { url: 'https://oglobo.globo.com/rss/mundo.xml', category: 'Mundo' },
    { url: 'https://www.bbc.com/portuguese/topics/c7zp57yyz25t/index.xml', category: 'Mundo' },
    { url: 'https://www.bbc.com/portuguese/topics/c340q0p2585t/index.xml', category: 'Ciência' },
    { url: 'https://noticias.uol.com.br/meio-ambiente/rss.xml', category: 'Ciência' },
    { url: 'https://www.techtudo.com.br/rss', category: 'Tecnologia' },

    // --- ADICIONADOS (EXTRAS) ---
    { url: 'https://www.correiobraziliense.com.br/rss/noticia/tecnologia/rss.xml', category: 'Tecnologia' },
    { url: 'https://www.nexo.com.br/rss', category: 'Brasil' },
    { url: 'https://agenciapublica.org/feed/', category: 'Brasil' },
    { url: 'https://www.metropoles.com/tecnologia/feed', category: 'Tecnologia' },
    { url: 'https://noticias.uol.com.br/cotidiano/rss.xml', category: 'Geral' },
    { url: 'https://oglobo.globo.com/rss/brasil.xml', category: 'Brasil' },
    { url: 'https://oglobo.globo.com/rss/economia.xml', category: 'Negócios' },
    { url: 'https://oglobo.globo.com/rss/mundo.xml', category: 'Mundo' },
    { url: 'https://g1.globo.com/rss/g1/educacao/', category: 'Educação' },
    { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Saúde' },
    { url: 'https://jovempan.com.br/noticias/brasil/feed', category: 'Brasil' },
    { url: 'https://www.correiobraziliense.com.br/rss/noticia/politica/rss.xml', category: 'Política' },
    { url: 'https://www.cartacapital.com.br/politica/feed/', category: 'Política' },
    { url: 'https://www.metropoles.com/brasil/feed', category: 'Brasil' },

    // --- NOVOS PORTAIS (ADICIONADOS RECENTEMENTE) ---
    { url: 'https://g1.globo.com/rss/g1/pop-arte/', category: 'Entretenimento' },
    { url: 'https://g1.globo.com/rss/g1/natureza/', category: 'Ciência' },
    { url: 'https://g1.globo.com/rss/g1/concursos-e-emprego/', category: 'Negócios' },
    { url: 'https://g1.globo.com/rss/g1/planeta-bizarro/', category: 'Geral' },
    { url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', category: 'Brasil' },
    { url: 'https://feeds.folha.uol.com.br/educacao/rss091.xml', category: 'Educação' },
    { url: 'https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml', category: 'Saúde' },
    { url: 'https://feeds.folha.uol.com.br/tec/rss091.xml', category: 'Tecnologia' },
    { url: 'https://feeds.folha.uol.com.br/turismo/rss091.xml', category: 'Turismo' },
    { url: 'https://noticias.uol.com.br/internacional/rss.xml', category: 'Mundo' },
    { url: 'https://noticias.uol.com.br/ciencia/rss.xml', category: 'Ciência' },
    { url: 'https://www.band.uol.com.br/noticias/rss', category: 'Brasil' },
    { url: 'https://www.band.uol.com.br/entretenimento/rss', category: 'Entretenimento' },
    { url: 'https://www.sbtnews.com.br/feed/politica', category: 'Política' },
    { url: 'https://www.sbtnews.com.br/feed/economia', category: 'Negócios' },
    { url: 'https://www.tecmundo.com.br/rss/jogos', category: 'Games' },
    { url: 'https://www.tecmundo.com.br/rss/software', category: 'Tecnologia' },
    { url: 'https://www.tecmundo.com.br/rss/ciencia', category: 'Ciência' },
    { url: 'https://www.jornalopcao.com.br/feed/', category: 'Brasil' },
    { url: 'https://diariodonordeste.verdesmares.com.br/rss/noticias', category: 'Brasil' },
    { url: 'https://jc.ne10.uol.com.br/rss/pernambuco', category: 'Brasil' },
    { url: 'https://br.ign.com/cinema/feed.xml', category: 'Entretenimento' },
    { url: 'https://br.ign.com/tv/feed.xml', category: 'Entretenimento' }
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
