import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  // Switching category/sale view only changes the query string, so include those params
  // (but not `search`, which changes while typing in the header search box).
  const params = new URLSearchParams(search);
  const viewKey = `${pathname}|${params.get("category") || ""}|${params.get("sale") || ""}`;

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Use "auto" if you don't want animation
    });
  }, [viewKey]);

  return null;
};

export default ScrollToTop;
