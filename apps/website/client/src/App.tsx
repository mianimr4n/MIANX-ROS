import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";
import { ThemeProvider } from "./contexts/ThemeContext";

/** Eager: public marketing + checkout path (first paint / conversion). */
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
import Branches from "./pages/Branches";
import PublicBooking from "./pages/PublicBooking";
import NotFound from "./pages/NotFound";
import StaffLogin from "./pages/StaffLogin";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminUnauthorized from "./pages/admin/AdminUnauthorized";
import AdminIndexRedirect from "./pages/admin/AdminIndexRedirect";

/** Lazy: staff / account / ops / supplier — keep out of customer first paint. */
const StaffAccept = lazy(() => import("./pages/StaffAccept"));
const SupplierLogin = lazy(() => import("./pages/supplier/SupplierLogin"));
const SupplierDashboard = lazy(() => import("./pages/supplier/SupplierDashboard"));
const SupplierPurchaseOrders = lazy(() => import("./pages/supplier/SupplierPurchaseOrders"));
const SupplierPurchaseOrderDetail = lazy(() => import("./pages/supplier/SupplierPurchaseOrderDetail"));
const SupplierDocuments = lazy(() => import("./pages/supplier/SupplierDocuments"));
const SupplierProfilePage = lazy(() => import("./pages/supplier/SupplierProfilePage"));
const AdminSupplierOperations = lazy(() => import("./pages/admin/AdminSupplierOperations"));
const Account = lazy(() => import("./pages/Account"));
const MyTelepizza = lazy(() => import("./pages/MyTelepizza"));
const Orders = lazy(() => import("./pages/Orders"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Settings = lazy(() => import("./pages/Settings"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const Notifications = lazy(() => import("./pages/Notifications"));
const OpsDashboard = lazy(() => import("./pages/ops/OpsDashboard"));
const OpsOrders = lazy(() => import("./pages/ops/OpsOrders"));
const OpsKitchen = lazy(() => import("./pages/ops/OpsKitchen"));
const OpsDispatch = lazy(() => import("./pages/ops/OpsDispatch"));
const AdminComingSoon = lazy(() => import("./pages/admin/AdminComingSoon"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAiTeam = lazy(() => import("./pages/admin/AdminAiTeam"));
const AdminCashierHome = lazy(() => import("./pages/admin/AdminCashierHome"));
const AdminHostHome = lazy(() => import("./pages/admin/AdminHostHome"));
const AdminWaiterHome = lazy(() => import("./pages/admin/AdminWaiterHome"));
const AdminDeliveryHome = lazy(() => import("./pages/admin/AdminDeliveryHome"));
const AdminStaffHome = lazy(() => import("./pages/admin/AdminStaffHome"));
const AdminConfigHome = lazy(() => import("./pages/admin/AdminConfigHome"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminKitchen = lazy(() => import("./pages/admin/AdminKitchen"));
const AdminDelivery = lazy(() => import("./pages/admin/AdminDelivery"));
const AdminPos = lazy(() => import("./pages/admin/AdminPos"));
const AdminCrm = lazy(() => import("./pages/admin/AdminCrm"));
const AdminLoyalty = lazy(() => import("./pages/admin/AdminLoyalty"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminPurchasing = lazy(() => import("./pages/admin/AdminPurchasing"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminHr = lazy(() => import("./pages/admin/AdminHr"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminBranchManager = lazy(() => import("./pages/admin/AdminBranchManager"));
const AdminKitchenDashboard = lazy(() => import("./pages/admin/AdminKitchenDashboard"));
const AdminFloorConsole = lazy(() => import("./pages/admin/AdminFloorConsole"));
const AdminFloorPlan = lazy(() => import("./pages/admin/AdminFloorPlan"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminWaitlist = lazy(() => import("./pages/admin/AdminWaitlist"));

import { AuthProvider } from "./contexts/AuthContext";
import { AdminBranchProvider } from "./contexts/AdminBranchContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import { CartProvider } from "./contexts/CartContext";
import { PizzaCustomizerProvider } from "./contexts/PizzaCustomizerContext";
import { BranchProvider } from "./contexts/BranchContext";
import { MenuCatalogProvider } from "./contexts/MenuCatalogContext";

/**
 * Commit E — Kitchen Manager KDS route wiring on Admin ERP.
 * Branch Manager /admin/branch remains Commit D; Owner /admin/kitchen remains Commit C.
 * RC4-7 — route-level code splitting for staff/account surfaces.
 */

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function isOpsChrome(path: string) {
  return (
    path === "/staff/login" ||
    path.startsWith("/ops") ||
    path.startsWith("/admin") ||
    path.startsWith("/supplier")
  );
}

/** Customer auth surfaces use AuthPageShell — hide marketing navbar/footer for contrast + focus. */
function isCustomerAuthChrome(path: string) {
  return (
    path === "/login" ||
    path === "/register" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/auth/callback" ||
    path === "/welcome"
  );
}

function SupportComingSoon() {
  return <AdminComingSoon moduleName="Support" />;
}
function BranchesComingSoon() {
  return <AdminComingSoon moduleName="Branches" />;
}
function AiComingSoon() {
  return <AdminComingSoon moduleName="AI Command Center" />;
}
function IntegrationsComingSoon() {
  return <AdminComingSoon moduleName="Integrations" />;
}

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback label="Loading page" />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/menu/:productId" component={ProductDetail} />
        <Route path="/menu" component={Menu} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/branches" component={Branches} />
        <Route path="/book/cancel" component={PublicBooking} />
        <Route path="/book" component={PublicBooking} />
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
        <Route path="/supplier/login" component={SupplierLogin} />
        <Route path="/supplier/purchase-orders/:id" component={SupplierPurchaseOrderDetail} />
        <Route path="/supplier/purchase-orders" component={SupplierPurchaseOrders} />
        <Route path="/supplier/documents" component={SupplierDocuments} />
        <Route path="/supplier/profile" component={SupplierProfilePage} />
        <Route path="/supplier" component={SupplierDashboard} />
        <Route path="/ops/orders" component={OpsOrders} />
        <Route path="/ops/kitchen" component={OpsKitchen} />
        <Route path="/ops/dispatch" component={OpsDispatch} />
        <Route path="/ops" component={OpsDashboard} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/unauthorized" component={AdminUnauthorized} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/orders/:orderId" component={AdminOrderDetail} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/kitchen" component={AdminKitchen} />
        <Route path="/admin/delivery" component={AdminDelivery} />
        <Route path="/admin/pos" component={AdminPos} />
        <Route path="/admin/whatsapp" component={AdminWhatsApp} />
        <Route path="/admin/menu" component={AdminMenu} />
        <Route path="/admin/inventory" component={AdminInventory} />
        <Route path="/admin/purchasing" component={AdminPurchasing} />
        <Route path="/admin/supplier-operations" component={AdminSupplierOperations} />
        <Route path="/admin/crm" component={AdminCrm} />
        <Route path="/admin/customers" component={AdminCrm} />
        <Route path="/admin/loyalty" component={AdminLoyalty} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route path="/admin/promotions" component={AdminMarketing} />
        <Route path="/admin/hr" component={AdminHr} />
        <Route path="/admin/staff" component={AdminHr} />
        <Route path="/admin/finance" component={AdminFinance} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/branch" component={AdminBranchManager} />
        <Route path="/admin/kitchen-dashboard" component={AdminKitchenDashboard} />
        <Route path="/admin/home/cashier" component={AdminCashierHome} />
        <Route path="/admin/home/host" component={AdminHostHome} />
        <Route path="/admin/home/waiter" component={AdminWaiterHome} />
        <Route path="/admin/home/delivery" component={AdminDeliveryHome} />
        <Route path="/admin/home/staff" component={AdminStaffHome} />
        <Route path="/admin/home/config" component={AdminConfigHome} />
        <Route path="/admin/floor" component={AdminFloorConsole} />
        <Route path="/admin/floor-plan" component={AdminFloorPlan} />
        <Route path="/admin/reservations" component={AdminReservations} />
        <Route path="/admin/waitlist" component={AdminWaitlist} />
        <Route path="/admin/ai-team" component={AdminAiTeam} />
        <Route path="/admin/support" component={SupportComingSoon} />
        <Route path="/admin/branches" component={BranchesComingSoon} />
        <Route path="/admin/ai-command-center" component={AiComingSoon} />
        <Route path="/admin/integrations" component={IntegrationsComingSoon} />
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
    </Suspense>
  );
}

function AppShell() {
  const [location] = useLocation();
  const pathOnly = location.split(/[?#]/)[0] || location;
  const ops = isOpsChrome(pathOnly);
  const auth = isCustomerAuthChrome(pathOnly);
  const bare = ops || auth;

  return (
    <>
      {!bare ? <Navbar /> : null}
      <ScrollToTop />
      <main className={bare ? "min-h-screen" : "min-h-screen pt-[72px]"}>
        <Router />
      </main>
      {!bare ? (
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
