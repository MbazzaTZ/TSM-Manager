import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import SearchResultCard from "@/components/SearchResultCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRealtimeAlerts } from "@/hooks/useRealtime";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useLanguage();
  
  useRealtimeAlerts();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setNotFound(false);
    setSearchResult(null);

    const { data } = await supabase
      .from("inventory")
      .select(`*, regions(name), teams:assigned_to_team_id(name)`)
      .or(`smartcard.eq.${searchQuery.trim()},serial_number.eq.${searchQuery.trim()}`)
      .maybeSingle();

    if (data) {
      // Get sale info if sold
      let saleInfo = null;
      if (data.status === "sold") {
        const { data: sale } = await supabase.from("sales").select("*").eq("inventory_id", data.id).maybeSingle();
        saleInfo = sale;
      }
      setSearchResult({ ...data, sale: saleInfo });
    } else {
      setNotFound(true);
    }
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 animate-slide-up">
            <div className="flex justify-center mb-6"><Logo size="lg" /></div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("search.title")}</h1>
            <p className="text-muted-foreground text-lg">{t("search.subtitle")}</p>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <Button variant="outline" size="lg" onClick={() => window.location.href = "/login?role=dsr"}>
              DSR Login
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.href = "/login?role=tl"}>
              TL Login
            </Button>
          </div>

          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input variant="search" placeholder={t("search.placeholder")}" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-14 pr-4" />
            </div>
            <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching} className="w-full" size="xl">
              {isSearching ? <><Sparkles className="w-5 h-5 animate-spin" />{t("search.searching")}</> : <><Search className="w-5 h-5" />{t("search.button")}</>}
            </Button>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono bg-secondary/50 px-3 py-1 rounded-lg">Smartcard: 8221234567</span>
              <span className="font-mono bg-secondary/50 px-3 py-1 rounded-lg">Serial: S-0A123456789</span>
            </div>
          </div>

          <div className="mt-10">
            {searchResult && <SearchResultCard result={searchResult} />}
            {notFound && (
              <div className="glass rounded-2xl p-8 text-center animate-slide-up">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Search className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-lg text-muted-foreground">{t("search.notFound")}</p>
                <p className="text-sm text-muted-foreground mt-2">{t("search.checkNumber")}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
