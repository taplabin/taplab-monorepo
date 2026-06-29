interface MaterialsGalleryProps {
  materials: string[];
  notes: string | null;
}

export default function MaterialsGallery({ materials, notes }: MaterialsGalleryProps) {
  if (materials.length === 0 && !notes) {
    return (
      <div className="text-sm text-gray-400 italic">No materials attached yet — admin will add them.</div>
    );
  }

  return (
    <div>
      {notes && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
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
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:border-violet-400 transition-colors">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 hover:border-violet-400 transition-colors flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📎</span>
                    <span className="text-xs text-gray-500 text-center px-1 truncate w-full text-center">
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
