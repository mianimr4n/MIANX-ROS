import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ProductDetail from "./pages/ProductDetail";
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
import Welcome from "./pages/Welcome";
import StaffAccept from "./pages/StaffAccept";
import StaffLogin from "./pages/StaffLogin";
import Account from "./pages/Account";
import MyTelepizza from "./pages/MyTelepizza";
import Orders from "./pages/Orders";
import Favorites from "./pages/Favorites";
import Settings from "./pages/Settings";
import Branches from "./pages/Branches";
import Loyalty from "./pages/Loyalty";
import Notifications from "./pages/Notifications";
import OpsDashboard from "./pages/ops/OpsDashboard";
import OpsOrders from "./pages/ops/OpsOrders";
import OpsKitchen from "./pages/ops/OpsKitchen";
import OpsDispatch from "./pages/ops/OpsDispatch";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminIndexRedirect from "./pages/admin/AdminIndexRedirect";
import AdminUnauthorized from "./pages/admin/AdminUnauthorized";
import AdminComingSoon from "./pages/admin/AdminComingSoon";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminBranchProvider } from "./contexts/AdminBranchContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./contexts/CartContext";
import { PizzaCustomizerProvider } from "./contexts/PizzaCustomizerContext";
import { BranchProvider } from "./contexts/BranchContext";
import { MenuCatalogProvider } from "./contexts/MenuCatalogContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Commit B — Admin Foundation routing layer.
 * Business modules (Owner ERP / Branch Manager / Kitchen Manager) are placeholders
 * until later controlled commits wire real page imports.
 */

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function isOpsChrome(path: string) {
  return path === "/staff/login" || path.startsWith("/ops") || path.startsWith("/admin");
}

