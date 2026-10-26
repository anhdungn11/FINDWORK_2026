import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/common/Button";

import styles from "./JobSearchHero.module.css";

const JobSearchHero = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.trim()) params.set("location", location.trim());
    navigate({ pathname: "/jobs", search: params.toString() });
  };

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className="container">
        <div className={styles.content}>
          <h1 id="hero-title" className={styles.title}>
            Tìm công việc phù hợp với bạn
          </h1>

          <p className={styles.description}>
            Khám phá cơ hội nghề nghiệp đa ngành và kết nối trực tiếp với các nhà tuyển dụng hàng đầu trên nền tảng FINDWORK.
          </p>

          <form className={styles.searchBox} onSubmit={handleSearch} role="search" aria-label="Tìm kiếm việc làm">
            <input
              type="text"
              placeholder="Vị trí, kỹ năng hoặc công ty..."
              className={styles.input}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Vị trí, kỹ năng hoặc công ty"
            />

            <input
              type="text"
              placeholder="Địa điểm hoặc khu vực làm việc..."
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Địa điểm hoặc khu vực làm việc"
            />

            <Button size="large" type="submit">
              Tìm việc
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default JobSearchHero;