import type { ReactNode } from "react";

import QueryProvider from "./QueryProvider";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
};

export default AppProviders;