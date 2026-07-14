import { motion } from "framer-motion";
import { Clock, Construction, MapPin, Navigation, Phone } from "lucide-react";
import { Link } from "wouter";
import { useBranch } from "@/contexts/BranchContext";
import { Button } from "@/components/ui/button";

export default function Branches() {
  const { selectedBranch, setSelectedBranch, allBranches } = useBranch();
  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      let nearest = operatingBranches[0];
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const branch of operatingBranches) {
        const dLat = branch.coordinates.lat - position.coords.latitude;
        const dLng = branch.coordinates.lng - position.coords.longitude;
        const distance = dLat * dLat + dLng * dLng;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = branch;
        }
      }

      if (nearest) {
        setSelectedBranch(nearest);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="brand-heading text-3xl md:text-4xl">Store Locator</h1>
            <p className="text-muted-foreground mt-2">Find your nearest Telepizza branch in Multan.</p>
          </div>
          <Button onClick={handleUseLocation} variant="outline" className="rounded-2xl">
            <Navigation className="w-4 h-4 mr-2" />
            Use my location
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {operatingBranches.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-3xl border-2 p-6 ${
                selectedBranch.id === branch.id
                  ? "border-brand-red bg-brand-red/5 shadow-lg shadow-brand-red/10"
                  : "border-border bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${selectedBranch.id === branch.id ? "brand-gradient" : "bg-brand-red/10"}`}>
                  <MapPin className={`w-5 h-5 ${selectedBranch.id === branch.id ? "text-white" : "text-brand-red"}`} />
                </div>
                <div className="flex-1">
                  <h2 className="font-[var(--font-display)] font-bold text-lg">{branch.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4 text-brand-gold" />{branch.phone}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-brand-gold" />{branch.hours}</span>
                  </div>
                  <Button
                    onClick={() => setSelectedBranch(branch)}
                    size="sm"
                    className="mt-4 rounded-2xl"
                    variant={selectedBranch.id === branch.id ? "default" : "outline"}
                  >
                    {selectedBranch.id === branch.id ? "Selected branch" : "Select branch"}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {comingSoonBranches.map((branch) => (
            <div key={branch.id} className="rounded-3xl border-2 border-dashed border-border bg-white/70 p-6">
              <div className="flex items-start gap-3 opacity-80">
                <div className="w-11 h-11 rounded-2xl bg-brand-cream-dark flex items-center justify-center">
                  <Construction className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] font-bold text-lg">{branch.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
                  <span className="inline-flex mt-3 text-xs font-bold text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/contact">
          <Button className="rounded-2xl brand-gradient text-white font-bold">View map & contact</Button>
        </Link>
      </div>
    </div>
  );
}
