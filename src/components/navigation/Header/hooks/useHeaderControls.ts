import { useCallback, useState } from "react";
import { useI18n } from "../../../../i18n/i18nStore";
import type { HeaderLanguage } from "../types/header.types";

const useHeaderControls = () => {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isEmployerOpen, setIsEmployerOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const locale = useI18n((s) => s.locale);
  const setLocale = useI18n((s) => s.setLocale);
  const language: HeaderLanguage = locale === "en" ? "EN" : "VI";

  const closeMenus = useCallback(() => {
    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
    setIsMobileOpen(false);
    setIsAccountOpen(false);
  }, []);

  const closeAccount = useCallback(() => setIsAccountOpen(false), []);

  const toggleAccount = () => {
    setIsAccountOpen((current) => !current);
    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
  };

  const changeLanguage = (value: HeaderLanguage) => {
    setLocale(value.toLowerCase() as "vi" | "en");
    setIsLanguageOpen(false);
  };

  const toggleLanguage = () => {
    setIsLanguageOpen((current) => !current);
    setIsEmployerOpen(false);
    setIsAccountOpen(false);
  };

  const toggleEmployer = () => {
    setIsEmployerOpen((current) => !current);
    setIsLanguageOpen(false);
    setIsAccountOpen(false);
  };

  const toggleMobile = () => {
    setIsMobileOpen((current) => !current);
    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
    setIsAccountOpen(false);
  };

  return {
    isLanguageOpen,
    isEmployerOpen,
    isMobileOpen,
    isAccountOpen,
    language,
    closeMenus,
    closeAccount,
    changeLanguage,
    toggleAccount,
    toggleLanguage,
    toggleEmployer,
    toggleMobile,
  };
};

export default useHeaderControls;
