import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { defaultContent } from './content';
const API_BASE = 'https://api.taplab.in';
export default function PizzaPalaceApp({ slug }) {
    const [content, setContent] = useState(defaultContent);
    useEffect(() => {
        fetch(`${API_BASE}/page/${slug}/content`)
            .then((r) => r.json())
            .then((data) => setContent({ ...defaultContent, ...data }))
            .catch(() => { });
    }, [slug]);
    // Build menu items dynamically from content keys
    const menuItems = [];
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
    return (_jsxs("main", { className: "min-h-screen bg-red-50 flex flex-col", children: [_jsx("header", { className: "bg-red-600 text-white p-6 md:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h1", { className: "text-4xl md:text-5xl font-bold", children: content.heading }), _jsx("p", { className: "text-red-100 mt-2", children: content.subheading })] }) }), _jsx("section", { className: "flex-1 p-6 md:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-6", children: "Our Menu" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6", children: menuItems.map((item) => (_jsxs("div", { className: "bg-white rounded-xl shadow-md hover:shadow-lg transition p-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-lg text-gray-900", children: item.name }), _jsx("p", { className: "text-gray-600 text-sm mt-1", children: item.desc })] }), _jsx("span", { className: "text-2xl ml-3", children: item.emoji })] }), _jsxs("p", { className: "mt-4 font-bold text-red-600 text-xl", children: ["\u20B9", item.price] })] }, item.name))) })] }) }), _jsx("footer", { className: "bg-gray-800 text-white p-6 mt-8", children: _jsxs("div", { className: "max-w-4xl mx-auto text-center", children: [_jsxs("p", { className: "text-gray-300", children: ["\uD83D\uDCCD ", content.address] }), _jsxs("p", { className: "text-gray-300 mt-1", children: ["\uD83D\uDCDE ", content.phone] }), _jsx("p", { className: "text-gray-400 text-sm mt-4", children: content.hours })] }) })] }));
}
