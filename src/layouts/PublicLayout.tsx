import { Outlet } from "react-router-dom";
import Footer from "@/components/navigation/Footer/Footer";
import Header from "@/components/navigation/Header/Header";
import { FindworkAiFloatingWidget } from "@/features/ai/FindworkAiFloatingWidget";

const PublicLayout = () => {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />

      {/* Floating Action Button & AI Assistant Popup */}
      <FindworkAiFloatingWidget />
    </>
  );
};

export default PublicLayout;
