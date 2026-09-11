import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/investor/',
          '/api/',
          '/auth/',
          '/masuk',
          '/lupa-sandi',
          '/atur-sandi',
        ],
      },
    ],
    host: 'https://www.nuzultrip.click',
  }
}
