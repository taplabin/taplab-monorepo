import { transform } from 'sucrase';

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function extractDefaultContent(contentTs: string): Record<string, string> | null {
  try {
    const { code } = transform(contentTs, { transforms: ['typescript', 'imports'] });
    const exports: Record<string, unknown> = {};
    const mod = { exports };
    // eslint-disable-next-line no-new-func
    new Function('exports', 'module', 'require', code)(exports, mod, () => ({}));
    const result = exports.defaultContent ?? mod.exports.defaultContent;
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return result as Record<string, string>;
    }
    return null;
  } catch {
    return null;
  }
}

export function validate(appTsx: string, contentTs: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!appTsx.trim()) {
    errors.push('App.tsx is empty');
    return { passed: false, errors, warnings };
  }
  if (!contentTs.trim()) {
    errors.push('content.ts is empty');
    return { passed: false, errors, warnings };
  }

  // 1. Default export signature
  if (!/export\s+default\s+function\s+App\s*\(\s*\{\s*slug/.test(appTsx)) {
    errors.push('App.tsx must export: export default function App({ slug }: { slug: string })');
  }

  // 2. No "use client"
  if (appTsx.includes('"use client"') || appTsx.includes("'use client'")) {
    errors.push('Remove "use client" — this is not Next.js');
  }

  // 3. No Next.js imports
  if (/from\s+['"]next\//.test(appTsx)) {
    errors.push('No Next.js imports allowed (found `from "next/..."`)');
  }

  // 4. useState(null)
  if (/useState\s*<[^>]*>\s*\(\s*defaultContent\s*\)/.test(appTsx) ||
      /useState\s*\(\s*defaultContent\s*\)/.test(appTsx)) {
    errors.push('useState must initialize to null, not defaultContent');
  }

  // 5. Null guard
  if (!/if\s*\(\s*!content\s*\)\s*return\s+null/.test(appTsx)) {
    warnings.push('Missing null guard: if (!content) return null');
  }

  // 6. No <style> tag
  if (/<style[\s>]/.test(appTsx)) {
    errors.push('No <style> tags in App.tsx — use Tailwind classes instead');
  }

  // 7. Content key coverage
  const defaultContent = extractDefaultContent(contentTs);
  if (!defaultContent) {
    errors.push('Could not parse defaultContent from content.ts — check the export syntax');
  } else {
    const contentKeySet = new Set(Object.keys(defaultContent));
    const appRefs = [...appTsx.matchAll(/\bcontent\.([a-z_][a-z0-9_]*)/g)].map((m) => m[1]);
    const missingKeys = [...new Set(appRefs)].filter((k) => !contentKeySet.has(k));
    if (missingKeys.length > 0) {
      errors.push(`App.tsx references keys not in defaultContent: ${missingKeys.join(', ')}`);
    }

    // 8. _data key valid JSON
    for (const key of ['menu_data', 'portfolio_data', 'brochure_data']) {
      if (key in defaultContent) {
        try {
          const parsed = JSON.parse(defaultContent[key]);
          if (!Array.isArray(parsed) && typeof parsed !== 'object') {
            errors.push(`${key} must be a JSON array or object`);
          }
        } catch {
          errors.push(`${key} is not valid JSON`);
        }
      }
    }

    // 9. Image/video URL format
    for (const [key, value] of Object.entries(defaultContent)) {
      if ((key.endsWith('_image') || key.endsWith('_video')) && value) {
        if (!value.startsWith('https://media.taplab.in/')) {
          errors.push(`${key} must start with https://media.taplab.in/ (got: ${value.slice(0, 40)})`);
        }
      }
    }
  }

  return { passed: errors.length === 0, errors, warnings };
}

interface ValidationPanelProps {
  result: ValidationResult | null;
}

export default function ValidationPanel({ result }: ValidationPanelProps) {
  if (!result) return null;

  if (result.passed) {
    return (
      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-400 font-medium">
        ✓ All checks passed
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
      {result.errors.map((e, i) => (
        <p key={i} className="text-sm text-red-700 dark:text-red-400">✗ {e}</p>
      ))}
      {result.warnings.map((w, i) => (
        <p key={i} className="text-sm text-amber-700 dark:text-amber-400">⚠ {w}</p>
      ))}
    </div>
  );
}
