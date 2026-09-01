import { Outlet } from "react-router-dom";

import Footer from "@/components/navigation/Footer/Footer";
import Header from "@/components/navigation/Header/Header";

const PublicLayout = () => {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />
    </>
  );
};

export default PublicLayout;