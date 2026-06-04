// src/components/HealthMetrics.tsx
// Fixes: #15 (broken 2-digit inputs), #16 (default 0 inputs)
import React, { useState, useEffect } from 'react';
import {
  Plus, Save, Calendar, Heart, Scale,
  Activity, Moon, Zap, AlertCircle, Edit, Trash2, X,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { HealthMetric } from '../types';
import { formatDate, calculateBMI, getBMICategory } from '../utils/calculations';
import NumericInput from './NumericInput';

const HealthMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing]   = useState<HealthMetric | null>(null);

  useEffect(() => { setMetrics(storage.getHealthMetrics()); }, []);

  const saveMetric = async (metric: HealthMetric) => {
    const updated = editing
      ? await storage.updateHealthMetric(metric) as HealthMetric[]
      : await storage.addHealthMetric(metric) as HealthMetric[];
    setMetrics(updated);
    setIsAdding(false);
    setEditing(null);
  };

  const deleteMetric = async (id: string) => {
    setMetrics(await storage.deleteHealthMetric(id) as HealthMetric[]);
  };

  const latest = metrics[0];
  const user   = storage.getUser() as any;

  if (isAdding || editing) {
    return (
      <MetricForm
        metric={editing}
        onSave={saveMetric}
        onCancel={() => { setIsAdding(false); setEditing(null); }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Metrics</h1>
          <p className="text-gray-600 mt-2">Track your vital health indicators over time</p>
        </div>
        <button onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors duration-200">
          <Plus className="w-5 h-5" /><span>Record Metrics</span>
        </button>
      </div>

      {/* Latest overview */}
      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {latest.weight && (
            <MetricCard icon={Scale} title="Weight" value={`${latest.weight} kg`}
              subtitle={user ? `BMI: ${calculateBMI(latest.weight, user.height).toFixed(1)}` : ''}
              color="bg-blue-500" date={latest.date} />
          )}
          {latest.bloodPressure && (
            <MetricCard icon={Heart} title="Blood Pressure"
              value={`${latest.bloodPressure.systolic}/${latest.bloodPressure.diastolic}`}
              subtitle="mmHg" color="bg-red-500" date={latest.date} />
          )}
          {latest.restingHeartRate && (
            <MetricCard icon={Activity} title="Resting HR"
              value={`${latest.restingHeartRate} bpm`} subtitle="beats per minute"
              color="bg-pink-500" date={latest.date} />
          )}
          {latest.sleepHours && (
            <MetricCard icon={Moon} title="Sleep"
              value={`${latest.sleepHours} hrs`} subtitle="last night"
              color="bg-indigo-500" date={latest.date} />
          )}
        </div>
      )}

      {/* Insights + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Insights</h3>
          <div className="space-y-4">
            {latest?.weight && user && (
              <InsightCard icon={Scale} title="BMI Status"
                value={getBMICategory(calculateBMI(latest.weight, user.height))}
                description={`Your BMI is ${calculateBMI(latest.weight, user.height).toFixed(1)}`}
                type={getBMICategory(calculateBMI(latest.weight, user.height)) === 'Normal weight' ? 'success' : 'warning'} />
            )}
            {latest?.bloodPressure && (
              <InsightCard icon={Heart} title="Blood Pressure"
                value={getBPCategory(latest.bloodPressure.systolic, latest.bloodPressure.diastolic)}
                description={`${latest.bloodPressure.systolic}/${latest.bloodPressure.diastolic} mmHg`}
                type={getBPCategory(latest.bloodPressure.systolic, latest.bloodPressure.diastolic) === 'Normal' ? 'success' : 'warning'} />
            )}
            {latest?.sleepHours && (
              <InsightCard icon={Moon} title="Sleep Quality"
                value={getSleepQuality(latest.sleepHours)}
                description={`${latest.sleepHours} hours of sleep`}
                type={latest.sleepHours >= 7 && latest.sleepHours <= 9 ? 'success' : 'warning'} />
            )}
            {!latest && <p className="text-gray-500 text-sm">Record your first metrics to see insights here.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Tips</h3>
          <div className="space-y-3">
            <TipCard color="green"  title="Regular Monitoring"  text="Track your metrics weekly to identify trends and make informed health decisions." />
            <TipCard color="blue"   title="Blood Pressure"      text="Normal BP is less than 120/80 mmHg. Lifestyle changes help if consistently elevated." />
            <TipCard color="purple" title="Sleep Quality"       text="Aim for 7–9 hours of quality sleep each night for optimal health and recovery." />
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Metrics History</h3>
        {metrics.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No health metrics recorded</h3>
            <p className="text-gray-500 mb-6">Start tracking your health metrics to monitor your progress</p>
            <button onClick={() => setIsAdding(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors duration-200">
              Record Your First Metrics
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map(m => (
              <MetricHistoryCard key={m.id} metric={m} onEdit={setEditing} onDelete={deleteMetric} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MetricForm ───────────────────────────────────────────────────────────────
// Fix #15 + #16: use NumericInput for every number field — no broken 2-digit inputs
const MetricForm: React.FC<{
  metric?: HealthMetric | null;
  onSave: (m: HealthMetric) => void;
  onCancel: () => void;
}> = ({ metric, onSave, onCancel }) => {
  const [date,            setDate]            = useState(metric?.date                          || formatDate(new Date()));
  const [weight,          setWeight]          = useState(metric?.weight                        ?? 0);
  const [bodyFat,         setBodyFat]         = useState(metric?.bodyFat                       ?? 0);
  const [muscleMass,      setMuscleMass]      = useState(metric?.muscleMass                    ?? 0);
  const [systolic,        setSystolic]        = useState(metric?.bloodPressure?.systolic       ?? 0);
  const [diastolic,       setDiastolic]       = useState(metric?.bloodPressure?.diastolic      ?? 0);
  const [heartRate,       setHeartRate]       = useState(metric?.restingHeartRate              ?? 0);
  const [sleepHours,      setSleepHours]      = useState(metric?.sleepHours                   ?? 0);
  const [stressLevel,     setStressLevel]     = useState(metric?.stressLevel                  ?? 0);
  const [energy,          setEnergy]          = useState(metric?.energy                        ?? 0);
  const [notes,           setNotes]           = useState(metric?.notes                        || '');

  const cls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: HealthMetric = {
      id:   metric?.id || Date.now().toString(),
      date,
      ...(weight      > 0 && { weight }),
      ...(bodyFat     > 0 && { bodyFat }),
      ...(muscleMass  > 0 && { muscleMass }),
      ...(systolic    > 0 && diastolic > 0 && { bloodPressure: { systolic, diastolic } }),
      ...(heartRate   > 0 && { restingHeartRate: heartRate }),
      ...(sleepHours  > 0 && { sleepHours }),
      ...(stressLevel > 0 && { stressLevel }),
      ...(energy      > 0 && { energy }),
      ...(notes.trim()    && { notes }),
    };
    onSave(data);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{metric ? 'Edit Health Metrics' : 'Record Health Metrics'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input type="date" required value={date} max={formatDate(new Date())}
              onChange={e => setDate(e.target.value)} className={cls} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Weight (kg)">
              <NumericInput value={weight} min={0} max={500} step={0.1} placeholder="e.g. 72.5" onChange={setWeight} className={cls} />
            </Field>
            <Field label="Body Fat (%)">
              <NumericInput value={bodyFat} min={0} max={100} step={0.1} placeholder="e.g. 18" onChange={setBodyFat} className={cls} />
            </Field>
            <Field label="Muscle Mass (kg)">
              <NumericInput value={muscleMass} min={0} max={200} step={0.1} placeholder="e.g. 55" onChange={setMuscleMass} className={cls} />
            </Field>
            <Field label="Systolic BP (mmHg)">
              <NumericInput value={systolic} min={0} max={300} placeholder="e.g. 120" onChange={setSystolic} className={cls} />
            </Field>
            <Field label="Diastolic BP (mmHg)">
              <NumericInput value={diastolic} min={0} max={200} placeholder="e.g. 80" onChange={setDiastolic} className={cls} />
            </Field>
            <Field label="Resting Heart Rate (bpm)">
              <NumericInput value={heartRate} min={0} max={250} placeholder="e.g. 65" onChange={setHeartRate} className={cls} />
            </Field>
            <Field label="Sleep Hours">
              <NumericInput value={sleepHours} min={0} max={24} step={0.5} placeholder="e.g. 7.5" onChange={setSleepHours} className={cls} />
            </Field>
            <Field label="Stress Level (1–10)">
              <NumericInput value={stressLevel} min={1} max={10} placeholder="e.g. 4" onChange={setStressLevel} className={cls} />
            </Field>
            <Field label="Energy Level (1–10)">
              <NumericInput value={energy} min={1} max={10} placeholder="e.g. 7" onChange={setEnergy} className={cls} />
            </Field>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={cls}
              placeholder="Any additional notes about your health today…" />
          </div>

          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2">
              <Save className="w-4 h-4" /><span>Save Metrics</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Small helpers ────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {children}
  </div>
);

const MetricCard: React.FC<{ icon: React.ComponentType<any>; title: string; value: string; subtitle?: string; color: string; date: string }> =
  ({ icon: Icon, title, value, subtitle, color, date }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${color}`}><Icon className="w-6 h-6 text-white" /></div>
    </div>
    <p className="text-xs text-gray-400">Updated: {new Date(date).toLocaleDateString()}</p>
  </div>
);

const InsightCard: React.FC<{ icon: React.ComponentType<any>; title: string; value: string; description: string; type: 'success' | 'warning' }> =
  ({ icon: Icon, title, value, description, type }) => (
  <div className={`p-4 rounded-lg border ${type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
    <div className="flex items-start space-x-3">
      <Icon className="w-5 h-5 mt-0.5" />
      <div><h4 className="font-medium mb-1">{title}</h4><p className="font-semibold">{value}</p><p className="text-sm opacity-75 mt-1">{description}</p></div>
    </div>
  </div>
);

const TipCard: React.FC<{ color: string; title: string; text: string }> = ({ color, title, text }) => (
  <div className={`p-4 bg-${color}-50 rounded-lg`}>
    <h4 className={`font-medium text-${color}-800 mb-1`}>{title}</h4>
    <p className={`text-sm text-${color}-700`}>{text}</p>
  </div>
);

const MetricHistoryCard: React.FC<{ metric: HealthMetric; onEdit: (m: HealthMetric) => void; onDelete: (id: string) => void }> =
  ({ metric, onEdit, onDelete }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-gray-900">{new Date(metric.date).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => onEdit(metric)} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"><Edit className="w-4 h-4" /></button>
        <button onClick={() => onDelete(metric.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {metric.weight           && <MiniStat icon={Scale}     label="Weight"    value={`${metric.weight} kg`} />}
      {metric.bloodPressure    && <MiniStat icon={Heart}     label="BP"        value={`${metric.bloodPressure.systolic}/${metric.bloodPressure.diastolic}`} />}
      {metric.restingHeartRate && <MiniStat icon={Activity}  label="HR"        value={`${metric.restingHeartRate} bpm`} />}
      {metric.sleepHours       && <MiniStat icon={Moon}      label="Sleep"     value={`${metric.sleepHours} hrs`} />}
      {metric.stressLevel      && <MiniStat icon={AlertCircle} label="Stress"  value={`${metric.stressLevel}/10`} />}
      {metric.energy           && <MiniStat icon={Zap}       label="Energy"    value={`${metric.energy}/10`} />}
    </div>
    {metric.notes && <div className="mt-3 p-3 bg-blue-50 rounded-lg"><p className="text-sm text-blue-800">{metric.notes}</p></div>}
  </div>
);

const MiniStat: React.FC<{ icon: React.ComponentType<any>; label: string; value: string }> =
  ({ icon: Icon, label, value }) => (
  <div className="text-center p-2 bg-gray-50 rounded">
    <Icon className="w-4 h-4 text-gray-600 mx-auto mb-1" />
    <p className="text-sm font-medium text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const getBPCategory = (s: number, d: number) =>
  s < 120 && d < 80 ? 'Normal' : s < 130 && d < 80 ? 'Elevated' :
  s < 140 || d < 90 ? 'High Stage 1' : s < 180 || d < 120 ? 'High Stage 2' : 'Hypertensive Crisis';

const getSleepQuality = (h: number) =>
  h < 6 ? 'Insufficient' : h >= 7 && h <= 9 ? 'Optimal' : h > 9 ? 'Excessive' : 'Adequate';

export default HealthMetrics;
