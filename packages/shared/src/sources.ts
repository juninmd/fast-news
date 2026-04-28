export interface FeedSource {
  name: string;
  url: string;
  category: string;
  company: string;
}

export const FEED_SOURCES: FeedSource[] = [
  // Big Techs
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'Big Techs', company: 'GitHub' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', category: 'Big Techs', company: 'Google' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss', category: 'Big Techs', company: 'Google' },
  { name: 'Microsoft Blog', url: 'https://blogs.microsoft.com/feed/', category: 'Big Techs', company: 'Microsoft' },
  { name: 'Meta Newsroom', url: 'https://about.fb.com/news/rss/', category: 'Big Techs', company: 'Meta' },
  { name: 'Apple Newsroom', url: 'https://www.apple.com/news/rss/rss.xml', category: 'Big Techs', company: 'Apple' },
  { name: 'Amazon News', url: 'https://press.aboutamazon.com/news/press-releases', category: 'Big Techs', company: 'Amazon' },
  { name: 'Nvidia News', url: 'https://blogs.nvidia.com/feed/', category: 'Big Techs', company: 'Nvidia' },

  // AI Frontier
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'AI Frontier', company: 'OpenAI' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', category: 'AI Frontier', company: 'Anthropic' },
  { name: 'xAI Grok', url: 'https://x.ai/blog/rss', category: 'AI Frontier', company: 'xAI' },
  { name: 'Mistral AI', url: 'https://mistral.ai/news/rss/', category: 'AI Frontier', company: 'Mistral' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'AI Frontier', company: 'HuggingFace' },
  { name: 'Cohere', url: 'https://cohere.com/blog/rss.xml', category: 'AI Frontier', company: 'Cohere' },

  // Dev Tools
  { name: 'GitHub Copilot', url: 'https://github.blog/category/ai/feed/', category: 'Dev Tools', company: 'GitHub' },
  { name: 'Vercel Blog', url: 'https://vercel.com/blog/rss.xml', category: 'Dev Tools', company: 'Vercel' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', category: 'Dev Tools', company: 'Cloudflare' },
  { name: 'Supabase Blog', url: 'https://supabase.com/blog/rss.xml', category: 'Dev Tools', company: 'Supabase' },
  { name: 'Cursor Blog', url: 'https://cursor.com/blog/rss.xml', category: 'Dev Tools', company: 'Cursor' },
  { name: 'Linear Blog', url: 'https://linear.app/blog/rss.xml', category: 'Dev Tools', company: 'Linear' },
  { name: 'Stripe Blog', url: 'https://stripe.com/blog/rss.xml', category: 'Dev Tools', company: 'Stripe' },

  // Gaming
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news/', category: 'Gaming', company: 'Steam' },
  { name: 'Xbox Wire', url: 'https://news.xbox.com/en-us/feed/', category: 'Gaming', company: 'Xbox' },
  { name: 'PlayStation Blog', url: 'https://blog.playstation.com/feed/', category: 'Gaming', company: 'PlayStation' },
  { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feed', category: 'Gaming', company: 'Nintendo' },
  { name: 'IGN Gaming', url: 'https://feeds.feedburner.com/ign/gaming-all', category: 'Gaming', company: 'IGN' },
  { name: 'Kotaku', url: 'https://kotaku.com/rss', category: 'Gaming', company: 'Kotaku' },

  // Tecnologia
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tecnologia', company: 'TechCrunch' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia', company: 'The Verge' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tecnologia', company: 'Ars Technica' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Tecnologia', company: 'Wired' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Tecnologia', company: 'Engadget' },

  // IA
  { name: 'AI Blog', url: 'https://blogs.nvidia.com/category/ai/', category: 'IA', company: 'Nvidia' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'IA', company: 'MIT' },
  { name: 'AI News', url: 'https://venturebeat.com/category/ai/feed/', category: 'IA', company: 'VentureBeat' },
];

export const CATEGORIES = [
  'Todas',
  'Big Techs',
  'AI Frontier',
  'Dev Tools',
  'Gaming',
  'Tecnologia',
  'IA',
  'Brasil',
  'Mundo',
  'Negocios',
  'Cripto',
  'Ciencia',
];

export const COMPANIES = [
  'Todas',
  'GitHub',
  'Google',
  'Microsoft',
  'Meta',
  'Apple',
  'Amazon',
  'Nvidia',
  'OpenAI',
  'Anthropic',
  'xAI',
  'Mistral',
  'HuggingFace',
  'Cohere',
  'Vercel',
  'Cloudflare',
  'Supabase',
  'Cursor',
  'Steam',
  'Xbox',
  'PlayStation',
  'Nintendo',
];
