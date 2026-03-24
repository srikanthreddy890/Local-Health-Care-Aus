import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['Googlebot', 'Bingbot', 'Twitterbot', 'facebookexternalhit'],
        allow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth', '/verify-claim', '/clinic/invite/'],
      },
    ],
    sitemap: 'https://localhealthcare.com.au/sitemap.xml',
  }
}
