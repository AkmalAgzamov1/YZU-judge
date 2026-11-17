import { useEffect, useRef } from "react";

// A page that shows one specific thing (a problem, an exam) owns the browser tab
// title. The i18n provider only writes the site default while nobody owns it, so
// the per-page title a prerendered page ships with is not clobbered the moment
// React mounts, and search engines that render JavaScript see the same title a
// crawler sees in the static HTML.
let owner: object | null = null;
let fallback = "";

export function setDefaultTitle(title: string) {
  fallback = title;
  if (owner) return;
  document.title = title;
}

// Pass null while the page is still loading: the hook claims the title but leaves
// whatever is already there (the prerendered one) in place. When the data arrives,
// call it again with the real title and it replaces it.
export function useDocumentTitle(title: string | null) {
  const id = useRef<object>({});

  useEffect(() => {
    const token = id.current;
    owner = token;
    if (title) document.title = title;

    return () => {
      if (owner !== token) return;
      owner = null;
      if (fallback) document.title = fallback;
    };
  }, [title]);
}
