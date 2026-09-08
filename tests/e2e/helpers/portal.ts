import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

import { serviceClient, type TestAccount } from './accounts'

export type PublishedPortalFixture = {
  pageId: string
  sectionId: string | null
  versionId: string | null
  navigationIds: string[]
  cleanup: () => Promise<void>
}

function authenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Local Supabase public credentials are required for E2E.')

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function createPublishedHomePortal(
  admin: TestAccount,
): Promise<PublishedPortalFixture> {
  const supabase = serviceClient()
  const adminClient = authenticatedClient()
  const { error: signInError } = await adminClient.auth.signInWithPassword({
    email: admin.email,
    password: admin.password,
  })
  if (signInError) throw new Error(`portal admin sign-in failed: ${signInError.message}`)

  let pageId: string | null = null
  let sectionId: string | null = null
  let versionId: string | null = null
  const navigationIds: string[] = []

  // Browser E2E runs against an isolated local database that is discarded after
  // the job, so fixture rows do not need destructive cleanup. We still use the
  // authenticated publication lifecycle so constraints and permissions match
  // production behavior.
  const cleanup = async () => {
    await adminClient.auth.signOut()
  }

  async function transition(target: 'draft' | 'review' | 'approved' | 'published') {
    if (!pageId) throw new Error('portal page id is missing')
    const { error } = await adminClient.schema('app').rpc('transition_portal_page', {
      p_page_id: pageId,
      p_to_status: target,
    })
    if (error) throw new Error(`portal transition to ${target} failed: ${error.message}`)
  }

  async function nextPosition(): Promise<number> {
    if (!pageId) throw new Error('portal page id is missing')
    const { data, error } = await supabase
      .from('portal_sections')
      .select('position')
      .eq('page_id', pageId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`portal section position lookup failed: ${error.message}`)
    return (data?.position ?? -1) + 1
  }

  async function ensureDraftSection(options: {
    kind: 'hero_3d' | 'investment_info' | 'intro'
    anchorId: string
    content: Record<string, unknown>
  }): Promise<{ sectionId: string; versionId: string }> {
    if (!pageId) throw new Error('portal page id is missing')

    const { data: existing, error: existingError } = await supabase
      .from('portal_sections')
      .select('id, current_version_id')
      .eq('page_id', pageId)
      .eq('anchor_id', options.anchorId)
      .maybeSingle()
    if (existingError) {
      throw new Error(`portal target ${options.anchorId} lookup failed: ${existingError.message}`)
    }
    if (existing?.current_version_id) {
      return {
        sectionId: existing.id as string,
        versionId: existing.current_version_id as string,
      }
    }

    const { data: section, error: sectionError } = await supabase
      .from('portal_sections')
      .insert({
        page_id: pageId,
        section_kind: options.kind,
        position: await nextPosition(),
        is_visible: true,
        anchor_id: options.anchorId,
        status: 'draft',
      })
      .select('id')
      .single()
    if (sectionError || !section) {
      throw new Error(`portal section ${options.anchorId} setup failed: ${sectionError?.message}`)
    }

    const newSectionId = section.id as string
    const { data: version, error: versionError } = await supabase
      .from('portal_section_versions')
      .insert({
        section_id: newSectionId,
        version_number: 1,
        status: 'draft',
        created_by: admin.userId,
        content: options.content,
      })
      .select('id')
      .single()
    if (versionError || !version) {
      throw new Error(`portal version ${options.anchorId} setup failed: ${versionError?.message}`)
    }

    const newVersionId = version.id as string
    const { error: currentVersionError } = await supabase
      .from('portal_sections')
      .update({ current_version_id: newVersionId })
      .eq('id', newSectionId)
    if (currentVersionError) {
      throw new Error(
        `portal current version ${options.anchorId} setup failed: ${currentVersionError.message}`,
      )
    }

    return { sectionId: newSectionId, versionId: newVersionId }
  }

  try {
    const { data: existingHome, error: existingHomeError } = await supabase
      .from('portal_pages')
      .select('id, status, published_at')
      .eq('page_kind', 'home')
      .maybeSingle()
    if (existingHomeError) {
      throw new Error(`home portal lookup failed: ${existingHomeError.message}`)
    }

    if (existingHome?.status === 'archived') {
      throw new Error('existing E2E home portal is archived and cannot be reused')
    }

    if (existingHome) {
      pageId = existingHome.id as string
    } else {
      const { data: page, error: pageError } = await supabase
        .from('portal_pages')
        .insert({
          slug: 'home',
          title: 'Nuzultrip Equity Relations',
          page_kind: 'home',
          status: 'draft',
          is_system: false,
          seo: {},
        })
        .select('id')
        .single()
      if (pageError || !page) throw new Error(`portal page setup failed: ${pageError?.message}`)
      pageId = page.id as string
    }

    // A live revision returns only the editor state to Draft. `published_at` and
    // each published_version_id keep the previous public snapshot online until
    // the replacement revision is published atomically.
    let currentStatus = existingHome?.status ?? 'draft'
    if (currentStatus === 'published') {
      await transition('draft')
      currentStatus = 'draft'
    } else if (currentStatus === 'review' || currentStatus === 'approved') {
      await transition('draft')
      currentStatus = 'draft'
    }

    if (!existingHome?.published_at) {
      const token = randomUUID().slice(0, 8)
      const hero = await ensureDraftSection({
        kind: 'hero_3d',
        anchorId: `beranda-e2e-${token}`,
        content: {
          kind: 'hero_3d',
          eyebrow: 'Nuzultrip Equity Relations',
          title: 'Membangun Nilai|dan Kepemilikan|Bersama Nuzultrip',
          description:
            'Portal informasi bagi calon dan pemegang Equity Nuzultrip untuk memahami profil perusahaan, model bisnis, perkembangan, rencana penggunaan dana, kerangka tata kelola, faktor risiko, dan dokumen dalam satu tempat yang terstruktur.',
          primary_cta_label: 'Penawaran Equity',
          primary_cta_href: '#penawaran',
          secondary_cta_label: 'Tentang Nuzultrip',
          secondary_cta_href: '#tentang',
          footnote: 'Informasi disusun terstruktur dan diperbarui melalui portal resmi Nuzultrip.',
        },
      })
      sectionId = hero.sectionId
      versionId = hero.versionId
    } else {
      const { data: firstPublished, error: firstPublishedError } = await supabase
        .from('portal_sections')
        .select('id, published_version_id')
        .eq('page_id', pageId)
        .not('published_version_id', 'is', null)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (firstPublishedError) {
        throw new Error(`existing home section lookup failed: ${firstPublishedError.message}`)
      }
      sectionId = (firstPublished?.id as string | undefined) ?? null
      versionId = (firstPublished?.published_version_id as string | undefined) ?? null
    }

    await ensureDraftSection({
      kind: 'investment_info',
      anchorId: 'penawaran',
      content: {
        kind: 'investment_info',
        eyebrow: 'Penawaran Equity',
        title: 'Penawaran Equity Nuzultrip',
        description: 'Ringkasan struktur kepemilikan dan proses penawaran Equity Nuzultrip.',
        funding_label: 'Target penawaran',
        funding_currency: 'Rp',
        funding_target: '5.000.000.000',
        terms: [
          { label: 'Kepemilikan ditawarkan', value: '40%' },
          { label: 'Jumlah unit', value: '50 unit' },
          { label: 'Kepemilikan per unit', value: '0,8%' },
          { label: 'Nilai per unit', value: 'Rp100.000.000' },
        ],
      },
    })

    await ensureDraftSection({
      kind: 'intro',
      anchorId: 'tentang',
      content: {
        kind: 'intro',
        eyebrow: 'Tentang Nuzultrip',
        title: 'Mengenal Nuzultrip',
        description: 'Informasi perusahaan dan fondasi bisnis Nuzultrip.',
        features: [
          {
            title: 'Hubungan Equity',
            description: 'Informasi kepemilikan, perkembangan, dan dokumen tersaji terstruktur.',
          },
        ],
      },
    })

    await transition('review')
    await transition('approved')
    await transition('published')

    const { data: targetSections, error: targetSectionsError } = await supabase
      .from('portal_sections')
      .select('anchor_id, status, published_version_id')
      .eq('page_id', pageId)
      .in('anchor_id', ['penawaran', 'tentang'])
    if (targetSectionsError) {
      throw new Error(`published CTA targets lookup failed: ${targetSectionsError.message}`)
    }
    for (const anchor of ['penawaran', 'tentang']) {
      const target = targetSections?.find((item) => item.anchor_id === anchor)
      if (target?.status !== 'published' || !target.published_version_id) {
        throw new Error(`portal CTA target #${anchor} was not published`)
      }
    }

    const { data: navigation, error: navigationError } = await supabase
      .from('portal_navigation')
      .insert([
        { location: 'header', label: 'Tentang', href: '#tentang', position: 0, is_visible: true },
        { location: 'header', label: 'Penawaran', href: '#penawaran', position: 1, is_visible: true },
      ])
      .select('id')
    if (navigationError) {
      throw new Error(`portal navigation setup failed: ${navigationError.message}`)
    }
    navigationIds.push(...(navigation ?? []).map((item) => item.id as string))

    return {
      pageId,
      sectionId,
      versionId,
      navigationIds,
      cleanup,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
