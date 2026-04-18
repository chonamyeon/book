const GRADIENT_MAP = {
  'from-blue-600 to-cyan-900':     'linear-gradient(135deg, #2563eb, #164e63)',
  'from-blue-700 to-cyan-950':     'linear-gradient(135deg, #1d4ed8, #083344)',
  'from-blue-400 to-indigo-500':   'linear-gradient(135deg, #60a5fa, #6366f1)',
  'from-amber-400 to-orange-500':  'linear-gradient(135deg, #fbbf24, #f97316)',
  'from-amber-500 to-yellow-900':  'linear-gradient(135deg, #f59e0b, #451a03)',
  'from-amber-600 to-orange-900':  'linear-gradient(135deg, #d97706, #431407)',
  'from-violet-600 to-purple-900': 'linear-gradient(135deg, #7c3aed, #4a1d96)',
  'from-purple-600 to-indigo-900': 'linear-gradient(135deg, #9333ea, #1e1b4b)',
  'from-rose-600 to-red-900':      'linear-gradient(135deg, #e11d48, #7f1d1d)',
  'from-pink-600 to-rose-900':     'linear-gradient(135deg, #db2777, #881337)',
  'from-emerald-600 to-teal-900':  'linear-gradient(135deg, #059669, #134e4a)',
  'from-teal-600 to-cyan-900':     'linear-gradient(135deg, #0d9488, #164e63)',
  'from-green-600 to-emerald-900': 'linear-gradient(135deg, #16a34a, #064e3b)',
  'from-orange-500 to-red-900':    'linear-gradient(135deg, #f97316, #7f1d1d)',
  'from-cyan-600 to-blue-900':     'linear-gradient(135deg, #0891b2, #1e3a5f)',
  'from-indigo-600 to-purple-900': 'linear-gradient(135deg, #4f46e5, #4a1d96)',
  'from-slate-600 to-slate-900':   'linear-gradient(135deg, #475569, #0f172a)',
  'from-gray-700 to-black':        'linear-gradient(135deg, #374151, #000000)',
};

const DEFAULT = 'linear-gradient(135deg, #1e293b, #0f172a)';

export function getGradientStyle(gradientClass) {
  if (!gradientClass) return DEFAULT;
  return GRADIENT_MAP[gradientClass] || DEFAULT;
}
