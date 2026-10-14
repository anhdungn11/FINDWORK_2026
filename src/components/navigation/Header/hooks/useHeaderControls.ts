import { useCallback, useState } from "react";

import type {
  HeaderLanguage,
} from "../types/header.types";

const useHeaderControls = () => {
  const [
    isLanguageOpen,
    setIsLanguageOpen,
  ] = useState(false);

  const [
    isEmployerOpen,
    setIsEmployerOpen,
  ] = useState(false);

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [
    language,
    setLanguage,
  ] =
    useState<HeaderLanguage>("VI");

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

  const changeLanguage = (
    value: HeaderLanguage,
  ) => {
    setLanguage(value);
    setIsLanguageOpen(false);
  };

  const toggleLanguage = () => {
    setIsLanguageOpen(
      (current) => !current,
    );

    setIsEmployerOpen(false);
    setIsAccountOpen(false);
  };

  const toggleEmployer = () => {
    setIsEmployerOpen(
      (current) => !current,
    );

    setIsLanguageOpen(false);
    setIsAccountOpen(false);
  };

  const toggleMobile = () => {
    setIsMobileOpen(
      (current) => !current,
    );

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
    toggleLanguage,
    toggleEmployer,
    toggleMobile,
    toggleAccount,
  };
};

export default useHeaderControls;
