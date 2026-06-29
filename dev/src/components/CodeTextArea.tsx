interface CodeTextAreaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function CodeTextArea({ label, value, onChange, placeholder }: CodeTextAreaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-64 px-3 py-3 font-mono text-xs text-gray-900 bg-gray-50 border border-gray-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow"
      />
    </div>
  );
}
