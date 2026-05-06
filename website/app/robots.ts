import type { MetadataRoute } from 'next'

const BASE_URL = 'https://vibecodex-omega.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all
      { userAgent: '*', allow: '/' },

      // Traditional search
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'DuckDuckBot', allow: '/' },
      { userAgent: 'YandexBot', allow: '/' },

      // OpenAI / ChatGPT
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },

      // Anthropic / Claude
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },

      // Perplexity
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },

      // Google AI training
      { userAgent: 'Google-Extended', allow: '/' },

      // Apple Intelligence
      { userAgent: 'Applebot', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },

      // Meta
      { userAgent: 'FacebookBot', allow: '/' },
      { userAgent: 'Meta-ExternalAgent', allow: '/' },

      // Common Crawl (used by many AI training sets)
      { userAgent: 'CCBot', allow: '/' },

      // ByteDance / TikTok
      { userAgent: 'Bytespider', allow: '/' },

      // DuckDuckGo AI
      { userAgent: 'DuckAssistBot', allow: '/' },

      // Cohere
      { userAgent: 'cohere-ai', allow: '/' },

      // You.com
      { userAgent: 'YouBot', allow: '/' },

      // Mistral
      { userAgent: 'MistralAI-User', allow: '/' },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
