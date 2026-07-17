import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import TrackOrder from "./pages/TrackOrder";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import StaffAccept from "./pages/StaffAccept";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import Branches from "./pages/Branches";
import Loyalty from "./pages/Loyalty";
import Notifications from "./pages/Notifications";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./contexts/CartContext";
import { PizzaCustomizerProvider } from "./contexts/PizzaCustomizerContext";
import { BranchProvider } from "./contexts/BranchContext";
import { MenuCatalogProvider } from "./contexts/MenuCatalogContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu" component={Menu} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/branches" component={Branches} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-success/:orderNumber" component={OrderSuccess} />
      <Route path="/track/:orderNumber" component={TrackOrder} />
      <Route path="/track" component={TrackOrder} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/staff/accept" component={StaffAccept} />
      <Route path="/account" component={Account} />
      <Route path="/orders" component={Orders} />
      <Route path="/loyalty" component={Loyalty} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <CartProvider>
              <MenuCatalogProvider>
              <BranchProvider>
                <PizzaCustomizerProvider>
                  <Navbar />
                  <ScrollToTop />
                  <main className="min-h-screen pt-[72px]">
                    <Router />
                  </main>
                  <Footer />
                  <CartDrawer />
                </PizzaCustomizerProvider>
              </BranchProvider>
              </MenuCatalogProvider>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