function DashboardComingSoon() {
  return <AdminComingSoon moduleName="Executive dashboard" />;
}
function OrdersComingSoon() {
  return <AdminComingSoon moduleName="Orders" />;
}
function BranchManagerComingSoon() {
  return <AdminComingSoon moduleName="Branch Manager" />;
}
function KitchenManagerComingSoon() {
  return <AdminComingSoon moduleName="Kitchen Manager KDS" />;
}
function KitchenComingSoon() {
  return <AdminComingSoon moduleName="Kitchen" />;
}
function DeliveryComingSoon() {
  return <AdminComingSoon moduleName="Delivery" />;
}
function PosComingSoon() {
  return <AdminComingSoon moduleName="POS" />;
}
function WhatsAppComingSoon() {
  return <AdminComingSoon moduleName="WhatsApp Order Center" />;
}
function MenuComingSoon() {
  return <AdminComingSoon moduleName="Menu" />;
}
function InventoryComingSoon() {
  return <AdminComingSoon moduleName="Inventory" />;
}
function PurchasingComingSoon() {
  return <AdminComingSoon moduleName="Purchasing & Suppliers" />;
}
function PromotionsComingSoon() {
  return <AdminComingSoon moduleName="Promotions" />;
}
function CrmComingSoon() {
  return <AdminComingSoon moduleName="CRM" />;
}
function LoyaltyComingSoon() {
  return <AdminComingSoon moduleName="Loyalty & Rewards" />;
}
function SupportComingSoon() {
  return <AdminComingSoon moduleName="Support" />;
}
function BranchesComingSoon() {
  return <AdminComingSoon moduleName="Branches" />;
}
function HrComingSoon() {
  return <AdminComingSoon moduleName="HR & Workforce" />;
}
function FinanceComingSoon() {
  return <AdminComingSoon moduleName="Finance" />;
}
function ReportsComingSoon() {
  return <AdminComingSoon moduleName="Reports" />;
}
function AiComingSoon() {
  return <AdminComingSoon moduleName="AI Command Center" />;
}
function IntegrationsComingSoon() {
  return <AdminComingSoon moduleName="Integrations" />;
}
function SettingsComingSoon() {
  return <AdminComingSoon moduleName="Settings" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/menu/:productId" component={ProductDetail} />
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
      <Route path="/welcome" component={Welcome} />
      <Route path="/staff/accept" component={StaffAccept} />
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/ops/orders" component={OpsOrders} />
      <Route path="/ops/kitchen" component={OpsKitchen} />
      <Route path="/ops/dispatch" component={OpsDispatch} />
      <Route path="/ops" component={OpsDashboard} />
      {/* Admin Foundation — real pages */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/unauthorized" component={AdminUnauthorized} />
      {/* Future role / module surfaces — Coming Soon until Commits C/D/E */}
      <Route path="/admin/dashboard" component={DashboardComingSoon} />
      <Route path="/admin/orders/:orderId" component={OrdersComingSoon} />
      <Route path="/admin/orders" component={OrdersComingSoon} />
      <Route path="/admin/branch" component={BranchManagerComingSoon} />
      <Route path="/admin/kitchen-dashboard" component={KitchenManagerComingSoon} />
      <Route path="/admin/kitchen" component={KitchenComingSoon} />
      <Route path="/admin/delivery" component={DeliveryComingSoon} />
      <Route path="/admin/pos" component={PosComingSoon} />
      <Route path="/admin/whatsapp" component={WhatsAppComingSoon} />
      <Route path="/admin/menu" component={MenuComingSoon} />
      <Route path="/admin/inventory" component={InventoryComingSoon} />
      <Route path="/admin/purchasing" component={PurchasingComingSoon} />
      <Route path="/admin/promotions" component={PromotionsComingSoon} />
      <Route path="/admin/crm" component={CrmComingSoon} />
      <Route path="/admin/customers" component={CrmComingSoon} />
      <Route path="/admin/loyalty" component={LoyaltyComingSoon} />
      <Route path="/admin/support" component={SupportComingSoon} />
      <Route path="/admin/branches" component={BranchesComingSoon} />
      <Route path="/admin/hr" component={HrComingSoon} />
      <Route path="/admin/staff" component={HrComingSoon} />
      <Route path="/admin/finance" component={FinanceComingSoon} />
      <Route path="/admin/reports" component={ReportsComingSoon} />
      <Route path="/admin/ai-command-center" component={AiComingSoon} />
      <Route path="/admin/integrations" component={IntegrationsComingSoon} />
      <Route path="/admin/settings" component={SettingsComingSoon} />
      <Route path="/admin" component={AdminIndexRedirect} />
      <Route path="/my-telepizza/orders" component={MyTelepizza} />
      <Route path="/my-telepizza/addresses" component={MyTelepizza} />
      <Route path="/my-telepizza/rewards" component={MyTelepizza} />
      <Route path="/my-telepizza/account/profile" component={MyTelepizza} />
      <Route path="/my-telepizza/account/security" component={MyTelepizza} />
      <Route path="/my-telepizza/account/notifications" component={MyTelepizza} />
      <Route path="/my-telepizza/account" component={MyTelepizza} />
      <Route path="/my-telepizza/favorites" component={Favorites} />
      <Route path="/my-telepizza" component={MyTelepizza} />
      <Route path="/account" component={Account} />
      <Route path="/orders" component={Orders} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/settings" component={Settings} />
      <Route path="/loyalty" component={Loyalty} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [location] = useLocation();
  const ops = isOpsChrome(location);

  return (
    <>
      {!ops ? <Navbar /> : null}
      <ScrollToTop />
      <main className={ops ? "min-h-screen" : "min-h-screen pt-[72px]"}>
        <Router />
      </main>
      {!ops ? (
        <>
          <Footer />
          <CartDrawer />
        </>
      ) : null}
    </>
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
                  <AdminBranchProvider>
                    <PizzaCustomizerProvider>
                      <AppShell />
                    </PizzaCustomizerProvider>
                  </AdminBranchProvider>
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
