import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
type Db=SupabaseClient<Database>
export type InheritanceRequest={id:string;holding_id:string;current_investor_id:string;beneficiary_name:string;beneficiary_email:string|null;beneficiary_phone:string|null;units:number;status:string;requested_at:string;approved_at:string|null;completed_at:string|null;rejection_reason:string|null;notes:string|null}
function rpc(s:Db,n:string,a:Record<string,unknown>){return (s.schema('app') as any).rpc(n,a)}
export async function listMyInheritance(s:Db){const {data,error}=await rpc(s,'list_my_ownership_inheritance',{});if(error) throw new Error('Gagal mengambil pengajuan pewaris: '+error.message);return (Array.isArray(data)?data:[]) as InheritanceRequest[]}
export async function createInheritance(s:Db,input:{holdingId:string;beneficiaryName:string;beneficiaryEmail?:string;beneficiaryPhone?:string;units?:number;notes?:string}){const {data,error}=await rpc(s,'create_ownership_inheritance_request',{p_holding_id:input.holdingId,p_beneficiary_name:input.beneficiaryName,p_beneficiary_email:input.beneficiaryEmail||null,p_beneficiary_phone:input.beneficiaryPhone||null,p_units:input.units??null,p_notes:input.notes||null});if(error) throw new Error('Gagal mengajukan pewaris: '+error.message);return data as string}
export async function cancelInheritance(s:Db,id:string){const {error}=await rpc(s,'cancel_ownership_inheritance_request',{p_request_id:id});if(error) throw new Error('Gagal membatalkan pengajuan pewaris: '+error.message)}
