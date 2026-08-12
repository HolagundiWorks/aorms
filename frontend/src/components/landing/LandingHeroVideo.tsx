import { useEffect, useRef, useState } from "react";

/** Soft-launch hero loop — drop encodes per docs/marketing/NANO-BANANA-HERO-VIDEO.md */
const HERO_VIDEO_SRC = "/landing/hero/aorms-aec-loop.mp4";
const HERO_POSTER = "/landing/hero/aorms-aec-poster.jpg";

/**
 * Full-bleed ambient video behind the dark hero band.
 * Respects prefers-reduced-motion; CSS grade remains when media is missing.
 */
export function LandingHeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [posterOk, setPosterOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !mediaReady || reduceMotion) return;
    void el.play().catch(() => {
      /* autoplay blocked — poster / grade remain */
    });
  }, [mediaReady, reduceMotion]);

  return (
    <div
      className={
        mediaReady || posterOk
          ? "esti-lp-hero-video esti-lp-hero-video--active"
          : "esti-lp-hero-video"
      }
      aria-hidden
    >
      {posterOk ? (
        <img
          className="esti-lp-hero-video__poster"
          src={HERO_POSTER}
          alt=""
          width={1920}
          height={1080}
          decoding="async"
          onError={() => setPosterOk(false)}
        />
      ) : null}
      {!reduceMotion ? (
        <video
          ref={videoRef}
          className={
            mediaReady
              ? "esti-lp-hero-video__media esti-lp-hero-video__media--on"
              : "esti-lp-hero-video__media"
          }
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
          onLoadedData={() => setMediaReady(true)}
          onError={() => setMediaReady(false)}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      ) : null}
      <div className="esti-lp-hero-video__veil" />
    </div>
  );
}
