import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "sw" | "en";

interface Translations {
  [key: string]: {
    sw: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  "nav.search": { sw: "Tafuta", en: "Search" },
  "nav.dashboard": { sw: "Dashboard", en: "Dashboard" },
  "nav.adminLogin": { sw: "Ingia Admin", en: "Admin Login" },
  "nav.logout": { sw: "Ondoka", en: "Logout" },
  
  // Search Page
  "search.title": { sw: "Tafuta Stock Yako", en: "Find Your Stock" },
  "search.subtitle": { sw: "Ingiza smartcard au serial number kupata taarifa", en: "Enter smartcard or serial number to get information" },
  "search.placeholder": { sw: "Tafuta Smartcard au Serial Number...", en: "Search Smartcard or Serial Number..." },
  "search.button": { sw: "Tafuta", en: "Search" },
  "search.searching": { sw: "Inatafuta...", en: "Searching..." },
  "search.notFound": { sw: "Sorry, namba hii haipo kwenye stock yetu.", en: "Sorry, this number is not in our stock." },
  "search.checkNumber": { sw: "Hakikisha umeingiza namba sahihi.", en: "Please check you entered the correct number." },
  
  // Status
  "status.sold": { sw: "Imeuzwa", en: "Sold" },
  "status.inHand": { sw: "Bado Mikononi", en: "In Hand" },
  "status.available": { sw: "Inapatikana", en: "Available" },
  "status.inStore": { sw: "Dukani", en: "In Store" },
  "status.paid": { sw: "Imelipiwa", en: "Paid" },
  "status.unpaid": { sw: "Bado", en: "Pending" },
  "status.hasPackage": { sw: "Ina Kifurushi ✓", en: "Has Package ✓" },
  "status.noPackage": { sw: "Haina Kifurushi", en: "No Package" },
  
  // Stock Types
  "stock.fullSet": { sw: "Full Set", en: "Full Set" },
  "stock.decoderOnly": { sw: "Decoder Pekee", en: "Decoder Only" },
  
  // Dashboard
  "dashboard.title": { sw: "Dashboard ya Umma", en: "Public Dashboard" },
  "dashboard.subtitle": { sw: "Takwimu za mauzo na stock kwa wakati halisi", en: "Real-time sales and stock statistics" },
  "dashboard.available": { sw: "Inapatikana", en: "Available" },
  "dashboard.sold": { sw: "Imeuzwa", en: "Sold" },
  "dashboard.inHand": { sw: "Mikononi", en: "In Hand" },
  "dashboard.unpaid": { sw: "Hajakulipwa", en: "Not Paid" },
  "dashboard.allStock": { sw: "Stock yote", en: "All stock" },
  "dashboard.thisMonth": { sw: "Mwezi huu", en: "This month" },
  "dashboard.forDSRs": { sw: "Kwa DSRs", en: "For DSRs" },
  "dashboard.needsFollowup": { sw: "Inahitaji ufuatiliaji", en: "Needs follow-up" },
  "dashboard.leaderboard": { sw: "Viongozi wa Timu - Mwezi Huu", en: "Team Leaders - This Month" },
  "dashboard.sales": { sw: "mauzo", en: "sales" },
  "dashboard.realtime": { sw: "Takwimu za wakati halisi", en: "Real-time statistics" },
  
  // Login
  "login.title": { sw: "Karibu Tena", en: "Welcome Back" },
  "login.subtitle": { sw: "Ingia kwenye akaunti yako", en: "Sign in to your account" },
  "login.email": { sw: "Barua Pepe", en: "Email" },
  "login.password": { sw: "Neno la Siri", en: "Password" },
  "login.button": { sw: "Ingia", en: "Sign In" },
  "login.loading": { sw: "Inaendelea...", en: "Loading..." },
  "login.forgotPassword": { sw: "Umesahau neno la siri?", en: "Forgot password?" },
  "login.resetHere": { sw: "Badilisha hapa", en: "Reset here" },
  "login.backHome": { sw: "Rudi Nyumbani", en: "Back Home" },
  "login.info": { sw: "Akaunti za Admin, TL, na DSR zinaweza kuingia hapa", en: "Admin, TL, and DSR accounts can sign in here" },
  
  // Admin Dashboard
  "admin.dashboard": { sw: "Admin Dashboard", en: "Admin Dashboard" },
  "admin.overview": { sw: "Muhtasari", en: "Overview" },
  "admin.inventory": { sw: "Hesabu ya Stock", en: "Inventory" },
  "admin.teams": { sw: "Timu", en: "Teams" },
  "admin.users": { sw: "Watumiaji", en: "Users" },
  "admin.assignments": { sw: "Ugawaji", en: "Assignments" },
  "admin.unpaidRecovery": { sw: "Malipo Hayajalipwa", en: "Unpaid Recovery" },
  "admin.reports": { sw: "Ripoti", en: "Reports" },
  "admin.settings": { sw: "Mipangilio", en: "Settings" },
  
  // Actions
  "action.save": { sw: "Hifadhi", en: "Save" },
  "action.cancel": { sw: "Ghairi", en: "Cancel" },
  "action.delete": { sw: "Futa", en: "Delete" },
  "action.edit": { sw: "Hariri", en: "Edit" },
  "action.add": { sw: "Ongeza", en: "Add" },
  "action.upload": { sw: "Pakia", en: "Upload" },
  "action.export": { sw: "Hamisha", en: "Export" },
  "action.assign": { sw: "Gawa", en: "Assign" },
  "action.markAsPaid": { sw: "Weka Amelipa", en: "Mark as Paid" },
  "action.markAsSold": { sw: "Weka Imeuzwa", en: "Mark as Sold" },
  
  // Alerts
  "alert.newSale": { sw: "MAUZO MAPYA!", en: "NEW SALE!" },
  "alert.paymentReceived": { sw: "MALIPO Yamepokelewa!", en: "PAYMENT Received!" },
  "alert.packageUpdate": { sw: "PACKAGE UPDATE", en: "PACKAGE UPDATE" },
  
  // Common
  "common.loading": { sw: "Inapakia...", en: "Loading..." },
  "common.error": { sw: "Kosa limetokea", en: "An error occurred" },
  "common.success": { sw: "Imefanikiwa", en: "Success" },
  "common.by": { sw: "na", en: "by" },
  "common.tl": { sw: "TL", en: "TL" },
  "common.dsr": { sw: "DSR", en: "DSR" },
  "common.region": { sw: "Mkoa", en: "Region" },
  "common.team": { sw: "Timu", en: "Team" },
  "common.payment": { sw: "Malipo", en: "Payment" },
  
  // Footer
  "footer.rights": { sw: "Haki zote zimehifadhiwa", en: "All rights reserved" },
  "footer.madeWith": { sw: "Imetengenezwa kwa", en: "Made with" },
  "footer.forTanzania": { sw: "kwa Tanzania", en: "for Tanzania" },
  "footer.developedBy": { sw: "Developed by David Mbazza", en: "Developed by David Mbazza" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const fallbackLanguageContext: LanguageContextType = {
  language: "sw",
  setLanguage: (lang: Language) => {
    console.warn(`LanguageProvider missing. Unable to set language to ${lang}.`);
  },
  t: (key: string) => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation.sw;
  },
};

const LanguageContext = createContext<LanguageContextType>(fallbackLanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("tsm-language");
    return (saved as Language) || "sw";
  });

  useEffect(() => {
    localStorage.setItem("tsm-language", language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
