import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { hasSnapshot } from "../utils/listSnapshots";

const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();
  const navigationType = useNavigationType();
  // Switching category/sale view only changes the query string, so include those params
  // (but not `search`, which changes while typing in the header search box).
  const params = new URLSearchParams(search);
  const viewKey = `${pathname}|${params.get("category") || ""}|${params.get("sale") || ""}`;

  useEffect(() => {
    // Back/forward to a list page that saved its scroll position: that page restores it itself.
    if (navigationType === "POP" && hasSnapshot(key)) return;

    window.scrollTo({
      top: 0,
      behavior: "smooth", // Use "auto" if you don't want animation
    });
  }, [viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default ScrollToTop;
