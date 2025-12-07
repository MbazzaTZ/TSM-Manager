import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "sw" ? "en" : "sw")}
      className="gap-2"
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{language === "sw" ? "EN" : "SW"}</span>
    </Button>
  );
};

export default LanguageSwitcher;
