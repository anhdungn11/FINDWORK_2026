import styles from "../styles/HeaderMobile.module.css";

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MobileMenuButton = ({
  isOpen,
  onToggle,
}: MobileMenuButtonProps) => {
  return (
    <button
      type="button"
      className={styles.mobileMenuButton}
      aria-label="Mở menu"
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <span />
      <span />
      <span />
    </button>
  );
};

export default MobileMenuButton;
