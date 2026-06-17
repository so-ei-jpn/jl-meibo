import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 指定大会の名簿を、チェックイン状況とJOINして返す
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
  }

  const { data: members, error: mErr } = await supabase
    .from('jl_members')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const memberIds = (members || []).map((m) => m.id);
  let checkins: any[] = [];
  if (memberIds.length > 0) {
    const { data: c, error: cErr } = await supabase
      .from('jl_checkins')
      .select('*')
      .in('member_id', memberIds);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    checkins = c || [];
  }

  const checkinMap = new Map(checkins.map((c) => [c.member_id, c]));
  const merged = (members || []).map((m) => ({
    ...m,
    checkin: checkinMap.get(m.id) || { greeted: false, note: '' },
  }));

  return NextResponse.json(merged);
}

// CSVから一括登録（既存メンバーは全削除してから再登録）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event_id, members } = body;

  if (!event_id || !Array.isArray(members)) {
    return NextResponse.json({ error: 'event_id と members(配列) が必要です' }, { status: 400 });
  }

  // 既存名簿を削除（チェックインもcascadeで消える）
  const { error: delErr } = await supabase.from('jl_members').delete().eq('event_id', event_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const rows = members.map((m: any) => ({
    event_id,
    area: m.area || '',
    company: m.company || '',
    role: m.role || '',
    name: m.name,
    shikiten: m.shikiten !== false,
    konzin_table: Number(m.konzin_table) || 0,
    biko: m.biko || '',
    meishi: m.meishi === '済' ? '済' : '未',
    tokui: !!m.tokui,
  }));

  const { data, error } = await supabase.from('jl_members').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length });
}
