import 'server-only'

import { getServiceRoleClient } from '@/server/admin/service-client'

const TOPICS = ['portal:public', 'admin:global', 'investors:all'] as const
const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export async function emitBrandRefresh(entityId: string | null = null) {
  const client = getServiceRoleClient()

  await Promise.all(
    TOPICS.map(async (topic) => {
      const { error } = await client.schema('app').rpc('emit_event', {
        p_topic: topic,
        p_kind: 'portal.theme_updated',
        p_entity_type: 'brand',
        p_entity_id: entityId ?? NIL_UUID,
        p_actor_type: 'admin',
      })
      if (error) throw new Error(`Gagal mengirim sinkronisasi brand: ${error.message}`)
    }),
  )
}
