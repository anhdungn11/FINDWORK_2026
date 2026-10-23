import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";

import Footer from "@/components/navigation/Footer/Footer";
import Header from "@/components/navigation/Header/Header";
import { AiAssistantModal } from "@/features/ai/AiAssistantModal";

const PublicLayout = () => {
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    const handleOpenAi = () => {
      setIsAiOpen(true);
    };
    window.addEventListener("open-findwork-ai", handleOpenAi);
    return () => window.removeEventListener("open-findwork-ai", handleOpenAi);
  }, []);

  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />

      {/* Floating Action Button for Public AI Assistant */}
      <button
        type="button"
        onClick={() => setIsAiOpen(true)}
        aria-label="Mở Trợ lý FINDWORK AI"
        title="Trợ lý FINDWORK AI (Tư vấn CV, phỏng vấn, tuyển dụng)"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 990,
          width: 54,
          height: 54,
          borderRadius: 27,
          background: "linear-gradient(135deg, #0284c7 0%, #6366f1 100%)",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4), 0 2px 6px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Sparkles size={24} />
      </button>

      {/* AI Assistant Drawer / Modal */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />
    </>
  );
};

export default PublicLayout;
