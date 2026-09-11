import {requireInvestorPage} from '@/server/auth/page-guards'
import {getServerSupabase} from '@/server/supabase/server'
import {listMyInheritance} from '@/server/ownership/inheritance-service'
import {topics} from '@/core/realtime/events'
import {RealtimeRefresher} from '@/features/realtime/realtime-refresher'
import {PageHeader,Stack} from '@/ui/layout'
import {Card,CardBody} from '@/ui/card'
import {EmptyState} from '@/ui/states'
export default async function InvestorInheritancePage(){const principal=await requireInvestorPage('/investor/ownership/inheritance');const s=await getServerSupabase();const rows=await listMyInheritance(s);return <Stack gap={6}><RealtimeRefresher topic={topics.investor(principal.investorId)} kinds={['ownership.changed']}/><PageHeader eyebrow="Kepemilikan" title="Pewaris Saham" description="Kelola pengajuan pewarisan saham dan pantau status pemeriksaannya."/><Card><CardBody>{rows.length===0?<EmptyState title="Belum ada pengajuan pewaris" description="Pengajuan pewaris dibuat dari kepemilikan saham aktif Anda."/>:<div className="grid gap-3">{rows.map(x=><div key={x.id} className="rounded-lg border border-border p-4"><div className="font-semibold">{x.beneficiary_name}</div><div className="text-body-sm text-fg-subtle">{x.units.toLocaleString('id-ID')} unit · Status: {x.status}</div><div className="text-caption mt-1 text-fg-subtle">{new Date(x.requested_at).toLocaleDateString('id-ID')}</div></div>)}</div>}</CardBody></Card></Stack>}
