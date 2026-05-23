import { useState, useEffect } from 'react';
import { defaultContent } from './content';

const API_BASE = 'https://api.taplab.in';

export default function PizzaPalaceApp({ slug }: { slug: string }) {
  const [content, setContent] = useState<Record<string, string>>(defaultContent);

  useEffect(() => {
    fetch(`${API_BASE}/page/${slug}/content`)
      .then((r) => r.json())
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => {});
  }, [slug]);

  // Build menu items dynamically from content keys
  const menuItems: { name: string; desc: string; price: string; emoji: string }[] = [];
  let i = 1;
  while (content[`item_${i}_name`]) {
    menuItems.push({
      name: content[`item_${i}_name`],
      desc: content[`item_${i}_desc`] ?? '',
      price: content[`item_${i}_price`] ?? '',
      emoji: content[`item_${i}_emoji`] ?? '',
    });
    i++;
  }

  return (
    <main className="min-h-screen bg-red-50 flex flex-col">
      <header className="bg-red-600 text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold">{content.heading}</h1>
          <p className="text-red-100 mt-2">{content.subheading}</p>
        </div>
      </header>

      <section className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Menu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {menuItems.map((item) => (
              <div
                key={item.name}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
                  </div>
                  <span className="text-2xl ml-3">{item.emoji}</span>
                </div>
                <p className="mt-4 font-bold text-red-600 text-xl">₹{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gray-800 text-white p-6 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-300">📍 {content.address}</p>
          <p className="text-gray-300 mt-1">📞 {content.phone}</p>
          <p className="text-gray-400 text-sm mt-4">{content.hours}</p>
        </div>
      </footer>
    </main>
  );
}
