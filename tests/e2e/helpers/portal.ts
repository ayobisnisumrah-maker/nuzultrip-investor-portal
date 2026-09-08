import { createClient } from '@supabase/supabase-js'

import { serviceClient, type TestAccount } from './accounts'

export type PublishedPortalFixture = {
  pageId: string
  sectionId: string
  versionId: string
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

  const cleanup = async () => {
    if (navigationIds.length) {
      await supabase.from('portal_navigation').delete().in('id', navigationIds)
    }
    if (pageId) {
      await supabase.from('portal_pages').delete().eq('id', pageId)
    }
    await adminClient.auth.signOut()
  }

  try {
    const { data: existingHome, error: existingHomeError } = await supabase
      .from('portal_pages')
      .select('id')
      .eq('page_kind', 'home')
      .maybeSingle()
    if (existingHomeError) {
      throw new Error(`home portal lookup failed: ${existingHomeError.message}`)
    }
    if (existingHome) {
      throw new Error('E2E expected an empty local portal database but a home page already exists.')
    }

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

    const { data: section, error: sectionError } = await supabase
      .from('portal_sections')
      .insert({
        page_id: pageId,
        section_kind: 'hero_3d',
        position: 0,
        is_visible: true,
        anchor_id: 'beranda',
        status: 'draft',
      })
      .select('id')
      .single()
    if (sectionError || !section) {
      throw new Error(`portal section setup failed: ${sectionError?.message}`)
    }
    sectionId = section.id as string

    const { data: version, error: versionError } = await supabase
      .from('portal_section_versions')
      .insert({
        section_id: sectionId,
        version_number: 1,
        status: 'draft',
        created_by: admin.userId,
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
      .select('id')
      .single()
    if (versionError || !version) {
      throw new Error(`portal version setup failed: ${versionError?.message}`)
    }
    versionId = version.id as string

    const { error: currentVersionError } = await supabase
      .from('portal_sections')
      .update({ current_version_id: versionId })
      .eq('id', sectionId)
    if (currentVersionError) {
      throw new Error(`portal current version setup failed: ${currentVersionError.message}`)
    }

    for (const target of ['review', 'approved', 'published'] as const) {
      const { error } = await adminClient.schema('app').rpc('transition_portal_page', {
        p_page_id: pageId,
        p_to_status: target,
      })
      if (error) throw new Error(`portal transition to ${target} failed: ${error.message}`)
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
