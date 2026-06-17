import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('jl_events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, event_date, place } = body;

  if (!name) {
    return NextResponse.json({ error: '大会名は必須です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('jl_events')
    .insert({ name, event_date: event_date || null, place: place || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
