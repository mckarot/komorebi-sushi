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
  ClipboardList
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
        const isDefaultAdmin = model.email === "madadev97200@gmail.com";
        
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

// --- Components ---

const Navbar = ({ onToggleDashboard, isDashboard, onOpenCart }: { onToggleDashboard: () => void, isDashboard: boolean, onOpenCart: () => void }) => {
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled || isDashboard ? "py-2 glass shadow-sm" : "py-4 bg-transparent border-b border-transparent"}`}>
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
                  href={`#${item.toLowerCase()}`} 
                  className="hover:opacity-100 opacity-80 transition-opacity"
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
              onClick={signInWithGoogle}
              className="rounded-full px-5 h-8 text-[12px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
            >
              Connexion
            </Button>
          )}
        </div>

        <div className="md:hidden">
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
                  <a key={item} href={`#${item.toLowerCase()}`} className="hover:pl-2 transition-all">
                    {item}
                  </a>
                ))}
                <Button className="w-full rounded-full mt-4">Réserver une table</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden bg-background pt-20">
      <div className="flex-1 flex flex-col justify-center px-10 md:px-20 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block text-[14px] font-semibold tracking-[0.1em] uppercase text-accent mb-4">
            Nouvelle Saison
          </span>
          <h1 className="text-hero font-sans font-semibold mb-6 text-foreground">
            L'art de l'essentiel <br /> dans chaque grain.
          </h1>
          <p className="text-description font-normal text-muted-foreground max-w-md mb-10">
            Une fusion entre tradition millénaire japonaise et pureté contemporaine. Découvrez le sushi réinventé.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Button size="lg" className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 text-[14px] font-medium">
              Réserver une table
            </Button>
            <Button variant="link" className="text-[#0066cc] p-0 h-auto text-[14px] font-normal hover:no-underline">
              Découvrir le menu &rsaquo;
            </Button>
          </div>

          <div className="hidden lg:flex gap-10 mt-24">
            <div className="text-[12px] text-muted-foreground">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Adresse</strong>
              12 Rue de la Paix, Paris
            </div>
            <div className="text-[12px] text-muted-foreground">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Horaires</strong>
              12:00 — 22:30
            </div>
            <div className="text-[12px] text-muted-foreground">
              <strong className="text-foreground block mb-1 uppercase tracking-wider">Contact</strong>
              +33 1 23 45 67 89
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="flex-1 bg-muted flex items-center justify-center p-10 md:p-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="w-full max-w-[400px] aspect-[4/5] bg-background rounded-[28px] apple-shadow p-10 flex flex-col items-center text-center"
        >
          <div className="w-full aspect-square bg-gradient-to-br from-[#e8e8ed] to-[#d2d2d7] rounded-full mb-10 flex items-center justify-center overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1583623025817-d180a2221d0a?q=80&w=800&auto=format&fit=crop" 
              alt="Signature Nigiri" 
              className="w-3/4 h-3/4 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-[24px] font-semibold mb-2">Sake Nigiri</h2>
          <p className="text-[17px] text-muted-foreground">Saumon frais, wasabi, riz Koshihikari</p>
          <div className="mt-6 text-accent font-medium text-[14px]">
            Pièce d'exception
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const MenuSection = ({ items }: { items: MenuItem[] }) => {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const { addToCart } = useCart();

  const filteredItems = activeCategory === "Tous" 
    ? items 
    : items.filter(item => item.category === activeCategory);

  return (
    <section id="menu" className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 tracking-tight text-foreground">Notre Carte</h2>
            <p className="text-muted-foreground text-lg font-light">
              Nous sélectionnons les meilleurs produits de saison pour vous offrir une fraîcheur inégalée. 
              Nos poissons sont issus d'une pêche durable et responsable.
            </p>
          </div>
          
          <Tabs defaultValue="Tous" className="w-full md:w-auto" onValueChange={setActiveCategory}>
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 space-x-8">
              {CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-0 py-4 text-sm font-medium transition-all"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="group border-none apple-shadow overflow-hidden bg-background rounded-[28px] h-full flex flex-col">
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
                        className="w-full rounded-full bg-muted text-foreground hover:bg-foreground hover:text-background transition-all"
                      >
                        Ajouter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-20 text-center">
          <Button variant="link" className="group text-base font-medium">
            Voir la carte complète <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const Philosophy = () => {
  return (
    <section id="philosophie" className="py-32 bg-[#fafafa]">
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
              className="absolute -bottom-10 -right-10 hidden md:block w-64 h-64 rounded-2xl overflow-hidden border-[12px] border-white shadow-xl"
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

const StaffDashboard = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'reservations' | 'orders'>('orders');

  useEffect(() => {
    let unsubRes = () => {};
    let unsubOrders = () => {};

    const loadData = async () => {
      try {
        const resList = await pb.collection("reservations").getFullList({ sort: "-created" });
        setReservations(resList);

        const ordersList = await pb.collection("orders").getFullList({ sort: "-created" });
        setOrders(ordersList);
        setLoading(false);

        unsubRes = await pb.collection("reservations").subscribe("*", (e) => {
          setReservations(prev => {
            if (e.action === "create") return [e.record, ...prev];
            if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
            if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
            return prev;
          });
        });

        unsubOrders = await pb.collection("orders").subscribe("*", (e) => {
          setOrders(prev => {
            if (e.action === "create") return [e.record, ...prev];
            if (e.action === "update") return prev.map(item => item.id === e.record.id ? e.record : item);
            if (e.action === "delete") return prev.filter(item => item.id !== e.record.id);
            return prev;
          });
        });
      } catch (err) {
        console.error("Error loading data from PocketBase:", err);
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
    return <div className="p-20 text-center">Chargement...</div>;
  }

  return (
    <div className="p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
        <div>
          <h2 className="text-4xl font-sans font-semibold mb-2">Centre de Contrôle</h2>
          <p className="text-muted-foreground">Gérez vos commandes et vos réservations en temps réel.</p>
        </div>
        
        <div className="flex bg-muted p-1 rounded-full">
          <button 
            onClick={() => setView('orders')}
            className={`px-6 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${view === 'orders' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Commandes ({orders.length})
          </button>
          <button 
            onClick={() => setView('reservations')}
            className={`px-6 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${view === 'reservations' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Réservations ({reservations.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {view === 'orders' ? (
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
                      order.status === 'ready' ? "bg-green-100 text-green-700" :
                      order.status === 'cancelled' ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
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

                  <Separator className="my-6" />

                  <div className="flex justify-between items-center font-semibold text-[16px]">
                    <span>Total</span>
                    <span className="text-accent">{order.total}€</span>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 justify-end">
                  {['preparing', 'ready', 'completed'].map((s) => (
                    <Button 
                      key={s}
                      variant={order.status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, s)}
                      className="rounded-full h-10 px-6 text-[12px] uppercase tracking-wider"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
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
                    res.status === 'confirmed' ? "bg-green-100 text-green-700" :
                    res.status === 'cancelled' ? "bg-red-100 text-red-700" :
                    "bg-orange-100 text-orange-700"
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
                  className="rounded-full"
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
        )}
      </div>
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

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoadingMenu(true);
        setMenuError(null);
        const list = await pb.collection("dishes").getFullList({ sort: "name" });
        console.log("Dishes fetched from PocketBase:", list);
        setMenuItems(list as unknown as MenuItem[]);
      } catch (err) {
        console.error("Error fetching dishes from PocketBase:", err);
        setMenuError("Impossible de charger le menu. Vérifiez que PocketBase est bien lancé.");
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
          {({ role }) => (
            <div className="min-h-screen font-sans selection:bg-black selection:text-white">
              <Navbar 
                onToggleDashboard={() => setShowDashboard(!showDashboard)} 
                isDashboard={showDashboard} 
                onOpenCart={() => setIsCartOpen(true)}
              />
              <main>
                {showDashboard && role !== "client" ? (
                  <StaffDashboard />
                ) : (
                  <>
                    <Hero />
                    <MenuSection items={menuItems} />
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
              <Footer />
              <CartSheet 
                isOpen={isCartOpen} 
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
                  setIsCartOpen(true);
                }}
              />
            </div>
          )}
        </AuthContext.Consumer>
      </CartProvider>
    </FirebaseProvider>
  );
}
