/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Menu as MenuIcon, 
  X, 
  ChevronRight, 
  Instagram, 
  Facebook, 
  MapPin, 
  Phone, 
  Clock,
  ArrowRight,
  Calendar,
  Users,
  User as UserIcon,
  Mail,
  LogOut,
  CheckCircle2,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ClipboardList,
  Sun,
  Moon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import ScrollExpandMedia from "@/components/ui/scroll-expansion-hero";

import { 
  pb,
  signInWithGoogle, 
  signInWithApple,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  logout 
} from "./pocketbase";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Context ---

interface AuthContextType {
  user: any | null;
  loading: boolean;
  role: "admin" | "kitchen" | "server" | "client" | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null, isAdmin: false });

interface CartItem extends MenuItem {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0
});

const useCart = () => useContext(CartContext);

const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => {
    const price = parseInt(item.price.replace("€", ""));
    return acc + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AuthContextType["role"]>(null);

  const pocketBaseUserToAppUser = (model: any) => {
    if (!model) return null;
    return {
      ...model,
      uid: model.id,
      displayName: model.name || model.username || "Utilisateur",
      photoURL: model.avatar 
        ? pb.files.getUrl(model, model.avatar) 
        : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
    };
  };

  useEffect(() => {
    const handleAuthChange = async (token: string, model: any) => {
      const appUser = pocketBaseUserToAppUser(model);
      setUser(appUser);
      
      if (model) {
        const isDefaultAdmin = model.email === "adminuser@mail.com";
        
        if (!model.role) {
          const newRole = isDefaultAdmin ? "admin" : "client";
          try {
            const updatedUser = await pb.collection("users").update(model.id, {
              role: newRole
            });
            setUser(pocketBaseUserToAppUser(updatedUser));
            setRole(newRole);
          } catch (err) {
            console.error("Error setting default role in PocketBase:", err);
            setRole(newRole);
          }
        } else {
          setRole(model.role as AuthContextType["role"]);
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    };

    // Charge initiale
    if (pb.authStore.isValid && pb.authStore.model) {
      handleAuthChange(pb.authStore.token, pb.authStore.model);
    } else {
      setLoading(false);
    }

    const unsubscribe = pb.authStore.onChange(handleAuthChange);
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, isAdmin: role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Types ---

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  isNew?: boolean;
  isPopular?: boolean;
}

// --- Constants ---

// Les plats (MENU_ITEMS) sont désormais chargés dynamiquement depuis PocketBase.

const CATEGORIES = ["Tous", "Nigiri", "Rolls", "Sashimi"];

const FALLBACK_MENU_ITEMS: MenuItem[] = [
  {
    id: "fallback-nigiri-sake",
    name: "Nigiri Sake Label Rouge",
    description: "Tranche fondante de saumon Label Rouge délicatement mariée à un riz vinaigré assaisonné et un soupçon de zeste de yuzu.",
    price: "12.00 €",
    category: "Nigiri",
    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=800&auto=format&fit=crop",
    isPopular: true
  },
  {
    id: "fallback-nigiri-maguro",
    name: "Nigiri Maguro Imperial",
    description: "Thon rouge d'exception reposant sur un lit de riz vinaigré tiède, relevé par une pointe subtile de wasabi frais râpé à la main.",
    price: "14.00 €",
    category: "Nigiri",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop",
    isNew: true
  },
  {
    id: "fallback-roll-komorebi",
    name: "Komorebi Signature Roll",
    description: "Crabe royal d'Alaska, avocat crémeux, saumon label rouge flambé de façon spectaculaire et filet de sauce unagi maison.",
    price: "24.00 €",
    category: "Rolls",
    image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?q=80&w=800&auto=format&fit=crop",
    isPopular: true
  },
  {
    id: "fallback-roll-truffe",
    name: "Truffe & Asperge Roll",
    description: "Asperge verte croustillante, avocat crémeux, fins copeaux de truffe noire d'été et éclats croustillants de tempura.",
    price: "22.00 €",
    category: "Rolls",
    image: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=800&auto=format&fit=crop",
    isNew: true
  },
  {
    id: "fallback-sashimi-moriawase",
    name: "Sashimi Moriawase",
    description: "Sélection d'exception de notre Chef : tranches fines de thon rouge impérial, saumon Label Rouge fondant et daurade royale.",
    price: "32.00 €",
    category: "Sashimi",
    image: "https://images.unsplash.com/photo-1534482421-64566f976cfa?q=80&w=800&auto=format&fit=crop",
    isPopular: true
  },
  {
    id: "fallback-sashimi-hamachi",
    name: "Sashimi Hamachi Yuzu-Ponzu",
    description: "Sériole délicate coupée au couteau japonais traditionnelle, rehaussée de piment jalapeño et d'une vinaigrette ponzu aux agrumes.",
    price: "28.00 €",
    category: "Sashimi",
    image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?q=80&w=800&auto=format&fit=crop"
  }
];


// --- Components ---

const Navbar = ({ 
  onToggleDashboard, 
  isDashboard, 
  onOpenCart, 
  onOpenAuth,
  theme,
  toggleTheme,
  onOpenReservation
}: { 
  onToggleDashboard: () => void, 
  isDashboard: boolean, 
  onOpenCart: () => void, 
  onOpenAuth: () => void,
  theme: "light" | "dark",
  toggleTheme: () => void,
  onOpenReservation: () => void
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading, role } = useAuth();
  const { cart } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 glass shadow-sm ${isScrolled || isDashboard ? "py-2" : "py-4"}`}>
      <div className="container mx-auto px-10 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[18px] font-sans font-semibold tracking-[-0.02em] cursor-pointer"
          onClick={() => isDashboard && onToggleDashboard()}
        >
          KOMOREBI
        </motion.div>

        <div className="hidden md:flex items-center space-x-8 text-[12px] font-normal tracking-[0.02em]">
          {!isDashboard ? (
            <>
              {["Menu", "Philosophie", "Réservations", "Contact"].map((item) => (
                <a 
                  key={item} 
                  href={item === "Réservations" ? "#" : `#${item.toLowerCase()}`}
                  onClick={item === "Réservations" ? (e) => {
                    e.preventDefault();
                    onOpenReservation();
                  } : undefined}
                  className="hover:opacity-100 opacity-80 transition-opacity cursor-pointer"
                >
                  {item}
                </a>
              ))}
              
              <button 
                onClick={onOpenCart}
                className="relative hover:opacity-100 opacity-80 transition-opacity flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
                <span>Panier</span>
              </button>
            </>
          ) : (
            <span className="font-semibold uppercase tracking-widest text-muted-foreground">Espace Professionnel</span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-muted relative w-8 h-8 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer"
            aria-label="Changer de thème"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 180 : 0, scale: theme === 'dark' ? 0 : 1, opacity: theme === 'dark' ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="absolute flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-foreground" />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : -180, scale: theme === 'dark' ? 1 : 0, opacity: theme === 'dark' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-foreground" />
            </motion.div>
          </Button>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              {role !== "client" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onToggleDashboard}
                  className="text-[10px] uppercase tracking-wider text-accent border border-accent/20 h-7 rounded-full hover:bg-accent hover:text-white px-3"
                >
                  {isDashboard ? "Voir le site" : role}
                </Button>
              )}
              <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-8 h-8 rounded-full apple-shadow" />
              <Button variant="ghost" size="icon" onClick={logout} className="rounded-full hover:bg-muted">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={onOpenAuth}
              className="rounded-full px-5 h-8 text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
            >
              Connexion
            </Button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-muted relative w-8 h-8 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer"
            aria-label="Changer de thème"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 180 : 0, scale: theme === 'dark' ? 0 : 1, opacity: theme === 'dark' ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              className="absolute flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-foreground" />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : -180, scale: theme === 'dark' ? 1 : 0, opacity: theme === 'dark' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-foreground" />
            </motion.div>
          </Button>

          <Sheet>
            <SheetTrigger render={
              <Button variant="ghost" size="icon">
                <MenuIcon className="w-6 h-6" />
              </Button>
            } />
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left font-serif text-2xl">KOMOREBI</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-6 mt-12 text-xl font-light">
                {["Menu", "Philosophie", "Réservations", "Contact"].map((item) => (
                  <a 
                    key={item} 
                    href={item === "Réservations" ? "#" : `#${item.toLowerCase()}`}
                    onClick={item === "Réservations" ? (e) => {
                      e.preventDefault();
                      onOpenReservation();
                    } : undefined}
                    className="hover:pl-2 transition-all cursor-pointer"
                  >
                    {item}
                  </a>
                ))}
                
                <div className="flex items-center justify-between border-t border-border pt-6 mt-4">
                  <span className="text-sm font-medium text-foreground">Mode Sombre</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="rounded-full hover:bg-muted w-10 h-10 flex items-center justify-center border border-border relative overflow-hidden transition-all cursor-pointer"
                    aria-label="Changer de thème"
                  >
                    <motion.div
                      initial={false}
                      animate={{ rotate: theme === 'dark' ? 180 : 0, scale: theme === 'dark' ? 0 : 1, opacity: theme === 'dark' ? 0 : 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute flex items-center justify-center"
                    >
                      <Moon className="w-5 h-5 text-foreground" />
                    </motion.div>
                    <motion.div
                      initial={false}
                      animate={{ rotate: theme === 'dark' ? 0 : -180, scale: theme === 'dark' ? 1 : 0, opacity: theme === 'dark' ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center"
                    >
                      <Sun className="w-5 h-5 text-foreground" />
                    </motion.div>
                  </Button>
                </div>
                
                <Button 
                  onClick={onOpenReservation}
                  className="w-full rounded-full mt-4 cursor-pointer"
                >
                  Réserver une table
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ onOpenReservation }: { onOpenReservation: () => void }) => {
  return (
    <ScrollExpandMedia
      mediaType="video"
      mediaSrc="/hero-video.mp4"
      posterSrc="/scroll-hero.jpg"
      bgImageSrc="https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1920&auto=format&fit=crop"
      title="KOMOREBI SUSHI"
      date="PARIS — 2024"
      scrollToExpand="SCROLL TO EXPLORE"
    >
      <div className="flex flex-col items-center justify-center text-center mt-12 md:mt-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block text-[14px] font-semibold tracking-[0.1em] uppercase text-accent mb-4">
            Nouvelle Saison
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-semibold mb-6 text-foreground">
            L'art de l'essentiel <br /> dans chaque grain.
          </h1>
          <p className="text-lg md:text-xl font-normal text-muted-foreground max-w-2xl mx-auto mb-10">
            Une fusion entre tradition millénaire japonaise et pureté contemporaine. Découvrez le sushi réinventé.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Button 
              size="lg" 
              onClick={onOpenReservation}
              className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 text-[14px] font-medium cursor-pointer"
            >
              Réserver une table
            </Button>
            <a href="#menu" className="cursor-pointer">
              <Button variant="link" className="text-[#0066cc] p-0 h-auto text-[14px] font-normal hover:no-underline pointer-events-none">
                Découvrir le menu &rsaquo;
              </Button>
            </a>
          </div>
          
          <div className="hidden lg:flex justify-center gap-10 mt-24">
            <div className="text-[12px] text-muted-foreground text-left">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Adresse</strong>
              12 Rue de la Paix, Paris
            </div>
            <div className="text-[12px] text-muted-foreground text-left">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Horaires</strong>
              12:00 — 22:30
            </div>
            <div className="text-[12px] text-muted-foreground text-left">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Contact</strong>
              +33 1 23 45 67 89
            </div>
          </div>
        </motion.div>
      </div>
    </ScrollExpandMedia>
  );
};

const MenuSection = ({ items, onOpenImmersiveMenu }: { items: MenuItem[]; onOpenImmersiveMenu: () => void }) => {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const { addToCart } = useCart();

  const filteredItems = activeCategory === "Tous" 
    ? items 
    : items.filter(item => item.category === activeCategory);

  return (
    <section id="menu" className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 tracking-tight text-foreground">Notre Carte</h2>
            <p className="text-muted-foreground text-lg font-light">
              Nous sélectionnons les meilleurs produits de saison pour vous offrir une fraîcheur inégalée. 
              Nos poissons sont issus d'une pêche durable et responsable.
            </p>
          </div>
          <div className="flex space-x-2 bg-muted p-1.5 rounded-full border border-border w-full md:w-auto overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-6 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeCategory}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            >
              {filteredItems.map((item) => (
                <Card key={item.id} className="group border-none apple-shadow overflow-hidden bg-background rounded-[28px] h-full flex flex-col">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      {item.isNew && <Badge className="bg-background text-foreground hover:bg-background border-none apple-shadow">Nouveau</Badge>}
                      {item.isPopular && <Badge className="bg-accent text-white hover:bg-accent border-none apple-shadow">Populaire</Badge>}
                    </div>
                  </div>
                  <CardContent className="p-8 flex flex-col flex-1 items-center text-center">
                    <h3 className="text-[24px] font-semibold mb-2">{item.name}</h3>
                    <p className="text-[17px] text-muted-foreground mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="mt-auto w-full">
                      <div className="text-[17px] font-medium text-foreground mb-6">{item.price}</div>
                      <Button 
                        onClick={() => addToCart(item)}
                        className="w-full rounded-full h-11 bg-foreground text-background hover:bg-accent hover:text-white transition-all duration-300 font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:shadow"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-20 text-center">
          <Button 
            variant="link" 
            onClick={onOpenImmersiveMenu}
            className="group text-base font-medium cursor-pointer"
          >
            Voir la carte complète <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const ImmersiveMenu = ({ 
  isOpen, 
  onClose, 
  items 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: MenuItem[]; 
}) => {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const { addToCart } = useCart();
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredItems = activeCategory === "Tous" 
    ? items 
    : items.filter(item => item.category === activeCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col w-screen h-screen bg-background/95 backdrop-blur-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-50 w-full px-6 py-6 md:px-12 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-1">
                Gastronomie Japonaise
              </span>
              <h2 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-foreground uppercase">
                La Carte Immersive
              </h2>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full w-12 h-12 flex items-center justify-center border border-border hover:bg-muted/80 transition-all cursor-pointer"
              aria-label="Fermer la carte"
            >
              <X className="w-5 h-5 text-foreground" />
            </Button>
          </div>

          <div className="container mx-auto px-6 py-12 md:px-12 max-w-7xl flex-1 flex flex-col">
            {/* Categories */}
            <div className="flex justify-center mb-16 overflow-x-auto pb-4 scrollbar-none">
              <div className="flex space-x-2 md:space-x-4 bg-muted p-1.5 rounded-full border border-border">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`relative px-6 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      activeCategory === cat
                        ? "bg-foreground text-background shadow-md font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes Grid */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
                <p className="text-muted-foreground text-lg">Aucun plat disponible pour le moment.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeCategory}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 pb-20"
                  >
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col bg-muted/30 border border-border/60 hover:border-border hover:bg-muted/50 rounded-[32px] overflow-hidden apple-shadow transition-all duration-500 h-full"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <img
                            src={item.image || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop"}
                            alt={item.name}
                            className="w-full h-full object-cover transform duration-700 ease-out group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 left-4 flex gap-2">
                            {item.isNew && (
                              <Badge className="bg-background text-foreground hover:bg-background border-none apple-shadow font-medium">
                                Nouveau
                              </Badge>
                            )}
                            {item.isPopular && (
                              <Badge className="bg-accent text-white hover:bg-accent border-none apple-shadow font-medium">
                                Populaire
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-8 flex flex-col flex-1">
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <h3 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors duration-300">
                              {item.name}
                            </h3>
                            <span className="text-lg font-serif font-semibold text-foreground whitespace-nowrap">
                              {item.price}
                            </span>
                          </div>
                          <p className="text-sm font-light text-muted-foreground leading-relaxed mb-6 flex-1">
                            {item.description}
                          </p>
                          
                          <Button
                            onClick={() => addToCart(item)}
                            className="w-full rounded-full h-11 bg-foreground text-background hover:bg-accent hover:text-white transition-all duration-300 font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:shadow"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Ajouter au panier
                          </Button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ImmersiveReservation = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col w-screen h-screen bg-background/95 backdrop-blur-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-50 w-full px-6 py-6 md:px-12 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase mb-1">
                Expérience Gastronomique
              </span>
              <h2 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-foreground uppercase">
                Réserver une table
              </h2>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full w-12 h-12 flex items-center justify-center border border-border hover:bg-muted/80 transition-all cursor-pointer"
              aria-label="Fermer la réservation"
            >
              <X className="w-5 h-5 text-foreground" />
            </Button>
          </div>

          <div className="container mx-auto px-6 py-12 md:px-12 max-w-2xl flex-1 flex flex-col justify-center">
            <div className="bg-muted/30 border border-border/60 p-8 md:p-12 rounded-[32px] apple-shadow">
              <h3 className="text-2xl font-sans font-semibold mb-4 text-center text-foreground">Votre Table chez Komorebi</h3>
              <p className="text-sm font-light text-muted-foreground text-center mb-8">
                Veuillez renseigner les détails de votre réservation. Un e-mail de confirmation vous sera envoyé dès validation de notre équipe.
              </p>
              <ReservationForm />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


const Philosophy = () => {
  return (
    <section id="philosophie" className="py-32 bg-muted/40">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl"
            >
              <img 
                src="https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1000&auto=format&fit=crop" 
                alt="Chef at work" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute -bottom-10 -right-10 hidden md:block w-64 h-64 rounded-2xl overflow-hidden border-[12px] border-background shadow-xl"
            >
              <img 
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop" 
                alt="Restaurant interior" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4 block">Notre Essence</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8 tracking-tight leading-tight">
              L'équilibre parfait entre <br /> l'ombre et la lumière.
            </h2>
            <div className="space-y-6 text-lg font-light text-muted-foreground leading-relaxed">
              <p>
                Le nom "Komorebi" désigne en japonais la lumière du soleil qui filtre à travers les feuilles des arbres. 
                C'est cette sensation de sérénité et de beauté éphémère que nous souhaitons capturer dans chaque plat.
              </p>
              <p>
                Notre chef, formé à Tokyo, apporte une vision moderne aux techniques ancestrales. 
                La simplicité est notre luxe ultime. Pas d'artifices, seulement la pureté du produit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div>
                <h4 className="font-serif font-bold text-2xl mb-2">15+</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Ans d'expérience</p>
              </div>
              <div>
                <h4 className="font-serif font-bold text-2xl mb-2">100%</h4>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Produits Frais</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer id="contact" className="bg-background text-foreground pt-32 pb-12 border-t border-muted">
      <div className="container mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="lg:col-span-1">
            <h3 className="text-[18px] font-sans font-semibold mb-8 tracking-[-0.02em]">KOMOREBI</h3>
            <p className="text-muted-foreground font-normal leading-relaxed mb-8 text-[14px]">
              Une destination culinaire unique au cœur de Paris, dédiée à l'excellence du sushi.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full border border-muted flex items-center justify-center hover:bg-muted transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-muted flex items-center justify-center hover:bg-muted transition-all">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-8 text-foreground">Horaires</h4>
            <ul className="space-y-4 font-normal text-muted-foreground text-[14px]">
              <li className="flex justify-between">
                <span>Lun - Ven</span>
                <span>12:00 - 22:30</span>
              </li>
              <li className="flex justify-between">
                <span>Samedi</span>
                <span>18:00 - 23:30</span>
              </li>
              <li className="flex justify-between">
                <span>Dimanche</span>
                <span>Fermé</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-8 text-foreground">Contact</h4>
            <ul className="space-y-4 font-normal text-muted-foreground text-[14px]">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <span>12 Rue de la Paix, <br /> 75002 Paris</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                <span>+33 1 23 45 67 89</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-8 text-foreground">Newsletter</h4>
            <p className="text-[14px] text-muted-foreground mb-6 font-normal">Inscrivez-vous pour recevoir nos actualités et événements exclusifs.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Votre email" 
                className="bg-muted border border-transparent rounded-full px-4 py-2 text-[14px] w-full focus:outline-none focus:border-foreground/10"
              />
              <Button size="icon" className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-muted mb-12" />
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <p>© 2024 KOMOREBI RESTAURANT. TOUS DROITS RÉSERVÉS.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-foreground transition-colors">Mentions Légales</a>
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const ReservationForm = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    date: "",
    time: "19:00",
    guests: 2,
    specialRequests: ""
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reservationData = {
        userId: user?.uid || "",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        status: "pending",
        specialRequests: formData.specialRequests
      };

      await pb.collection("reservations").create(reservationData);
      setIsSuccess(true);
    } catch (error) {
      console.error("Error creating reservation in PocketBase:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold mb-2">Demande envoyée !</h3>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Votre demande de réservation a bien été reçue. Nous vous contacterons par email pour confirmer votre table.
        </p>
        <Button 
          variant="outline" 
          onClick={() => setIsSuccess(false)}
          className="rounded-full"
        >
          Nouvelle réservation
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Nom complet</label>
        <div className="relative">
          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Votre nom"
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Email</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="votre@email.com"
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Téléphone</label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="06 00 00 00 00"
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Nombre de convives</label>
        <div className="relative">
          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select 
            value={formData.guests}
            onChange={(e) => setFormData({...formData, guests: parseInt(e.target.value)})}
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all appearance-none"
          >
            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n > 1 ? "personnes" : "personne"}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Date</label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            required
            type="date"
            value={formData.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Heure</label>
        <div className="relative">
          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select 
            value={formData.time}
            onChange={(e) => setFormData({...formData, time: e.target.value})}
            className="w-full bg-background border border-muted rounded-full pl-12 pr-6 py-3 text-[14px] focus:outline-none focus:border-foreground/20 transition-all appearance-none"
          >
            {["12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground ml-4">Demandes particulières</label>
        <textarea 
          value={formData.specialRequests}
          onChange={(e) => setFormData({...formData, specialRequests: e.target.value})}
          placeholder="Allergies, anniversaire, préférence de table..."
          className="w-full bg-background border border-muted rounded-[20px] px-6 py-4 text-[14px] focus:outline-none focus:border-foreground/20 transition-all min-h-[100px]"
        />
      </div>

      <div className="md:col-span-2 mt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full rounded-full h-14 bg-foreground text-background hover:bg-foreground/90 text-[16px] font-medium"
        >
          {isSubmitting ? "Envoi en cours..." : "Confirmer la demande de réservation"}
        </Button>
      </div>
    </form>
  );
};

const AuthModal = ({ isOpen, onClose, onAuthSuccess }: { isOpen: boolean, onClose: () => void, onAuthSuccess?: () => void }) => {
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (authView === 'login') {
        await signInWithEmailAndPassword(email, password);
      } else {
        await createUserWithEmailAndPassword(email, password, name);
      }
      onAuthSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
      onAuthSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-[32px] p-8 apple-shadow border-none">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-[28px] font-sans font-semibold text-center">
            {authView === 'login' ? 'Bon retour' : 'Créez votre compte'}
          </DialogTitle>
          <p className="text-center text-muted-foreground text-[14px] mt-2">
            Connectez-vous pour continuer votre commande
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full rounded-full h-12 text-[14px] font-medium border-muted/20 flex items-center justify-center gap-3 hover:bg-muted/10"
            onClick={() => handleSocialAuth('google')}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </Button>

          <Button 
            className="w-full rounded-full h-12 text-[14px] font-medium bg-black text-white flex items-center justify-center gap-3 hover:bg-black/90"
            onClick={() => handleSocialAuth('apple')}
            disabled={loading}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.96.95-2.04 1.43-3.04 1.43-1.01 0-1.89-.37-2.67-.37-.8 0-1.74.39-2.73.39-1.06 0-2.31-.61-3.39-1.69-2.15-2.13-2.91-6.1-1.69-8.49.62-1.22 1.83-1.99 3.19-1.99.98 0 1.76.43 2.45.43.62 0 1.57-.49 2.76-.49 1.14 0 2.27.56 2.99 1.48-2.62 1.53-2.2 5.25.43 6.43-.51 1.34-1.22 2.77-2.34 3.88zm-3.17-14.02c.86-1.08.79-2.04.79-2.04s-.89-.04-1.97.94c-.81.71-.91 1.63-.91 1.63s.96.22 2.09-.53z"/>
            </svg>
            Continuer avec Apple
          </Button>

          <div className="flex items-center gap-4 py-2">
            <Separator className="flex-1" />
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">Ou</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authView === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom complet</Label>
                <Input 
                  id="name"
                  type="text" 
                  placeholder="Jean Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-full h-11 px-6 border-muted/20"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="jean@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-full h-11 px-6 border-muted/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-full h-11 px-6 border-muted/20"
                required
              />
            </div>

            {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

            <Button 
              type="submit" 
              className="w-full rounded-full h-12 text-[14px] font-medium bg-foreground text-background"
              disabled={loading}
            >
              {loading ? 'Traitement...' : authView === 'login' ? 'Se connecter' : 'S\'inscrire'}
            </Button>
          </form>

          <p className="text-center text-[13px] text-muted-foreground mt-6">
            {authView === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
            <button 
              onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
              className="text-foreground font-semibold hover:underline"
            >
              {authView === 'login' ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DishManager = ({ items, setItems }: { items: MenuItem[], setItems: React.Dispatch<React.SetStateAction<MenuItem[]>> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "Nigiri",
    image: "",
    isNew: false,
    isPopular: false
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price.replace("€", ""),
        category: editingItem.category,
        image: editingItem.image,
        isNew: editingItem.isNew || false,
        isPopular: editingItem.isPopular || false
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "Nigiri",
        image: "",
        isNew: false,
        isPopular: false
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let formattedPrice = formData.price.trim();
      if (!formattedPrice.endsWith("€")) {
        formattedPrice += "€";
      }

      const dishData = {
        name: formData.name,
        description: formData.description,
        price: formattedPrice,
        category: formData.category,
        image: formData.image,
        isNew: formData.isNew,
        isPopular: formData.isPopular
      };

      if (editingItem) {
        const updated = await pb.collection("dishes").update(editingItem.id, dishData);
        setItems(prev => prev.map(i => i.id === editingItem.id ? (updated as unknown as MenuItem) : i));
      } else {
        const created = await pb.collection("dishes").create(dishData);
        setItems(prev => [...prev, created as unknown as MenuItem]);
      }
      setIsOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Error saving dish in PocketBase:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce plat ?")) return;
    try {
      await pb.collection("dishes").delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Error deleting dish in PocketBase:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-semibold mb-1">Gestion de la Carte</h3>
          <p className="text-muted-foreground text-sm">Ajoutez, modifiez ou supprimez des plats de votre carte.</p>
        </div>
        <Button 
          onClick={() => {
            setEditingItem(null);
            setIsOpen(true);
          }}
          className="rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2 px-6"
        >
          <Plus className="w-4 h-4" />
          Ajouter un plat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <motion.div 
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-background border border-muted/20 rounded-[28px] overflow-hidden apple-shadow flex flex-col h-full hover:shadow-md transition-all duration-300"
          >
            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                {item.isNew && <Badge className="bg-background text-foreground border-none apple-shadow">Nouveau</Badge>}
                {item.isPopular && <Badge className="bg-accent text-white border-none apple-shadow">Populaire</Badge>}
              </div>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h4 className="font-semibold text-lg line-clamp-1">{item.name}</h4>
                <span className="font-semibold text-accent shrink-0">{item.price}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{item.description}</p>
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                <span className="bg-muted px-4 py-1.5 rounded-full font-medium">{item.category}</span>
              </div>
              <div className="flex gap-2 mt-auto border-t pt-4 border-muted/10">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setEditingItem(item);
                    setIsOpen(true);
                  }}
                  className="flex-1 rounded-full h-10 text-xs font-medium"
                >
                  Modifier
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setEditingItem(null);
      }}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-8 apple-shadow border-none bg-background">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-[24px] font-sans font-semibold">
              {editingItem ? "Modifier le plat" : "Ajouter un plat à la carte"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="dish-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3">Nom du plat</Label>
              <Input 
                id="dish-name"
                required
                placeholder="Ex: Dragon Roll"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="rounded-full h-11 px-5 border-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dish-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3">Description</Label>
              <textarea 
                id="dish-desc"
                placeholder="Ingrédients, préparation..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-background border border-muted rounded-[20px] px-5 py-3 text-sm focus:outline-none focus:border-foreground/20 transition-all min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dish-price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3">Prix (€)</Label>
                <Input 
                  id="dish-price"
                  required
                  placeholder="Ex: 14"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="rounded-full h-11 px-5 border-muted"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dish-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3">Catégorie</Label>
                <select 
                  id="dish-category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-background border border-muted rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-foreground/20 transition-all appearance-none"
                >
                  <option value="Nigiri">Nigiri</option>
                  <option value="Rolls">Rolls</option>
                  <option value="Sashimi">Sashimi</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dish-image" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3">URL de l'image</Label>
              <Input 
                id="dish-image"
                required
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className="rounded-full h-11 px-5 border-muted"
              />
            </div>

            <div className="flex gap-6 py-2 ml-3">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isNew}
                  onChange={(e) => setFormData({...formData, isNew: e.target.checked})}
                  className="rounded border-muted text-accent focus:ring-accent w-4 h-4"
                />
                Nouveau
              </label>

              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                  className="rounded border-muted text-accent focus:ring-accent w-4 h-4"
                />
                Populaire
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsOpen(false);
                  setEditingItem(null);
                }}
                className="flex-1 rounded-full h-12 text-sm font-semibold border-muted"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 rounded-full h-12 bg-foreground text-background hover:bg-foreground/90 text-sm font-semibold"
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StaffDashboard = ({ menuItems, setMenuItems }: { menuItems: MenuItem[], setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>> }) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'reservations' | 'orders' | 'dishes'>('orders');
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    let unsubRes = () => {};
    let unsubOrders = () => {};

    const loadData = async () => {
      try {
        // 1. Charger les réservations
        try {
          const resList = await pb.collection("reservations").getFullList();
          setReservations([...resList].reverse());
          setReservationsError(null);

          unsubRes = await pb.collection("reservations").subscribe("*", (e) => {
            setReservations(prev => {
              if (e.action === "create") return [e.record, ...prev];
              if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
              if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
              return prev;
            });
          });
        } catch (err) {
          console.error("Error loading reservations from PocketBase:", err);
          setReservationsError("La collection 'reservations' n'est pas accessible (400 ou inexistante en local).");
          setReservations([]);
        }

        // 2. Charger les commandes
        try {
          const ordersList = await pb.collection("orders").getFullList();
          setOrders([...ordersList].reverse());
          setOrdersError(null);

          unsubOrders = await pb.collection("orders").subscribe("*", (e) => {
            setOrders(prev => {
              if (e.action === "create") return [e.record, ...prev];
              if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
              if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
              return prev;
            });
          });
        } catch (err) {
          console.error("Error loading orders from PocketBase:", err);
          setOrdersError("La collection 'orders' n'est pas accessible (400 ou inexistante en local).");
          setOrders([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubRes();
      unsubOrders();
    };
  }, []);

  const updateReservationStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection("reservations").update(id, { status: newStatus });
    } catch (error) {
      console.error("Error updating reservation in PocketBase:", error);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection("orders").update(id, { status: newStatus });
    } catch (error) {
      console.error("Error updating order in PocketBase:", error);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-muted-foreground font-light">Chargement du Centre de Contrôle...</div>;
  }

  return (
    <div className="p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
        <div>
          <h2 className="text-4xl font-sans font-semibold mb-2">Centre de Contrôle</h2>
          <p className="text-muted-foreground">Gérez vos commandes, vos réservations et la carte en temps réel.</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-full scrollbar-none overflow-x-auto max-w-full">
          <button 
            onClick={() => setView('orders')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${view === 'orders' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Commandes ({orders.length})
          </button>
          <button 
            onClick={() => setView('reservations')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${view === 'reservations' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Réservations ({reservations.length})
          </button>
          <button 
            onClick={() => setView('dishes')}
            className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${view === 'dishes' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            La Carte ({menuItems.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {view === 'orders' ? (
          ordersError ? (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 rounded-[28px] p-8 text-center text-sm font-light">
              <p className="font-semibold mb-2">Impossible de charger les commandes</p>
              <p className="text-muted-foreground mb-4">{ordersError}</p>
              <div className="inline-block px-4 py-2 bg-red-500/10 rounded-full text-xs">
                💡 PocketBase local : assurez-vous d'avoir créé la collection <strong>orders</strong> dans l'Admin Dashboard.
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground font-light bg-muted/20 rounded-[28px] border border-dashed">Aucune commande reçue.</div>
          ) : (
            orders.map((order) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background apple-shadow rounded-[28px] p-8"
              >
                <div className="flex flex-col lg:flex-row justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[18px] font-semibold">{order.customerName}</span>
                      <Badge className={
                        order.status === 'ready' ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" :
                        order.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-100 border-none" :
                        "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[14px]">
                          <span className="font-medium">{item.quantity}x {item.name}</span>
                          <span className="text-muted-foreground">{item.price}</span>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6 animate-pulse" />

                    <div className="flex justify-between items-center font-semibold text-[16px]">
                      <span>Total</span>
                      <span className="text-accent">{order.total}€</span>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 justify-end">
                    {['pending', 'preparing', 'ready', 'completed'].map((s) => (
                      <Button 
                        key={s}
                        variant={order.status === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, s)}
                        className="rounded-full h-10 px-6 text-[12px] uppercase tracking-wider border-muted"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )
        ) : view === 'reservations' ? (
          reservationsError ? (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 rounded-[28px] p-8 text-center text-sm font-light">
              <p className="font-semibold mb-2">Impossible de charger les réservations</p>
              <p className="text-muted-foreground mb-4">{reservationsError}</p>
              <div className="inline-block px-4 py-2 bg-red-500/10 rounded-full text-xs">
                💡 PocketBase local : assurez-vous d'avoir créé la collection <strong>reservations</strong> dans l'Admin Dashboard.
              </div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground font-light bg-muted/20 rounded-[28px] border border-dashed">Aucune réservation pour le moment.</div>
          ) : (
            reservations.map((res) => (
              <motion.div 
                key={res.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background apple-shadow rounded-[28px] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[18px] font-semibold">{res.name}</span>
                    <Badge className={
                      res.status === 'confirmed' ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" :
                      res.status === 'cancelled' ? "bg-red-100 text-red-700 hover:bg-red-100 border-none" :
                      "bg-orange-100 text-orange-700 hover:bg-orange-100 border-none"
                    }>
                      {res.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-6 text-[14px] text-muted-foreground">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {res.date}</span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {res.time}</span>
                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {res.guests} pers.</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => updateReservationStatus(res.id, 'confirmed')}
                    variant={res.status === 'confirmed' ? 'default' : 'outline'}
                    className="rounded-full border-muted"
                  >
                    Confirmer
                  </Button>
                  <Button 
                    onClick={() => updateReservationStatus(res.id, 'cancelled')}
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                  >
                    Annuler
                  </Button>
                </div>
              </motion.div>
            ))
          )
        ) : (
          <DishManager items={menuItems} setItems={setMenuItems} />
        )}
      </div>
    </div>
  );
};

const KitchenDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    const loadOrders = async () => {
      try {
        setLoading(true);
        const ordersList = await pb.collection("orders").getFullList();
        setOrders([...ordersList].reverse());
        setError(null);

        unsubscribe = await pb.collection("orders").subscribe("*", (e) => {
          setOrders(prev => {
            if (e.action === "create") return [e.record, ...prev];
            if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
            if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
            return prev;
          });
        });
      } catch (err) {
        console.error("Error loading orders in KitchenDashboard:", err);
        setError("Impossible de charger les commandes de la cuisine.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();

    return () => {
      unsubscribe();
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection("orders").update(id, { status: newStatus });
    } catch (err) {
      console.error("Error updating order status in KitchenDashboard:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const getElapsedTime = (createdStr: string) => {
    if (!createdStr) return 0;
    const createdDate = new Date(createdStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return Math.max(0, diffMins);
  };

  const [, setTimer] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const pastOrders = orders.filter(o => o.status === 'ready' || o.status === 'completed' || o.status === 'cancelled');

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500 mb-4"></div>
        <p className="font-light text-lg">Initialisation de l'écran cuisine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20">
            <ClipboardList className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              KOMOREBI SUSHI <span className="text-xs uppercase bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-1 rounded-full font-semibold">Cuisine</span>
            </h1>
            <p className="text-xs text-zinc-400">Écran de préparation en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">Temps Réel Connecté</span>
          </div>

          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              historyOpen 
                ? 'bg-zinc-800 text-white' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {historyOpen ? "Retour" : `Historique (${pastOrders.length})`}
          </button>

          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 rounded-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="flex-grow p-8">
        {error && (
          <div className="max-w-xl mx-auto my-12 bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl text-center">
            <p className="font-semibold mb-2">Erreur de connexion</p>
            <p className="text-sm font-light text-zinc-400">{error}</p>
          </div>
        )}

        {historyOpen ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-zinc-400 font-sans">Commandes Traitées</h2>
            {pastOrders.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 font-light border border-zinc-900 rounded-3xl">
                Aucune commande traitée pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pastOrders.map((order) => (
                  <div key={order.id} className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                        <Badge className={
                          order.status === 'ready' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          order.status === 'completed' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }>
                          {order.status === 'ready' ? 'Prêt' : order.status === 'completed' ? 'Livré' : 'Annulé'}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-6">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm text-zinc-400">
                            <span className="font-bold text-zinc-300">{item.quantity}x</span> {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => updateStatus(order.id, 'preparing')}
                        variant="outline"
                        className="w-full rounded-full border-zinc-800 text-zinc-400 hover:text-white"
                      >
                        Remettre en préparation
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-full mb-6">
                  <span className="text-5xl">🍣</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-sans">Tout est propre et calme !</h3>
                <p className="text-zinc-500 font-light max-w-sm">Aucune commande en attente de préparation en cuisine.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeOrders.map((order) => {
                    const elapsed = getElapsedTime(order.created);
                    const isLate = elapsed >= 15;
                    const isVeryLate = elapsed >= 25;

                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`bg-zinc-900 border ${
                          isVeryLate ? 'border-red-500/50 shadow-red-950/20' : 
                          isLate ? 'border-amber-500/30 shadow-amber-950/10' : 
                          'border-zinc-800'
                        } rounded-[28px] p-6 shadow-xl flex flex-col justify-between h-[450px] relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                          order.status === 'preparing' ? 'bg-blue-500' : 'bg-orange-500'
                        }`} />

                        <div className="flex-grow flex flex-col overflow-hidden">
                          <div className="flex justify-between items-start mb-4 mt-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-white tracking-wider font-mono">
                                  #{order.id.slice(-4).toUpperCase()}
                                </span>
                                <Badge className={
                                  order.status === 'preparing' 
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-2 py-0.5" 
                                    : "bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] px-2 py-0.5"
                                }>
                                  {order.status === 'preparing' ? 'PRÉPARATION' : 'Nouveau'}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">Cuisine</p>
                            </div>

                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                              isVeryLate ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                              isLate ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-zinc-800 text-zinc-300'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              <span>{elapsed}m</span>
                            </div>
                          </div>

                          <ScrollArea className="flex-grow my-4 pr-2">
                            <div className="space-y-3">
                              {order.items?.map((item: any, idx: number) => {
                                const itemKey = `${order.id}-${idx}`;
                                const isChecked = checkedItems[itemKey] || false;

                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => toggleItemCheck(order.id, idx)}
                                    className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                                      isChecked 
                                        ? 'bg-zinc-950/40 opacity-40 line-through text-zinc-600' 
                                        : 'bg-zinc-950/20 hover:bg-zinc-950/50 text-zinc-300'
                                    }`}
                                  >
                                    <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                      isChecked 
                                        ? 'bg-zinc-700 border-zinc-600 text-zinc-400' 
                                        : 'border-zinc-700 text-transparent'
                                    }`}>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-[15px]">
                                      <span className="font-extrabold text-white mr-1.5">{item.quantity}x</span>
                                      <span className="font-medium">{item.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/60 mt-2">
                          {order.status === 'pending' ? (
                            <Button
                              onClick={() => updateStatus(order.id, 'preparing')}
                              className="w-full h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 tracking-wide"
                            >
                              <span>👨‍🍳 COMMENCER</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => updateStatus(order.id, 'ready')}
                              className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 tracking-wide"
                            >
                              <span>✅ PRÊT À SERVIR</span>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const ServerDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'reservations'>('service');
  const [resFilter, setResFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    let unsubOrders = () => {};
    let unsubRes = () => {};

    const loadData = async () => {
      try {
        setLoading(true);
        const ordersList = await pb.collection("orders").getFullList();
        setOrders([...ordersList].reverse());

        const resList = await pb.collection("reservations").getFullList();
        setReservations([...resList].reverse());

        setError(null);

        unsubOrders = await pb.collection("orders").subscribe("*", (e) => {
          setOrders(prev => {
            if (e.action === "create") return [e.record, ...prev];
            if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
            if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
            return prev;
          });
        });

        unsubRes = await pb.collection("reservations").subscribe("*", (e) => {
          setReservations(prev => {
            if (e.action === "create") return [e.record, ...prev];
            if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
            if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
            return prev;
          });
        });

      } catch (err) {
        console.error("Error loading server data:", err);
        setError("Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubOrders();
      unsubRes();
    };
  }, []);

  const updateOrderStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection("orders").update(id, { status: newStatus });
    } catch (err) {
      console.error("Error updating order status in ServerDashboard:", err);
    }
  };

  const updateReservationStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection("reservations").update(id, { status: newStatus });
    } catch (err) {
      console.error("Error updating reservation status in ServerDashboard:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const readyToServe = orders.filter(o => o.status === 'ready');
  const preparingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const filteredReservations = reservations.filter(res => {
    if (resFilter === 'all') return true;
    return res.status === resFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/10 text-muted-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mb-4"></div>
        <p className="font-light text-lg">Initialisation de l'espace serveur...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 text-foreground font-sans flex flex-col">
      <header className="border-b border-muted bg-background/80 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
            <ClipboardList className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              KOMOREBI SUSHI <span className="text-xs uppercase bg-primary/10 border border-primary/20 text-foreground px-2.5 py-1 rounded-full font-semibold">Service</span>
            </h1>
            <p className="text-xs text-muted-foreground">Console de service & réservations en salle</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-100/50 border border-emerald-200/50 px-4 py-2 rounded-full">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-emerald-700 font-semibold tracking-wider uppercase">En Ligne</span>
          </div>

          <div className="flex bg-muted p-1 rounded-full">
            <button
              onClick={() => setActiveTab('service')}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'service' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Service ({readyToServe.length} prêt)
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'reservations' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Réservations ({reservations.filter(r => r.status === 'pending').length} en attente)
            </button>
          </div>

          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-muted hover:bg-muted text-muted-foreground hover:text-foreground rounded-full animate-fade-in"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="flex-grow p-8">
        {error && (
          <div className="max-w-xl mx-auto my-12 bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl text-center">
            <p className="font-semibold mb-2">Erreur</p>
            <p className="text-sm font-light">{error}</p>
          </div>
        )}

        {activeTab === 'service' ? (
          <div className="space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold font-sans">🔔 À Servir Immédiatement</h2>
                <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-semibold text-xs rounded-full">
                  {readyToServe.length} Prêtes
                </Badge>
              </div>

              {readyToServe.length === 0 ? (
                <div className="text-center py-16 bg-background rounded-[28px] border border-dashed border-muted text-muted-foreground font-light flex flex-col items-center shadow-xs">
                  <span className="text-4xl mb-4">🍽️</span>
                  Aucune commande en attente de service. Tout est servi !
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {readyToServe.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-background border border-emerald-200 shadow-md shadow-emerald-500/5 rounded-[28px] p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                              Prêt
                            </span>
                            <h3 className="text-lg font-bold text-foreground mt-2">{order.customerName}</h3>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                        </div>

                        <div className="space-y-2 mb-6">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="text-sm text-foreground/80 flex justify-between">
                              <span><strong className="text-foreground">{item.quantity}x</strong> {item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-muted">
                        <Button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>MARQUER COMME LIVRÉ</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-6 text-muted-foreground flex items-center gap-3 font-sans">
                👩‍🍳 En Préparation en Cuisine ({preparingOrders.length})
              </h2>

              {preparingOrders.length === 0 ? (
                <div className="text-center py-12 bg-background/50 rounded-[28px] border border-muted/50 text-muted-foreground/60 font-light text-sm">
                  Aucune commande en cuisine actuellement.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {preparingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-background/80 border border-muted/80 rounded-[28px] p-6 flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                              order.status === 'preparing' 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-orange-50 text-orange-700 border-orange-100'
                            }`}>
                              {order.status === 'preparing' ? 'Préparation' : 'En Attente'}
                            </span>
                            <h3 className="text-md font-bold text-foreground mt-2">{order.customerName}</h3>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                        </div>

                        <div className="space-y-1 mb-4">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              <span><strong>{item.quantity}x</strong> {item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground pt-3 border-t border-muted/50 flex justify-between items-center">
                        <span>Total: {order.total}€</span>
                        <Button 
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          variant="ghost" 
                          className="h-8 text-primary hover:text-primary-foreground hover:bg-primary rounded-full px-3 text-[11px]"
                        >
                          Forcer Prêt
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-6 text-muted-foreground flex items-center gap-3 font-sans">
                📂 Historique des Services Récents ({completedOrders.length})
              </h2>

              {completedOrders.length === 0 ? (
                <div className="text-center py-10 bg-background/30 rounded-[28px] border border-muted/30 text-muted-foreground/50 font-light text-sm">
                  Historique vide.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {completedOrders.slice(0, 12).map((order) => (
                    <div
                      key={order.id}
                      className="bg-background/40 border border-muted/40 rounded-[28px] p-5 flex flex-col justify-between shadow-xs opacity-75"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                              order.status === 'completed' ? 'bg-zinc-100 text-zinc-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {order.status === 'completed' ? 'Complété' : 'Annulé'}
                            </span>
                            <h4 className="text-sm font-bold text-foreground mt-1.5">{order.customerName}</h4>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">#{order.id.slice(-4).toUpperCase()}</span>
                        </div>
                        <div className="space-y-1 mb-2">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="text-[11px] text-muted-foreground">
                              <span>{item.quantity}x {item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground pt-2 border-t border-muted/40 flex justify-between">
                        <span>Total: {order.total}€</span>
                        {order.status === 'completed' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="text-primary hover:underline text-[10px]"
                          >
                            Annuler livraison
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1 font-sans">Réservations de la Salle</h2>
                <p className="text-sm text-muted-foreground">Gérez l'accueil des clients, confirmez ou annulez les demandes.</p>
              </div>

              <div className="flex bg-muted p-1 rounded-full scrollbar-none overflow-x-auto max-w-full">
                {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setResFilter(filter)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                      resFilter === filter 
                        ? 'bg-background text-foreground shadow-xs' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter === 'all' ? 'Toutes' : filter === 'pending' ? 'En Attente' : filter === 'confirmed' ? 'Confirmées' : 'Annulées'}
                  </button>
                ))}
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-20 bg-background rounded-[28px] border border-dashed border-muted text-muted-foreground font-light shadow-xs">
                Aucune réservation trouvée pour ce filtre.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReservations.map((res) => (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-background border border-muted rounded-[28px] p-6 shadow-xs flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      res.status === 'confirmed' ? 'bg-emerald-500' :
                      res.status === 'cancelled' ? 'bg-red-500' :
                      'bg-orange-500 animate-pulse'
                    }`} />

                    <div>
                      <div className="flex justify-between items-start mb-4 mt-2">
                        <div>
                          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            {res.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{res.email}</p>
                          <p className="text-xs font-medium text-primary mt-1">{res.phone}</p>
                        </div>
                        <Badge className={
                          res.status === 'confirmed' ? "bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-0.5 rounded-full" :
                          res.status === 'cancelled' ? "bg-red-50 text-red-700 border border-red-100 text-xs px-2.5 py-0.5 rounded-full" :
                          "bg-orange-50 text-orange-700 border border-orange-100 text-xs px-2.5 py-0.5 rounded-full"
                        }>
                          {res.status === 'confirmed' ? 'Confirmé' : res.status === 'cancelled' ? 'Annulé' : 'En Attente'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 bg-muted/40 p-4 rounded-2xl mb-4 text-center">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Date</span>
                          <p className="text-xs font-semibold text-foreground mt-0.5">{res.date}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Heure</span>
                          <p className="text-xs font-semibold text-foreground mt-0.5">{res.time}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Couverts</span>
                          <p className="text-xs font-semibold text-foreground mt-0.5">{res.guests} pers.</p>
                        </div>
                      </div>

                      {res.specialRequests && (
                        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Notes Client / Allergies</span>
                          <p className="text-xs text-amber-800 leading-relaxed font-medium">{res.specialRequests}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-muted/80">
                      {res.status !== 'confirmed' && (
                        <Button
                          onClick={() => updateReservationStatus(res.id, 'confirmed')}
                          className="flex-grow h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs tracking-wider shadow-xs"
                        >
                          CONFIRMER
                        </Button>
                      )}
                      {res.status !== 'cancelled' && (
                        <Button
                          onClick={() => updateReservationStatus(res.id, 'cancelled')}
                          variant="ghost"
                          className="flex-grow h-11 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 font-medium text-xs tracking-wider border border-transparent hover:border-red-100"
                        >
                          ANNULER
                        </Button>
                      )}
                      {res.status === 'confirmed' && (
                        <Button
                          onClick={() => updateReservationStatus(res.id, 'pending')}
                          variant="outline"
                          className="flex-grow h-11 rounded-full text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 font-medium text-xs tracking-wider"
                        >
                          REMETTRE EN ATTENTE
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const CartSheet = ({ isOpen, onClose, onAuthRequired }: { isOpen: boolean, onClose: () => void, onAuthRequired: () => void }) => {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const checkout = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    setIsSubmitting(true);
    try {
      await pb.collection("orders").create({
        userId: user?.uid || "",
        customerName: user?.displayName || "Invité",
        customerEmail: user?.email || "",
        items: cart,
        total,
        status: "pending"
      });
      clearCart();
      setIsSuccess(true);
    } catch (error) {
      console.error("Error creating order in PocketBase:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-8 border-b">
          <SheetTitle className="text-[24px] font-sans font-semibold">Votre Panier</SheetTitle>
        </SheetHeader>

        {isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
            <h3 className="text-xl font-semibold mb-2">Commande confirmée !</h3>
            <p className="text-muted-foreground mb-8">Merci pour votre confiance. Votre commande est en cours de préparation.</p>
            <Button onClick={onClose} className="rounded-full w-full">Fermer</Button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-[17px]">Votre panier est vide.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-8">
              <div className="space-y-8">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-6">
                    <div className="w-20 h-20 rounded-[16px] overflow-hidden bg-muted">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h4 className="font-semibold text-[16px]">{item.name}</h4>
                        <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[13px] text-muted-foreground mb-4 line-clamp-1">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-muted rounded-full p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-background rounded-full transition-all">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 text-[13px] font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-background rounded-full transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-medium">{item.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-8 border-t bg-muted/30">
              <div className="flex justify-between items-center mb-6 text-[18px] font-semibold">
                <span>Total</span>
                <span className="text-accent">{total}€</span>
              </div>
              <Button 
                onClick={checkout} 
                disabled={isSubmitting}
                className="w-full h-14 rounded-full text-[16px] font-medium apple-shadow"
              >
                {isSubmitting ? "Finalisation..." : "Commander maintenant"}
              </Button>
              <p className="text-center text-[12px] text-muted-foreground mt-4">Paiement sécurisé lors de la remise en main propre.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const StaffRedirector = ({ role, currentPath, navigateTo, loading }: { role: any, currentPath: string, navigateTo: (p: string) => void, loading: boolean }) => {
  useEffect(() => {
    if (loading) return;

    if (role) {
      if (role === "admin" && currentPath !== "/admin") {
        navigateTo("/admin");
      } else if (role === "kitchen" && currentPath !== "/kitchen") {
        navigateTo("/kitchen");
      } else if (role === "server" && currentPath !== "/server") {
        navigateTo("/server");
      }
    } else {
      if (["/admin", "/kitchen", "/server"].includes(currentPath)) {
        navigateTo("/");
      }
    }
    
    if (role === "client" && ["/admin", "/kitchen", "/server"].includes(currentPath)) {
      navigateTo("/");
    }
  }, [role, currentPath, loading]);
  return null;
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isImmersiveMenuOpen, setIsImmersiveMenuOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoadingMenu(true);
        setMenuError(null);
        const list = await pb.collection("dishes").getFullList({ sort: "name" });
        console.log("Dishes fetched from PocketBase:", list);
        if (list && list.length > 0) {
          setMenuItems(list as unknown as MenuItem[]);
        } else {
          console.warn("PocketBase returned empty list, using premium fallbacks.");
          setMenuItems(FALLBACK_MENU_ITEMS);
        }
      } catch (err) {
        console.error("Error fetching dishes from PocketBase, switching to premium fallbacks:", err);
        setMenuItems(FALLBACK_MENU_ITEMS);
      } finally {
        setIsLoadingMenu(false);
      }
    };
    fetchMenu();
  }, []);

  return (
    <FirebaseProvider>
      <CartProvider>
        <AuthContext.Consumer>
          {({ role, user, loading }) => {
            if (loading) {
              return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500 mb-4"></div>
                  <p className="font-light text-lg">Chargement de Komorebi Sushi...</p>
                </div>
              );
            }

            return (
              <div className="min-h-screen font-sans selection:bg-black selection:text-white">
                <AnimatePresence>
                  {showIntro && !["/admin", "/kitchen", "/server"].includes(currentPath) && (
                    <motion.div
                      key="preloader"
                      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-300 ${
                        theme === 'light' ? 'bg-zinc-50 text-zinc-950' : 'bg-zinc-950 text-white'
                      }`}
                      exit={{ 
                        y: "-100%", 
                        transition: { duration: 1, ease: [0.85, 0, 0.15, 1] } 
                      }}
                    >
                      <div className="overflow-hidden mb-4">
                        <motion.div
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="flex items-center justify-center"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mr-3 animate-pulse"></span>
                          <span className={`text-[10px] uppercase tracking-[0.4em] font-sans ${
                            theme === 'light' ? 'text-zinc-400' : 'text-zinc-500'
                          }`}>Komorebi Paris</span>
                        </motion.div>
                      </div>

                      <div className="overflow-hidden mb-6">
                        <motion.h1
                          initial={{ opacity: 0, letterSpacing: "-0.1em" }}
                          animate={{ 
                            opacity: 1, 
                            letterSpacing: "0.3em",
                            transition: { 
                              opacity: { duration: 1.5, ease: "easeOut" },
                              letterSpacing: { duration: 2.2, ease: "easeOut" } 
                            }
                          }}
                          className={`text-3xl md:text-5xl font-sans font-extralight uppercase tracking-widest pl-[0.3em] ${
                            theme === 'light' ? 'text-zinc-800' : 'text-zinc-100'
                          }`}
                        >
                          KOMOREBI
                        </motion.h1>
                      </div>

                      <div className={`w-48 h-[1px] relative overflow-hidden rounded-full mt-4 ${
                        theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'
                      }`}>
                        <motion.div
                          initial={{ left: "-100%" }}
                          animate={{ left: "100%" }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                          className="absolute inset-0 bg-accent w-1/2"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <StaffRedirector role={role} currentPath={currentPath} navigateTo={navigateTo} loading={loading} />
                {!["/kitchen", "/server"].includes(currentPath) && (
                  <Navbar 
                    onToggleDashboard={() => {
                      if (currentPath === "/admin") {
                        navigateTo("/");
                      } else {
                        navigateTo("/admin");
                      }
                    }} 
                    isDashboard={currentPath === "/admin"} 
                    onOpenCart={() => setIsCartOpen(true)}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onOpenReservation={() => setIsReservationOpen(true)}
                  />
                )}
                <main>
                  {currentPath === "/admin" && role !== "client" ? (
                    <div className="min-h-screen pt-20 bg-background animate-fade-in">
                      <StaffDashboard menuItems={menuItems} setMenuItems={setMenuItems} />
                    </div>
                  ) : currentPath === "/kitchen" && role === "kitchen" ? (
                    <div className="min-h-screen bg-zinc-950 text-zinc-50 animate-fade-in">
                      <KitchenDashboard />
                    </div>
                  ) : currentPath === "/server" && role === "server" ? (
                    <div className="min-h-screen bg-background animate-fade-in">
                      <ServerDashboard />
                    </div>
                  ) : (
                    <>
                      <Hero onOpenReservation={() => setIsReservationOpen(true)} />
                      <MenuSection items={menuItems} onOpenImmersiveMenu={() => setIsImmersiveMenuOpen(true)} />
                      <Philosophy />
                      
                      {/* Reservation CTA Section */}
                      <section id="réservations" className="py-32 bg-background">
                        <div className="container mx-auto px-10">
                          <div className="bg-muted rounded-[28px] p-12 md:p-20 text-center text-foreground relative overflow-hidden apple-shadow">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              className="relative z-10 max-w-3xl mx-auto"
                            >
                              <h2 className="text-hero font-sans font-semibold mb-8 text-foreground">Réservez votre table</h2>
                              <p className="text-muted-foreground text-description font-normal mb-16">
                                Pour garantir une expérience optimale, nous vous conseillons de réserver à l'avance. 
                                Nous acceptons les réservations jusqu'à 30 jours à l'avance.
                              </p>
                              
                              <ReservationForm />
                            </motion.div>
                          </div>
                        </div>
                      </section>
                    </>
                  )}
                </main>
                {!["/admin", "/kitchen", "/server"].includes(currentPath) && <Footer />}
                <CartSheet 
                  isOpen={isCartOpen && !["/admin", "/kitchen", "/server"].includes(currentPath)} 
                  onClose={() => setIsCartOpen(false)} 
                  onAuthRequired={() => {
                    setIsCartOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                />
                <AuthModal 
                  isOpen={isAuthModalOpen} 
                  onClose={() => setIsAuthModalOpen(false)}
                  onAuthSuccess={() => {
                    const model = pb.authStore.model;
                    const isStaffOrAdmin = model?.role === "admin" || model?.role === "kitchen" || model?.role === "server" || model?.email === "adminuser@mail.com";
                    if (!isStaffOrAdmin) {
                      setIsCartOpen(true);
                    }
                  }}
                />
                
                <ImmersiveMenu 
                  isOpen={isImmersiveMenuOpen}
                  onClose={() => setIsImmersiveMenuOpen(false)}
                  items={menuItems}
                />
                
                <ImmersiveReservation 
                  isOpen={isReservationOpen}
                  onClose={() => setIsReservationOpen(false)}
                />
              </div>
            );
          }}
        </AuthContext.Consumer>
      </CartProvider>
    </FirebaseProvider>
  );
}
