import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="glass border-t border-border/50 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 TSM Territory Manager. {t("footer.rights")}.
          </p>
          <p className="text-sm text-muted-foreground">
            {t("footer.developedBy")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
