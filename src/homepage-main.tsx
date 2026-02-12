import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HomepageApp from "./HomepageApp";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <HomepageApp />
  </StrictMode>
);
