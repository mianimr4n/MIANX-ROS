/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Contact page updated with multi-branch support and both locations on map. */
import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Clock, Instagram, Facebook, MessageCircle, Navigation, Construction } from "lucide-react";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { useBranch, branches } from "@/contexts/BranchContext";

export default function Contact() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { selectedBranch } = useBranch();

  useEffect(() => {
    if (mapRef.current) {
      // Add markers for ALL branches
      branches.forEach((branch) => {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: branch.coordinates,
          title: `${branch.name} - ${branch.phone}`,
        });

        // Click to open Google Maps directions
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: 'Poppins', sans-serif;">
              <h3 style="font-weight: 700; margin: 0 0 4px 0; color: #D22630;">${branch.name}</h3>
              <p style="margin: 0; font-size: 13px; color: #333;">${branch.address}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${branch.phone}</p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${branch.coordinates.lat},${branch.coordinates.lng}" target="_blank" style="color: #D22630; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 4px;">Get Directions</a>
            </div>
          `,
        });

        marker.addListener("gmp-click", () => {
          infoWindow.open({
            map: mapRef.current,
            anchor: marker,
          });
        });
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src="/manus-storage/deals-section_ee7752d9.jpg"
          alt="Contact"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/95 via-brand-charcoal/60 to-brand-charcoal/30" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="font-[var(--font-display)] font-extrabold text-4xl md:text-5xl tracking-tight"
          >
            Get In Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4 text-lg text-white/80 font-[var(--font-body)]"
          >
            Order now or visit us — we'd love to serve you
          </motion.p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Operating branches */}
          {branches.filter((b) => b.status === "operating").map((branch, i) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`bg-white p-6 rounded-2xl border-2 text-center hover:shadow-xl transition-all duration-300 ${
                selectedBranch.id === branch.id
                  ? "border-brand-red shadow-xl shadow-brand-red/10"
                  : "border-border hover:border-brand-red/30"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                selectedBranch.id === branch.id ? "bg-brand-red" : "bg-brand-red/10"
              }`}>
                <MapPin className={`w-7 h-7 ${selectedBranch.id === branch.id ? "text-white" : "text-brand-red"}`} />
              </div>
              <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
                {branch.name}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {branch.address}
              </p>
              <a
                href={`tel:+92${branch.phone.replace(/-/g, "").replace(/^0/, "")}`}
                className="text-brand-red font-[var(--font-accent)] font-bold text-base hover:underline"
              >
                {branch.phone}
              </a>
              <p className="text-muted-foreground text-xs mt-2">{branch.hours}</p>
              {selectedBranch.id === branch.id && (
                <div className="mt-3 text-brand-red text-xs font-[var(--font-accent)] font-semibold">
                  Your selected branch
                </div>
              )}
            </motion.div>
          ))}

          {/* Hours Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-2xl border border-border text-center hover:shadow-xl hover:shadow-brand-red/5 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-brand-gold" />
            </div>
            <h3 className="font-[var(--font-display)] font-bold text-lg text-brand-charcoal mb-2">
              Opening Hours
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Monday – Sunday<br />
              <span className="font-[var(--font-accent)] font-bold text-brand-charcoal">
                10:00 AM – 2:30 AM
              </span>
            </p>
            <p className="text-brand-red text-xs mt-2 font-[var(--font-accent)] font-semibold">
              We deliver late night!
            </p>
          </motion.div>
        </div>

        {/* Google Maps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-[var(--font-display)] font-bold text-2xl text-brand-charcoal">
                Find Us on the Map
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Both our Multan branches — click a marker for directions
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.coordinates.lat},${selectedBranch.coordinates.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-accent)] font-semibold shadow-md shadow-brand-red/20 transition-all active:scale-95">
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </a>
          </div>

          {/* Map Container */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl shadow-brand-red/5">
            <MapView
              initialCenter={{ lat: 30.1854, lng: 71.4810 }}
              initialZoom={13}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
            />

            {/* Overlay with selected branch info */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-xs border border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-[var(--font-accent)] font-bold text-sm text-brand-charcoal">
                    {selectedBranch.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBranch.address}
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.coordinates.lat},${selectedBranch.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-red text-xs font-[var(--font-accent)] font-semibold mt-1 inline-flex items-center hover:underline"
                  >
                    Get Directions
                    <Navigation className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Social & CTA */}
      <section className="bg-brand-charcoal py-16">
        <div className="container text-center">
          <h2 className="font-[var(--font-display)] font-bold text-2xl text-white mb-4">
            Follow Us For Hot Deals
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            Stay updated with our latest menu items, deals, and behind-the-scenes content
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/telepizza.pk/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-brand-red transition-all duration-200 hover:scale-110"
            >
              <Facebook className="w-5 h-5 text-white" />
            </a>
            <a
              href="https://www.instagram.com/telepizzapakistan/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-brand-red transition-all duration-200 hover:scale-110"
            >
              <Instagram className="w-5 h-5 text-white" />
            </a>
            <a
              href="https://www.tiktok.com/@telepizzapakistan"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center hover:bg-brand-red transition-all duration-200 hover:scale-110"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
