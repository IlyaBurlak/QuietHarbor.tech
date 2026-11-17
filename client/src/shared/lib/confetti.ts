import confetti from 'canvas-confetti';

const COLORS = ['#1F5F7A', '#B5651D', '#2E7D4F', '#E3B04B', '#7FB3C8'];

/** Конфетти из двух нижних углов экрана. Пропускается при prefers-reduced-motion. */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const end = Date.now() + 900;
  const base = { particleCount: 4, spread: 60, startVelocity: 55, colors: COLORS, ticks: 220 };

  const frame = () => {
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
