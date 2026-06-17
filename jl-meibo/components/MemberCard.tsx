'use client';

import { useState } from 'react';
import type { MemberWithCheckin } from '@/lib/supabase';

type Props = {
  member: MemberWithCheckin;
  onToggleGreet: (memberId: string, current: boolean) => void;
  onNoteChange: (memberId: string, note: string) => void;
};

function priority(m: MemberWithCheckin): 'high' | 'mid' | 'low' {
  if (m.tokui) return 'high';
  if (m.meishi === '済') return 'mid';
  if (m.biko) return 'mid';
  return 'low';
}

const priorityDot: Record<string, string> = {
  high: 'bg-amber-500',
  mid: 'bg-emerald-500',
  low: 'bg-neutral-300',
};

export default function MemberCard({ member, onToggleGreet, onNoteChange }: Props) {
  const [open, setOpen] = useState(false);
  const greeted = member.checkin?.greeted || false;
  const note = member.checkin?.note || '';
  const prio = priority(member);

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-colors ${
        greeted ? 'border-emerald-300 opacity-60' : 'border-neutral-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot[prio]}`} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-[15px]">{member.name}</span>
            {!member.shikiten && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">式典×</span>
            )}
            {member.konzin_table === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">懇親会×</span>
            )}
          </span>
          <span className="block text-xs text-neutral-500 truncate">
            {member.area}
            {member.company ? ` ・ ${member.company}` : ''}
          </span>
          {member.role && <span className="block text-xs text-blue-600 mt-0.5">{member.role}</span>}
          <span className="flex gap-1 flex-wrap mt-1.5">
            {member.tokui && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                ⭐ 得意先
              </span>
            )}
            {member.meishi === '済' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                名刺済
              </span>
            )}
            {member.biko && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                備考
              </span>
            )}
            {member.konzin_table > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono">
                卓{member.konzin_table}
              </span>
            )}
          </span>
          {greeted && (
            <span className="block text-xs text-emerald-600 mt-1">✓ 挨拶済</span>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGreet(member.id, greeted);
          }}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 text-sm transition-colors ${
            greeted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-neutral-300 text-neutral-400 active:scale-90'
          }`}
          aria-label="挨拶済みトグル"
        >
          {greeted ? '✓' : '○'}
        </button>
      </button>

      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50 p-3 space-y-2">
          {member.biko && (
            <div className="text-xs text-neutral-600 bg-blue-50 border-l-2 border-blue-400 rounded px-2 py-1.5 leading-relaxed">
              {member.biko}
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            <span>
              地域: <span className="text-neutral-800 font-medium">{member.area}</span>
            </span>
            <span>
              懇親会: <span className="text-neutral-800 font-medium">{member.konzin_table ? `${member.konzin_table}卓` : '×'}</span>
            </span>
            <span>
              名刺: <span className="text-neutral-800 font-medium">{member.meishi}</span>
            </span>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 mb-1 font-mono">メモ（自動保存）</div>
            <textarea
              defaultValue={note}
              onChange={(e) => onNoteChange(member.id, e.target.value)}
              rows={2}
              placeholder="メモを追加..."
              className="w-full text-sm border border-neutral-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}
