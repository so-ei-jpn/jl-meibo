'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, type JLEvent, type MemberWithCheckin } from '@/lib/supabase';
import { parseCSV } from '@/lib/csv';
import MemberCard from '@/components/MemberCard';

type Tab = 'events' | 'meibo' | 'log' | 'upload';

export default function Home() {
  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<JLEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberWithCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvName, setNewEvName] = useState('');
  const [newEvDate, setNewEvDate] = useState('');
  const [newEvPlace, setNewEvPlace] = useState('');

  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [allCheckinCounts, setAllCheckinCounts] = useState<Record<string, { total: number; done: number; noted: number }>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data);
    if (!currentEventId && data.length > 0) {
      setCurrentEventId(data[0].id);
    }
    return data as JLEvent[];
  }

  async function loadMembers(eventId: string) {
    setLoading(true);
    const res = await fetch(`/api/members?event_id=${eventId}`);
    const data = await res.json();
    setMembers(data);
    setLoading(false);
  }

  async function loadAllStats(evs: JLEvent[]) {
    const stats: Record<string, { total: number; done: number; noted: number }> = {};
    for (const ev of evs) {
      const res = await fetch(`/api/members?event_id=${ev.id}`);
      const data: MemberWithCheckin[] = await res.json();
      stats[ev.id] = {
        total: data.length,
        done: data.filter((m) => m.checkin?.greeted).length,
        noted: data.filter((m) => m.checkin?.note && m.checkin.note.trim()).length,
      };
    }
    setAllCheckinCounts(stats);
  }

  useEffect(() => {
    loadEvents().then((evs) => {
      if (evs.length > 0) loadAllStats(evs);
    });
  }, []);

  useEffect(() => {
    if (currentEventId) loadMembers(currentEventId);
  }, [currentEventId]);

  useEffect(() => {
    const channel = supabase
      .channel('jl_checkins_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jl_checkins' }, () => {
        if (currentEventId) loadMembers(currentEventId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentEventId]);

  async function handleToggleGreet(memberId: string, current: boolean) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, checkin: { ...(m.checkin as any), greeted: !current } } : m
      )
    );
    await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, greeted: !current }),
    });
    showToast(!current ? '✓ 挨拶済にしました' : '↩ 未挨拶に戻しました');
  }

  function handleNoteChange(memberId: string, note: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, checkin: { ...(m.checkin as any), note } } : m))
    );
    clearTimeout(noteTimers.current[memberId]);
    noteTimers.current[memberId] = setTimeout(async () => {
      await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, note }),
      });
    }, 700);
  }

  async function handleAddEvent() {
    if (!newEvName.trim()) {
      showToast('大会名を入力してください');
      return;
    }
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEvName, event_date: newEvDate || null, place: newEvPlace }),
    });
    const created = await res.json();
    setShowAddEvent(false);
    setNewEvName('');
    setNewEvDate('');
    setNewEvPlace('');
    const evs = await loadEvents();
    setCurrentEventId(created.id);
    loadAllStats(evs);
    showToast('大会を追加しました');
  }

  async function handleCSVUpload(file: File) {
    if (!currentEventId) {
      showToast('先に大会を選択してください');
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      showToast('データが見つかりません');
      return;
    }
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: currentEventId, members: parsed }),
    });
    const result = await res.json();
    setCsvPreview(`${result.inserted}名を読み込みました`);
    showToast(`${result.inserted}名を読み込みました`);
    loadMembers(currentEventId);
    loadEvents().then(loadAllStats);
  }

  const currentEvent = events.find((e) => e.id === currentEventId);

  const tables = useMemo(() => {
    const set = new Set(members.filter((m) => m.konzin_table > 0).map((m) => m.konzin_table));
    return Array.from(set).sort((a, b) => a - b);
  }, [members]);

  const filtered = useMemo(() => {
    let list = members.map((m) => ({ ...m }));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.company || '').toLowerCase().includes(q) ||
          (m.area || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
      );
    }
    if (tableFilter !== null) {
      list = list.filter((m) => m.konzin_table === tableFilter);
    } else {
      switch (filter) {
        case 'tokui':
          list = list.filter((m) => m.tokui);
          break;
        case 'meishi':
          list = list.filter((m) => m.meishi === '済');
          break;
        case 'biko':
          list = list.filter((m) => !!m.biko);
          break;
        case 'konzin':
          list = list.filter((m) => m.konzin_table > 0);
          break;
        case 'done':
          list = list.filter((m) => m.checkin?.greeted);
          break;
        case 'undone':
          list = list.filter((m) => !m.checkin?.greeted);
          break;
      }
    }
    const prio = (m: MemberWithCheckin) => (m.tokui ? 0 : m.meishi === '済' || m.biko ? 1 : 2);
    list.sort((a, b) => {
      const ag = a.checkin?.greeted ? 1 : 0;
      const bg = b.checkin?.greeted ? 1 : 0;
      if (ag !== bg) return ag - bg;
      return prio(a) - prio(b);
    });
    return list;
  }, [members, search, filter, tableFilter]);

  const total = members.length;
  const done = members.filter((m) => m.checkin?.greeted).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-md mx-auto min-h-screen pb-16">
      <header className="sticky top-0 bg-white border-b border-neutral-200 z-10">
        <nav className="flex border-b border-neutral-100">
          {[
            { id: 'events', label: '大会' },
            { id: 'meibo', label: '名簿' },
            { id: 'log', label: 'ログ' },
            { id: 'upload', label: '追加' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-4 py-4">
        {tab === 'events' && (
          <div className="space-y-2">
            {events.map((ev) => {
              const stats = allCheckinCounts[ev.id];
              const isActive = ev.id === currentEventId;
              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    setCurrentEventId(ev.id);
                    setTab('meibo');
                  }}
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    isActive ? 'border-blue-400 border-2' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{ev.name}</span>
                    {isActive && <span className="text-xs text-blue-600 font-medium">使用中</span>}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {ev.event_date} {ev.place ? `— ${ev.place}` : ''}
                  </div>
                  {stats && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                        {stats.total}名
                      </span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        挨拶済 {stats.done}名
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 text-neutral-500 text-sm hover:bg-neutral-50"
            >
              + 新しい大会を追加
            </button>
          </div>
        )}

        {tab === 'meibo' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {currentEvent ? currentEvent.name : '大会を選択してください'}
              </span>
              <button onClick={() => setTab('events')} className="text-xs border rounded-md px-2 py-1 text-neutral-600">
                変更
              </button>
            </div>

            <div className="relative mb-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="名前・会社名・地域で検索..."
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 pl-8 focus:outline-none focus:border-blue-400"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">🔍</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-4 px-4 [scrollbar-width:none]">
              {[
                { id: 'all', label: '全員' },
                { id: 'tokui', label: '⭐ 得意先' },
                { id: 'meishi', label: '名刺済' },
                { id: 'biko', label: '備考あり' },
                { id: 'konzin', label: '懇親会参加' },
                { id: 'done', label: '✓ 挨拶済' },
                { id: 'undone', label: '未挨拶' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id);
                    setTableFilter(null);
                  }}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    filter === f.id && tableFilter === null
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {tables.map((t) => (
                <button
                  key={t}
                  onClick={() => setTableFilter(tableFilter === t ? null : t)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap font-mono ${
                    tableFilter === t
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-500'
                  }`}
                >
                  卓{t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-neutral-500 font-mono whitespace-nowrap">
                {done} / {total} ({pct}%)
              </span>
            </div>

            {loading ? (
              <div className="text-center text-sm text-neutral-400 py-10">読み込み中...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-sm text-neutral-400 py-10">該当者なし</div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    onToggleGreet={handleToggleGreet}
                    onNoteChange={handleNoteChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'log' && (
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center text-sm text-neutral-400 py-10">まだ大会データがありません</div>
            ) : (
              events.map((ev) => {
                const stats = allCheckinCounts[ev.id] || { total: 0, done: 0, noted: 0 };
                const p = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
                return (
                  <div key={ev.id} className="rounded-xl border border-neutral-200 p-3.5">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{ev.name}</span>
                      <span className="text-xs text-neutral-500">{ev.event_date}</span>
                    </div>
                    {ev.place && <div className="text-xs text-neutral-500 mb-1.5">📍 {ev.place}</div>}
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600">
                        参加者 {stats.total}名
                      </span>
                      <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600">
                        挨拶済 {stats.done}名
                      </span>
                      <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600">
                        メモ {stats.noted}件
                      </span>
                      <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600">
                        {p}%完了
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'upload' && (
          <div>
            <div className="text-xs text-neutral-500 bg-neutral-100 rounded-lg p-3 mb-3 leading-relaxed">
              <strong className="text-neutral-700">CSVフォーマット（1行目はヘッダー）</strong>
              <br />
              地域, 会社名, 役職, 氏名, 式典, 懇親会, 備考, 名刺交換, 得意先
              <br />
              <br />
              <strong>懇親会:</strong> 卓番号(数字) または ×<br />
              <strong>名刺交換:</strong> 済 または 未<br />
              <strong>得意先:</strong> ○ または 空欄
            </div>
            <label className="block border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center cursor-pointer hover:bg-neutral-50">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCSVUpload(file);
                  e.target.value = '';
                }}
              />
              <div className="text-2xl mb-2">📤</div>
              <div className="text-sm text-neutral-500">CSVファイルを選択</div>
            </label>
            {csvPreview && (
              <div className="mt-3 text-sm bg-neutral-100 rounded-lg p-2.5 text-neutral-600">
                {currentEvent?.name} に {csvPreview}
              </div>
            )}
          </div>
        )}
      </main>

      {showAddEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <div className="font-medium mb-3">大会を追加</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500 block mb-1">大会名</label>
                <input
                  value={newEvName}
                  onChange={(e) => setNewEvName(e.target.value)}
                  placeholder="例: JL九州・沖縄地域本部大会"
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 block mb-1">開催日</label>
                <input
                  type="date"
                  value={newEvDate}
                  onChange={(e) => setNewEvDate(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 block mb-1">場所</label>
                <input
                  value={newEvPlace}
                  onChange={(e) => setNewEvPlace(e.target.value)}
                  placeholder="例: 鹿児島サンロイヤルホテル"
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddEvent(false)}
                className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddEvent}
                className="text-sm px-3 py-1.5 rounded-lg bg-neutral-900 text-white"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-4 py-2 rounded-full z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
