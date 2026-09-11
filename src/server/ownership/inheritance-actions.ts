'use server'
import {revalidatePath} from 'next/cache'
import {z} from 'zod'
import {defineAction} from '@/server/auth/guards'
import {createInheritance,cancelInheritance} from './inheritance-service'
const create=z.object({holdingId:z.uuid(),beneficiaryName:z.string().trim().min(2).max(200),beneficiaryEmail:z.string().email().optional().or(z.literal('')),beneficiaryPhone:z.string().trim().max(40).optional(),units:z.number().int().positive().optional(),notes:z.string().trim().max(5000).optional()})
const id=z.object({requestId:z.uuid()})
export const createInheritanceAction=defineAction({access:'investor',input:create,audit:{action:'ownership_inheritance.create',entityType:'ownership_inheritance',summary:'Investor mengajukan pewaris.'},handler:async({supabase,input,audit})=>{const requestId=await createInheritance(supabase,input);audit({entityId:requestId,summary:'Pengajuan pewaris berhasil dibuat.'});revalidatePath('/investor/ownership/inheritance');revalidatePath('/admin/ownership/inheritance');return {requestId}}})
export const cancelInheritanceAction=defineAction({access:'investor',input:id,audit:{action:'ownership_inheritance.cancel',entityType:'ownership_inheritance',summary:'Investor membatalkan pengajuan pewaris.'},handler:async({supabase,input,audit})=>{await cancelInheritance(supabase,input.requestId);audit({entityId:input.requestId,summary:'Pengajuan pewaris dibatalkan.'});revalidatePath('/investor/ownership/inheritance');return {requestId:input.requestId}}})
