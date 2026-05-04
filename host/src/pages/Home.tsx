import React, { useState, useEffect } from "react";
import type { ReactNode, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Wifi,
  Shield,
  Smartphone,
  Zap,
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Check,
  Edit2,
  Save,
} from "lucide-react";

const InstagramIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedinIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type Variant = "primary" | "secondary" | "outline";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

interface ProductCardProps {
  title: string;
  price: string;
  image?: string;
  features: string[];
  onClick: () => void;
}

interface HomePageProps {
  setCurrentPage: (page: string) => void;
  setSelectedProduct: (id: ProductKey) => void;
}

type ProductKey = "business-card" | "smart-tag" | "restaurant-tag";

interface ProductsPageProps {
  selectedProduct: ProductKey;
  setSelectedProduct: (id: ProductKey) => void;
}

const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps): React.ReactElement => {
  const baseClass = "px-8 py-3 rounded-full font-medium transition-all duration-300";
  const variants: Record<Variant, string> = {
    primary: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105",
    secondary: "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20",
    outline: "border-2 border-white/30 text-white hover:bg-white/10",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClass} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

const Navbar = ({ currentPage, setCurrentPage }: NavbarProps): React.ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", id: "home" },
    { name: "Products", id: "products" },
    { name: "Digital Profile", id: "profile" },
    { name: "About", id: "about" },
    { name: "Contact", id: "contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent cursor-pointer"
          onClick={() => setCurrentPage("home")}
        >
          TapLab
        </motion.div>
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1 }}
              onClick={() => setCurrentPage(item.id)}
              className={`text-sm font-medium transition-colors ${
                currentPage === item.id ? "text-blue-400" : "text-gray-300 hover:text-white"
              }`}
            >
              {item.name}
            </motion.button>
          ))}
          <Button variant="primary" className="text-sm">Get Started</Button>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-md"
          >
            <div className="px-6 py-4 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentPage(item.id); setIsOpen(false); }}
                  className={`block w-full text-left py-2 ${
                    currentPage === item.id ? "text-blue-400" : "text-gray-300"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const Footer = ({ setCurrentPage }: FooterProps): React.ReactElement => {
  const socials = [
    { Icon: InstagramIcon, href: "https://www.instagram.com/taplab.in/" },
    { Icon: LinkedinIcon, href: "https://www.linkedin.com/company/taplabindia/" },
  ];

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
              TapLab
            </h3>
            <p className="text-gray-400 text-sm">Premium NFC solutions for modern businesses & creators.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Products</h4>
            <div className="space-y-2">
              {["NFC Business Cards", "NFC Smart Tags", "Restaurant Table Tags"].map((item) => (
                <button key={item} className="block text-gray-400 hover:text-white text-sm transition-colors">
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <div className="space-y-2">
              {[
                { name: "About Us", id: "about" },
                { name: "Contact", id: "contact" },
                { name: "Support", id: "contact" },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setCurrentPage(item.id)}
                  className="block text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4">
              {socials.map(({ Icon, href }, i) => (
                <motion.a
                  key={i}
                  whileHover={{ scale: 1.1, y: -2 }}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                >
                  <Icon size={18} className="text-gray-400 hover:text-blue-400" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm">
          <p>© 2025 TapLab. All rights reserved. Upgrade how you connect.</p>
        </div>
      </div>
    </footer>
  );
};

const ProductCard = ({ title, price, image, features, onClick }: ProductCardProps): React.ReactElement => (
  <motion.div
    whileHover={{ y: -10, scale: 1.02 }}
    className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer shadow-xl"
    onClick={onClick}
  >
    <div className="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-6 flex items-center justify-center">
      {image ? <div className="text-6xl">{image}</div> : <Wifi size={64} className="text-blue-400" />}
    </div>
    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
    <p className="text-3xl font-bold text-blue-400 mb-6">₹{price}</p>
    <ul className="space-y-3 mb-6">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start text-gray-300 text-sm">
          <Check size={16} className="text-blue-400 mr-2 mt-1 flex-shrink-0" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <Button variant="primary" className="w-full">Order Now</Button>
  </motion.div>
);

const HomePage = ({ setCurrentPage, setSelectedProduct }: HomePageProps): React.ReactElement => {
  const navigate = useNavigate();

  const products = [
    {
      id: "business-card" as ProductKey,
      title: "NFC Business Card",
      price: "499",
      image: "💳",
      features: ["Premium metal finish", "Instant profile sharing", "Customizable design", "Lock-protected NFC"],
    },
    {
      id: "smart-tag" as ProductKey,
      title: "NFC Circular Tag",
      price: "299",
      image: "⭕",
      features: ["Compact & portable", "Works on all phones", "Reusable & durable", "Easy to program"],
    },
    {
      id: "restaurant-tag" as ProductKey,
      title: "Restaurant Table Tag",
      price: "399",
      image: "🍽️",
      features: ["Menu QR integration", "Digital ordering", "Contact-free service", "Brand customization"],
    },
  ];

  const testimonials = [
    { name: "Pizza Caprina", role: "Cafe Owner", text: "TapLab cards are a game-changer. Clients are always impressed!", rating: 5 },
    { name: "High On Shakes", role: "Cafe Owner", text: "Premium quality and super easy to use. Highly recommend!", rating: 5 },
    { name: "Seby D'costa", role: "Restaurant Owner", text: "Table tags revolutionized our customer experience.", rating: 5 },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-black" />
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="inline-block mb-6">
              <Wifi size={80} className="text-blue-400 mx-auto" />
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
              Tap. Connect. Impress.
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Premium NFC solutions for modern businesses & creators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" onClick={() => setCurrentPage("products")}>Explore Products</Button>
              <Button variant="outline" onClick={() => navigate("/pizza_palace")}>Watch Demo</Button>
            </div>
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <ChevronDown size={32} className="text-gray-400" />
        </motion.div>
      </section>

      {/* Products Grid */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Our Products</h2>
            <p className="text-gray-400 text-lg">Premium NFC solutions for every need</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <ProductCard
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  features={product.features}
                  onClick={() => { setSelectedProduct(product.id); setCurrentPage("products"); }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">Why Choose TapLab?</h2>
          </motion.div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Zap, title: "One Tap Instant Profile", desc: "Share everything instantly with a single tap" },
              { icon: Shield, title: "Lock-Protected NFC Tags", desc: "Secure and safe from unauthorized access" },
              { icon: Smartphone, title: "Works on All Phones", desc: "Compatible with iOS and Android devices" },
              { icon: Star, title: "Premium Materials", desc: "Luxury metal and durable construction" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <item.icon size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">What Our Clients Say</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((test, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl border border-white/10"
              >
                <div className="flex mb-4">
                  {[...Array(test.rating)].map((_, j) => (
                    <Star key={j} size={20} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{test.text}"</p>
                <div>
                  <p className="text-white font-semibold">{test.name}</p>
                  <p className="text-gray-500 text-sm">{test.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-900/20 to-black">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">Upgrade How You Connect</h2>
          <p className="text-xl text-gray-300 mb-8">Join thousands of professionals using TapLab</p>
          <Button variant="primary" className="text-lg px-12 py-4">Get Started Today</Button>
        </motion.div>
      </section>
    </div>
  );
};

const ProductsPage = ({ selectedProduct, setSelectedProduct }: ProductsPageProps): React.ReactElement => {
  const productDetails: Record<ProductKey, { title: string; price: string; image?: string; description: string; features: string[]; howItWorks: string[]; specs: string }> = {
    "business-card": {
      title: "NFC Business Card", price: "499", image: "💳",
      description: "Premium metal business cards with embedded NFC technology for instant profile sharing.",
      features: ["Premium stainless steel or black metal finish", "Customizable with your logo and design", "Instant digital profile sharing with one tap", "Lock-protected NFC chip for security", "Works with all NFC-enabled smartphones"],
      howItWorks: ["We manufacture with premium materials", "Program your digital profile", "Tap to share with anyone, instantly"],
      specs: "Size: 85.6 × 53.98 mm • Material: Stainless Steel • Chip: NTAG216",
    },
    "smart-tag": {
      title: "NFC Circular Tag", price: "299", image: "⭕",
      description: "Compact, portable NFC tags perfect for creators, freelancers, and anyone on the go.",
      features: ["Ultra-compact circular design", "Durable waterproof construction", "Attach to phone case or wallet", "Works on all NFC phones", "Multiple color options"],
      howItWorks: ["Receive your NFC tag", "Attach to your phone or accessories", "Share your profile with a tap"],
      specs: "Diameter: 30mm • Material: PVC • Chip: NTAG213 • Waterproof: IP67",
    },
    "restaurant-tag": {
      title: "Restaurant Table NFC Tag", price: "399", image: "🍽️",
      description: "Transform your restaurant with contactless table ordering and digital menus.",
      features: ["Custom branded table stands", "Contact-free customer experience", "Easy menu updates anytime"],
      howItWorks: ["Install tags on your tables", "Upload your digital menu", "Customers tap to view and order"],
      specs: "Size: Custom • Material: Acrylic Stand + NFC • Chip: NTAG215",
    },
  };

  const product = productDetails[selectedProduct] ?? productDetails["business-card"];

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center gap-4 mb-16 flex-wrap">
          {(Object.keys(productDetails) as ProductKey[]).map((k) => (
            <Button key={k} variant={selectedProduct === k ? "primary" : "secondary"} onClick={() => setSelectedProduct(k)}>
              {productDetails[k].title}
            </Button>
          ))}
        </div>
        <motion.div key={selectedProduct} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-12">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-16 border border-white/10 flex items-center justify-center">
            <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5 }} className="text-9xl">
              {product.image ?? "📦"}
            </motion.div>
          </div>
          <div>
            <h1 className="text-5xl font-bold text-white mb-4">{product.title}</h1>
            <p className="text-4xl font-bold text-blue-400 mb-6">₹{product.price}</p>
            <p className="text-gray-300 text-lg mb-8">{product.description}</p>
            <h3 className="text-2xl font-bold text-white mb-4">Features</h3>
            <ul className="space-y-3 mb-8">
              {product.features.map((feature, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start text-gray-300">
                  <Check size={20} className="text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
            <h3 className="text-2xl font-bold text-white mb-4">How It Works</h3>
            <div className="space-y-4 mb-8">
              {product.howItWorks.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">{i + 1}</div>
                  <p className="text-gray-300 mt-1">{step}</p>
                </motion.div>
              ))}
            </div>
            <div className="bg-white/5 rounded-xl p-4 mb-8">
              <p className="text-gray-400 text-sm">{product.specs}</p>
            </div>
            <Button variant="primary" className="w-full md:w-auto text-lg px-12">Order Now</Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const ProfilePage = (): React.ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [profile, setProfile] = useState({
    name: "John Doe", title: "Product Designer",
    bio: "Passionate about creating beautiful digital experiences.",
    phone: "+91 98765 43210", email: "john@example.com",
    website: "johndoe.com", upi: "john@upi",
    instagram: "@johndoe", linkedin: "johndoe", twitter: "@johndoe",
  });
  const [tempProfile, setTempProfile] = useState(profile);

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-black">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Digital Profile Demo</h1>
          <p className="text-gray-400 text-lg">This is what people see when they tap your NFC card</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-4xl text-white font-bold">
              {isEditing ? tempProfile.name.charAt(0) : profile.name.charAt(0)}
            </div>
            <Button variant="secondary" onClick={() => { if (isEditing) { setTempProfile(profile); setIsEditing(false); } else setIsEditing(true); }} className="flex items-center gap-2">
              <Edit2 size={16} />{isEditing ? "Cancel" : "Edit Demo"}
            </Button>
          </div>
          <div className="space-y-6 mb-8">
            {isEditing ? (
              <>
                <input type="text" value={tempProfile.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-3xl font-bold focus:outline-none focus:border-blue-500" />
                <input type="text" value={tempProfile.title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-xl focus:outline-none focus:border-blue-500" />
                <textarea value={tempProfile.bio} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTempProfile({ ...tempProfile, bio: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 focus:outline-none focus:border-blue-500 min-h-[100px]" />
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold text-white">{profile.name}</h2>
                <p className="text-xl text-gray-300">{profile.title}</p>
                <p className="text-gray-400 leading-relaxed">{profile.bio}</p>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {isEditing ? (
              <>
                <input type="tel" value={tempProfile.phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, phone: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Phone" />
                <input type="email" value={tempProfile.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, email: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Email" />
                <input type="text" value={tempProfile.website} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, website: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Website" />
                <input type="text" value={tempProfile.upi} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, upi: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="UPI ID" />
              </>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-3 bg-blue-500 text-white rounded-xl px-6 py-4 font-medium"><Phone size={20} /> Call</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-3 bg-white/10 text-white rounded-xl px-6 py-4 font-medium"><Mail size={20} /> Email</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-3 bg-white/10 text-white rounded-xl px-6 py-4 font-medium"><Wifi size={20} /> Website</motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center gap-3 bg-green-500 text-white rounded-xl px-6 py-4 font-medium">💰 Pay via UPI</motion.button>
              </>
            )}
          </div>
          <div className="border-t border-white/10 pt-8">
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={tempProfile.instagram} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, instagram: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Instagram handle" />
                <input type="text" value={tempProfile.linkedin} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, linkedin: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="LinkedIn username" />
                <input type="text" value={tempProfile.twitter} onChange={(e: ChangeEvent<HTMLInputElement>) => setTempProfile({ ...tempProfile, twitter: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="Twitter handle" />
              </div>
            ) : (
              <div className="flex gap-4">
                {[{ Icon: InstagramIcon }, { Icon: LinkedinIcon }].map(({ Icon }, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.95 }} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-500/20 transition-colors">
                    <Icon size={20} className="text-gray-400" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
          {!isEditing && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full mt-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl py-4 font-semibold text-lg">
              💾 Save Contact
            </motion.button>
          )}
          {isEditing && (
            <Button variant="primary" onClick={() => { setProfile(tempProfile); setIsEditing(false); }} className="w-full mt-8 flex items-center justify-center gap-2">
              <Save size={20} /> Save Changes
            </Button>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <p className="text-blue-300 text-center">💡 This is a live demo. Try editing to see how your profile would look to others!</p>
        </motion.div>
      </div>
    </div>
  );
};

const AboutPage = (): React.ReactElement => (
  <div className="min-h-screen pt-24 pb-16 px-6 bg-black">
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">About TapLab</h1>
        <p className="text-xl text-gray-400">Revolutionizing how professionals connect</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-8">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white mb-4">Our Story</h2>
          <p className="text-gray-300 leading-relaxed mb-4">TapLab was born from a simple observation: business cards are outdated, but the need for instant, professional networking has never been stronger. We set out to create a solution that combines premium materials with cutting-edge NFC technology.</p>
          <p className="text-gray-300 leading-relaxed">Today, thousands of professionals, entrepreneurs, and businesses use TapLab to make lasting impressions and seamlessly share their digital presence.</p>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-300 leading-relaxed">We believe in a world where sharing your professional identity is as simple as a tap. Our mission is to empower modern professionals with premium, sustainable, and intelligent networking solutions that leave a lasting impression.</p>
        </div>
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white mb-4">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Quality First", desc: "Premium materials and craftsmanship in every product" },
              { title: "Innovation", desc: "Constantly pushing boundaries in NFC technology" },
              { title: "Sustainability", desc: "Reducing paper waste with reusable digital solutions" },
              { title: "Customer Success", desc: "Your success is our success" },
            ].map((value, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0"><Check size={20} className="text-white" /></div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{value.title}</h3>
                  <p className="text-gray-400 text-sm">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const ContactPage = (): React.ReactElement => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Thank you! We will get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  const faqs = [
    { q: "How does NFC technology work?", a: "NFC (Near Field Communication) allows devices to communicate when they are close together. Simply tap your TapLab card to any smartphone to instantly share your digital profile." },
    { q: "Do I need an app?", a: "No app needed! NFC works natively on all modern smartphones (iPhone and Android). Recipients just tap and view your profile in their browser." },
    { q: "What is the delivery time?", a: "Standard delivery takes 7-10 business days. Express delivery options are available at checkout." },
    { q: "Is there a warranty?", a: "Yes! All TapLab products come with a lifetime chip warranty. If your NFC chip stops working, we will replace it free of charge." },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Get in Touch</h1>
          <p className="text-xl text-gray-400">We're here to help you upgrade how you connect</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Message</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[150px]" required />
              </div>
              <Button variant="primary" className="w-full">Send Message</Button>
            </form>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-8">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-white/10">
              <h2 className="text-3xl font-bold text-white mb-6">Contact Information</h2>
              <div className="space-y-6">
                <motion.a href="https://wa.me/919867145439" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.05 }} className="flex items-center gap-4 p-4 bg-green-500/20 rounded-xl border border-green-500/30 hover:bg-green-500/30 transition-colors">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><Phone size={24} className="text-white" /></div>
                  <div><div className="text-gray-400 text-sm">WhatsApp Support</div><div className="text-white font-semibold">+91 98671 45439</div></div>
                </motion.a>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Mail size={24} className="text-white" /></div>
                  <div><div className="text-gray-400 text-sm">Email</div><div className="text-white font-semibold">contact@taplab.in</div></div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><MapPin size={24} className="text-white" /></div>
                  <div><div className="text-gray-400 text-sm">Location</div><div className="text-white font-semibold">Mumbai, India</div></div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-white font-semibold mb-2">💬 Quick Response</h3>
              <p className="text-gray-300 text-sm">We typically respond within 2-4 hours during business hours (9 AM - 6 PM IST)</p>
            </div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-3">{faq.q}</h3>
                <p className="text-gray-400">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function Home(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [selectedProduct, setSelectedProduct] = useState<ProductKey>("business-card");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentPage === "home" && <HomePage setCurrentPage={setCurrentPage} setSelectedProduct={setSelectedProduct} />}
          {currentPage === "products" && <ProductsPage selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />}
          {currentPage === "profile" && <ProfilePage />}
          {currentPage === "about" && <AboutPage />}
          {currentPage === "contact" && <ContactPage />}
        </motion.div>
      </AnimatePresence>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
