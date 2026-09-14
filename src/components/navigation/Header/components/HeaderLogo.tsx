import { Link } from "react-router-dom";

import styles from "../styles/HeaderLayout.module.css";

interface HeaderLogoProps {
  onClick: () => void;
}

const HeaderLogo = ({
  onClick,
}: HeaderLogoProps) => {
  return (
    <Link
      to="/"
      className={styles.logo}
      onClick={onClick}
    >
      FINDWORK
    </Link>
  );
};

export default HeaderLogo;
