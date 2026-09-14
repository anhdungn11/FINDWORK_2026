export interface JobMarketTrend {
  name: string;
  description: string;
  change: string;
}

export const JOB_MARKET_TRENDS: JobMarketTrend[] =
  [
    {
      name: "Kinh doanh / Bán hàng",
      description:
        "Nhu cầu tuyển dụng tăng",
      change: "+18%",
    },
    {
      name: "Marketing / Truyền thông",
      description:
        "Nhu cầu tuyển dụng tăng",
      change: "+14%",
    },
    {
      name: "CNTT / Phần mềm",
      description:
        "Nhu cầu tuyển dụng tăng",
      change: "+12%",
    },
    {
      name: "Logistics / Chuỗi cung ứng",
      description:
        "Nhu cầu tuyển dụng tăng",
      change: "+10%",
    },
  ];
