import { useState } from "react";

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

  const [
    language,
    setLanguage,
  ] =
    useState<HeaderLanguage>("VI");

  const closeMenus = () => {
    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
    setIsMobileOpen(false);
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
  };

  const toggleEmployer = () => {
    setIsEmployerOpen(
      (current) => !current,
    );

    setIsLanguageOpen(false);
  };

  const toggleMobile = () => {
    setIsMobileOpen(
      (current) => !current,
    );

    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
  };

  return {
    isLanguageOpen,
    isEmployerOpen,
    isMobileOpen,
    language,
    closeMenus,
    changeLanguage,
    toggleLanguage,
    toggleEmployer,
    toggleMobile,
  };
};

export default useHeaderControls;
