import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function PizzaPalaceApp() {
    return (_jsxs("main", { className: "min-h-screen bg-red-50 flex flex-col", children: [_jsx("header", { className: "bg-red-600 text-white p-6 md:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h1", { className: "text-4xl md:text-5xl font-bold", children: "\uD83C\uDF55 Pizza Palace" }), _jsx("p", { className: "text-red-100 mt-2", children: "Authentic wood-fired pizzas since 1998" })] }) }), _jsx("section", { className: "flex-1 p-6 md:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-6", children: "Our Menu" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6", children: menu.map((item) => (_jsxs("div", { className: "bg-white rounded-xl shadow-md hover:shadow-lg transition p-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900", children: item.name }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: item.desc })] }), _jsx("span", { className: "text-2xl ml-3", children: item.emoji })] }), _jsxs("p", { className: "mt-4 font-bold text-red-600 text-xl", children: ["\u20B9", item.price] })] }, item.name))) })] }) }), _jsx("footer", { className: "bg-gray-800 text-white p-6 mt-8", children: _jsxs("div", { className: "max-w-4xl mx-auto text-center", children: [_jsx("p", { className: "text-gray-300", children: "\uD83D\uDCCD 123 Main Street, Mumbai" }), _jsx("p", { className: "text-gray-300 mt-1", children: "\uD83D\uDCDE +91 98765 43210" }), _jsx("p", { className: "text-gray-400 text-sm mt-4", children: "Open daily: 11 AM - 11 PM" })] }) })] }));
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
