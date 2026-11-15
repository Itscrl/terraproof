/**
 * Spring Physics Scroll Engine (Hooke's Law Damped Harmonic Oscillator)
 * Provides authentic momentum, velocity carry-over, and gentle spring settle
 * when clicking section links or switching guided steps.
 */

let activeFrame: number | null = null;
let currentVelocity = 0;

export function cancelSpringScroll() {
  if (activeFrame != null) {
    cancelAnimationFrame(activeFrame);
    activeFrame = null;
  }
}

export function springScrollToY(
  targetY: number,
  options?: { stiffness?: number; damping?: number; mass?: number },
) {
  if (typeof window === "undefined") return;

  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (prefersReduced) {
    window.scrollTo({ top: targetY, behavior: "auto" });
    return;
  }

  cancelSpringScroll();

  const stiffness = options?.stiffness ?? 155;
  const damping = options?.damping ?? 19;
  const mass = options?.mass ?? 1;

  let position = window.scrollY;
  let velocity = currentVelocity;
  let lastTime = performance.now();

  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const clampedTarget = Math.min(maxScroll, Math.max(0, targetY));

  const stopOnUserWheel = () => {
    cancelSpringScroll();
    currentVelocity = 0;
    window.removeEventListener("wheel", stopOnUserWheel);
    window.removeEventListener("touchstart", stopOnUserWheel);
  };

  window.addEventListener("wheel", stopOnUserWheel, { passive: true });
  window.addEventListener("touchstart", stopOnUserWheel, { passive: true });

  function step(now: number) {
    const dt = Math.min(0.032, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    const displacement = position - clampedTarget;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;
    currentVelocity = velocity;

    window.scrollTo(0, Math.round(position));

    if (Math.abs(displacement) < 0.6 && Math.abs(velocity) < 6) {
      window.scrollTo(0, Math.round(clampedTarget));
      currentVelocity = 0;
      activeFrame = null;
      window.removeEventListener("wheel", stopOnUserWheel);
      window.removeEventListener("touchstart", stopOnUserWheel);
      return;
    }

    activeFrame = requestAnimationFrame(step);
  }

  activeFrame = requestAnimationFrame(step);
}

export function springScrollToElement(
  idOrElement: string | HTMLElement,
  offset = 88,
) {
  if (typeof window === "undefined") return;
  const el =
    typeof idOrElement === "string"
      ? document.getElementById(idOrElement.replace(/^#/, ""))
      : idOrElement;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const targetY = window.scrollY + rect.top - offset;
  springScrollToY(targetY);
}
