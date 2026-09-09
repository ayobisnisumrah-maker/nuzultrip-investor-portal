import 'server-only'

import { getServiceRoleClient } from '@/server/admin/service-client'

const TOPICS = ['portal:public', 'admin:global', 'investors:all'] as const

export async function emitBrandRefresh(entityId: string | null = null) {
  const client = getServiceRoleClient()

  await Promise.all(
    TOPICS.map(async (topic) => {
      const { error } = await client.schema('app').rpc('emit_event', {
        p_topic: topic,
        p_kind: 'portal.theme_updated',
        p_entity_type: 'brand',
        p_entity_id: entityId,
        p_actor_type: 'admin',
      })
      if (error) throw new Error(`Gagal mengirim sinkronisasi brand: ${error.message}`)
    }),
  )
}
