import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { hasSnapshot } from "../utils/listSnapshots";

const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();
  const navigationType = useNavigationType();
  // Switching category/sale view only changes the query string, so include those params
  // (but not `search`, which changes while typing in the header search box).
  const params = new URLSearchParams(search);
  const viewKey = `${pathname}|${params.get("category") || ""}|${params.get("sale") || ""}`;

  useLayoutEffect(() => {
    // Native history restoration runs after POP navigation and can override our scroll
    // while the product is still loading, leaving the viewport near the footer.
    const history = window.history;
    if (!history || !("scrollRestoration" in history)) return;
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    // Back/forward to a list page that saved its scroll position: that page restores it itself.
    if (navigationType === "POP" && hasSnapshot(key)) return;

    window.scrollTo({
      'top': 0,
      behavior: navigationType === "POP" || pathname.startsWith('/products/') ? "instant" : "smooth",
    });
  }, [viewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default ScrollToTop;
