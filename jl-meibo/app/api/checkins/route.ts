import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { member_id, greeted, note, greeted_by } = body;

  if (!member_id) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
  }

  const updateData: Record<string, any> = { member_id };
  if (greeted !== undefined) updateData.greeted = greeted;
  if (note !== undefined) updateData.note = note;
  if (greeted_by !== undefined) updateData.greeted_by = greeted_by;

  const { data, error } = await supabase
    .from('jl_checkins')
    .upsert(updateData, { onConflict: 'member_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
