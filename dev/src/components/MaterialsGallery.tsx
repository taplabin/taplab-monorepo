interface MaterialsGalleryProps {
  materials: string[];
  notes: string | null;
}

export default function MaterialsGallery({ materials, notes }: MaterialsGalleryProps) {
  if (materials.length === 0 && !notes) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 italic">No materials attached yet — admin will add them.</div>
    );
  }

  return (
    <div>
      {notes && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-400">
          <span className="font-medium">Notes: </span>{notes}
        </div>
      )}
      {materials.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {materials.map((url, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block"
              >
                {isImage ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:border-[#2087e6] dark:hover:border-blue-500 transition-colors">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-[#2087e6] dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📎</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-1 truncate w-full text-center">
                      {decodeURIComponent(url.split('/').pop() ?? 'file')}
                    </span>
                  </div>
                )}
                <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100">Open</span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
