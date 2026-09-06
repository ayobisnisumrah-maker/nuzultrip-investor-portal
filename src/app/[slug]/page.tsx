import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PublicPortalReference } from '@/features/portal/public-portal-reference'
import {
  getPublishedNavigation,
  getPublishedPortalPageBySlug,
} from '@/server/portal/public-queries'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params

  const portal = await getPublishedPortalPageBySlug(slug)

  if (!portal) {
    return {
      title: 'Halaman tidak ditemukan',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const seo =
    portal.page.seo &&
    typeof portal.page.seo === 'object' &&
    !Array.isArray(portal.page.seo)
      ? (portal.page.seo as Record<string, unknown>)
      : {}

  const title =
    typeof seo.title === 'string' && seo.title.trim()
      ? seo.title.trim()
      : portal.page.title

  const description =
    typeof seo.description === 'string' && seo.description.trim()
      ? seo.description.trim()
      : undefined

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      type: 'website',
    },
  }
}

export default async function PublicPortalPage({
  params,
}: PageProps) {
  const { slug } = await params

  const [portal, navigation] = await Promise.all([
    getPublishedPortalPageBySlug(slug),
    getPublishedNavigation(),
  ])

  if (!portal) {
    notFound()
  }

  return (
    <PublicPortalReference
      page={{
        title: 'Nuzultrip',
        seo: portal.page.seo,
      }}
      sections={portal.sections}
      navigation={navigation}
    />
  )
}
