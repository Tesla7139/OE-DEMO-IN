"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/primitives/Container";
import { DemoUrlInput } from "./demo/DemoUrlInput";
import { DemoExperience } from "./demo/DemoExperience";
import { useDemoData } from "@/hooks/useDemoData";
import { fadeUp, staggerContainer } from "@/lib/motion";

// store URL -> path slug (its domain), e.g. "https://www.gullylabs.com/x" -> "gullylabs.com"
function slugFor(url: string) {
  return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] || url.trim();
}

export function Hero() {
  const { status, store, submittedUrl, generate, reset } = useDemoData();
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(0);

  // the "Product Tour" nav link fires this to nudge the store-URL input
  useEffect(() => {
    const onShake = () => setShake((n) => n + 1);
    window.addEventListener("demo:shake", onShake);
    if (window.location.hash === "#demo") onShake();
    return () => window.removeEventListener("demo:shake", onShake);
  }, []);

  // shareable deep link: /product-demo/gullylabs.com auto-opens that store's demo
  // (also supports the legacy ?store= query param)
  useEffect(() => {
    const m = window.location.pathname.match(/^\/product-demo\/(.+)$/);
    const shared = m ? decodeURIComponent(m[1]) : new URLSearchParams(window.location.search).get("store");
    if (shared) {
      setUrl(shared);
      setOpen(true);
      generate(shared);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!v || status === "loading") return;
    setOpen(true);
    // reflect the store in the address bar so it can be copied/shared directly
    window.history.replaceState(null, "", `/product-demo/${slugFor(v)}`);
    await generate(v);
  };

  const close = () => {
    setOpen(false);
    reset();
    setUrl("");
    window.history.replaceState(null, "", "/");
  };

  return (
    <section
      id="demo"
      className="relative flex min-h-[100svh] flex-col overflow-hidden pb-8 pt-2 md:pt-3"
      style={{ background: "#ffffff" }}
    >
      <Container className="flex flex-1 items-center py-4 lg:items-start lg:pt-[8vh]">
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          animate="show"
          className="mx-auto flex w-full max-w-4xl flex-col items-center text-center animate-fade-in lg:max-w-5xl 2xl:max-w-6xl"
        >
          <motion.h1
            variants={fadeUp}
            className="text-balance font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(2rem, 5vw, 5.25rem)", lineHeight: 1.04, letterSpacing: "-0.022em" }}
          >
            Reduce Support Tickets and Add Thousands in{" "}
            <span className="text-[#155FFF]">Upsell Revenue</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-muted-foreground md:mt-6"
            style={{ fontSize: "clamp(1rem, 1.5vw, 1.4rem)" }}
          >
            Enter your store URL to have a personalized demo tailored to your store.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-5 w-full max-w-xl md:mt-7 lg:max-w-2xl">
            <DemoUrlInput
              url={url}
              setUrl={setUrl}
              onSubmit={onSubmit}
              loading={status === "loading"}
              align="center"
              shake={shake}
            />
          </motion.div>
        </motion.div>
      </Container>

      {/* full-screen brand preview experience */}
      <DemoExperience open={open} status={status} store={store} submittedUrl={submittedUrl} onClose={close} />
    </section>
  );
}
