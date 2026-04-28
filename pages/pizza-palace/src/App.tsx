export default function PizzaPalaceApp() {
  return (
    <main className="min-h-screen bg-red-50 flex flex-col">
      <header className="bg-red-600 text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold">🍕 Pizza Palace</h1>
          <p className="text-red-100 mt-2">Authentic wood-fired pizzas since 1998</p>
        </div>
      </header>

      <section className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Menu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {menu.map((item) => (
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
          <p className="text-gray-300">📍 123 Main Street, Mumbai</p>
          <p className="text-gray-300 mt-1">📞 +91 98765 43210</p>
          <p className="text-gray-400 text-sm mt-4">Open daily: 11 AM - 11 PM</p>
        </div>
      </footer>
    </main>
  );
}

const menu = [
  {
    name: 'Margherita',
    desc: 'Classic tomato sauce, fresh mozzarella, and basil',
    price: 299,
    emoji: '🧀',
  },
  {
    name: 'BBQ Chicken',
    desc: 'Smoky BBQ sauce, grilled chicken, onions, and cilantro',
    price: 399,
    emoji: '🍗',
  },
  {
    name: 'Pepperoni',
    desc: 'Spicy pepperoni, mozzarella, and tomato sauce',
    price: 349,
    emoji: '🌶️',
  },
  {
    name: 'Veggie Supreme',
    desc: 'Bell peppers, mushrooms, olives, onions, and tomatoes',
    price: 329,
    emoji: '🥗',
  },
  {
    name: 'Hawaiian',
    desc: 'Ham, pineapple, and mozzarella (yes, we dare!)',
    price: 369,
    emoji: '🍍',
  },
  {
    name: 'Paneer Tikka',
    desc: 'Tandoori paneer, onions, capsicum, and mint chutney',
    price: 379,
    emoji: '🧈',
  },
];
