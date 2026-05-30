// src/components/Progress.tsx
import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

type Tab = 'weekly' | 'monthly';

const Progress: React.FC = () => {
  const [tab, setTab] = useState<Tab>('weekly');
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({ workouts: 0, avgCalories: 0, activeDays: 0, avgSteps: 0 });

  useEffect(() => {
    const workouts  = storage.getWorkouts() as any[];
    const nutrition = storage.getNutrition() as any[];

    const now  = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // ── Weekly (last 7 days) ────────────────────────────────────────────────
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = days[d.getDay()];
      const dayWorkouts = workouts.filter(w => w.date === dateStr || w.date?.startsWith(dateStr));
      const dayNutrition = nutrition.find(n => n.date === dateStr);
      return {
        day: dayLabel,
        workouts: dayWorkouts.length,
        calories: dayNutrition?.totalCalories || 0,
      };
    });
    setWeeklyData(weekly);

    // ── Monthly (last 4 weeks) ──────────────────────────────────────────────
    const monthly = Array.from({ length: 4 }, (_, i) => {
      const weekEnd   = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      const weekWorkouts = workouts.filter(w => {
        const wd = new Date(w.date);
        return wd >= weekStart && wd <= weekEnd;
      });
      const weekNutrition = nutrition.filter(n => {
        const nd = new Date(n.date);
        return nd >= weekStart && nd <= weekEnd;
      });
      const avgCal = weekNutrition.length
        ? Math.round(weekNutrition.reduce((s: number, n: any) => s + n.totalCalories, 0) / weekNutrition.length)
        : 0;
      return { week: `Wk ${4 - i}`, workouts: weekWorkouts.length, avgCalories: avgCal };
    }).reverse();
    setMonthlyData(monthly);

    // ── Summary stats ──────────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const recentWorkouts  = workouts.filter(w => new Date(w.date) >= thirtyDaysAgo);
    const recentNutrition = nutrition.filter(n => new Date(n.date) >= thirtyDaysAgo);
    const avgCals = recentNutrition.length
      ? Math.round(recentNutrition.reduce((s, n) => s + n.totalCalories, 0) / recentNutrition.length)
      : 0;
    const activeDays = new Set(recentWorkouts.map(w => w.date?.split('T')[0] || w.date)).size;
    setStats({ workouts: recentWorkouts.length, avgCalories: avgCals, activeDays, avgSteps: 0 });
  }, []);

  const maxWeeklyCalories = Math.max(...weeklyData.map(d => d.calories), 1);
  const maxWeeklyWorkouts = Math.max(...weeklyData.map(d => d.workouts), 1);
  const maxMonthlyWorkouts = Math.max(...monthlyData.map(d => d.workouts), 1);

  const summaryStats = [
    { label: 'Total Workouts',    value: stats.workouts.toString(),                 sub: 'last 30 days', color: '#10b981', icon: '🏋️' },
    { label: 'Avg Daily Calories',value: stats.avgCalories ? stats.avgCalories.toLocaleString() : '—', sub: 'kcal / day', color: '#06b6d4', icon: '🔥' },
    { label: 'Active Days',       value: stats.activeDays.toString(),               sub: 'last 30 days', color: '#8b5cf6', icon: '📅' },
    { label: 'Log your data',     value: '↑',                                       sub: 'to see trends', color: '#f59e0b', icon: '📊' },
  ];

  return (
    <div style={{ color: '#e5e7eb', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#ecfdf5', margin: 0, letterSpacing: '-0.4px' }}>Progress</h2>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 4 }}>Your fitness journey at a glance</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {summaryStats.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.sub}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.4 }} />
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['weekly', 'monthly'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: 8, border: '1px solid',
            borderColor: tab === t ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)',
            background: tab === t ? 'rgba(16,185,129,0.12)' : 'transparent',
            color: tab === t ? '#34d399' : '#6b7280',
            cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Charts panel */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
        {tab === 'weekly' ? (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ecfdf5', marginBottom: 24 }}>This Week</h3>
            {/* Calories bar chart */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Daily Calories</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                {weeklyData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
                    <div style={{ width: '100%', height: `${(d.calories / maxWeeklyCalories) * 100}%`, background: 'linear-gradient(to top, #10b981, #34d399)', borderRadius: '4px 4px 0 0', opacity: 0.8, minHeight: d.calories > 0 ? 4 : 0, transition: 'height 0.3s ease' }} />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {weeklyData.map((d, i) => (
                  <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#4b5563' }}>
                    {d.calories > 0 ? `${(d.calories / 1000).toFixed(1)}k` : '—'}
                  </span>
                ))}
              </div>
            </div>
            {/* Workout dots */}
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workouts Completed</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {weeklyData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {Array.from({ length: Math.max(maxWeeklyWorkouts, 1) }).map((_, j) => (
                        <div key={j} style={{ width: 12, height: 12, borderRadius: '50%', background: j < d.workouts ? '#10b981' : 'rgba(255,255,255,0.07)', border: '1px solid', borderColor: j < d.workouts ? '#10b981' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ecfdf5', marginBottom: 24 }}>Last 4 Weeks</h3>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workouts per Week</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
                {monthlyData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{d.workouts}</span>
                    <div style={{ width: '100%', height: `${(d.workouts / maxMonthlyWorkouts) * 80}%`, background: 'linear-gradient(to top, #059669, #10b981)', borderRadius: '4px 4px 0 0', minHeight: d.workouts > 0 ? 4 : 0, transition: 'height 0.3s ease' }} />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{d.week}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Avg Daily Calories</div>
              {monthlyData.map((d, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{d.week}</span>
                    <span style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600 }}>
                      {d.avgCalories ? `${d.avgCalories.toLocaleString()} kcal` : '—'}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: d.avgCalories ? `${(d.avgCalories / 2400) * 100}%` : '0%', background: 'linear-gradient(to right, #0284c7, #06b6d4)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Activity heatmap — real data */}
      <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ecfdf5', marginBottom: 16 }}>Activity Heatmap (last 84 days)</h3>
        <HeatMap />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: '#4b5563' }}>Less</span>
          {['rgba(255,255,255,0.05)', 'rgba(16,185,129,0.25)', 'rgba(16,185,129,0.55)', 'rgba(16,185,129,0.9)'].map((bg, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: bg }} />
          ))}
          <span style={{ fontSize: 11, color: '#4b5563' }}>More</span>
        </div>
      </div>
    </div>
  );
};

const HeatMap: React.FC = () => {
  const workouts  = storage.getWorkouts() as any[];
  const nutrition = storage.getNutrition() as any[];

  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: 84 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (83 - i));
        const dateStr = d.toISOString().split('T')[0];
        const hasWorkout   = workouts.some(w => (w.date || '').startsWith(dateStr));
        const hasNutrition = nutrition.some(n => (n.date || '').startsWith(dateStr));
        const intensity = hasWorkout && hasNutrition ? 3 : hasWorkout || hasNutrition ? 2 : 0;
        const bg = intensity === 3 ? 'rgba(16,185,129,0.9)' : intensity === 2 ? 'rgba(16,185,129,0.55)' : 'rgba(255,255,255,0.05)';
        return (
          <div key={i} title={dateStr} style={{ width: 14, height: 14, borderRadius: 2, background: bg, transition: 'transform 0.1s', cursor: 'default' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.3)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }} />
        );
      })}
    </div>
  );
};

export default Progress;
