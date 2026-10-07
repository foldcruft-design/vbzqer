(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#060913"); tg.setBackgroundColor("#060913"); } catch (_) {}
    try { tg.disableVerticalSwipes?.(); } catch (_) {}
  }

  const scene = document.getElementById("scene");
  const cube  = document.getElementById("cube");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ================= ВРАЩЕНИЕ КУБА =================
  let rx = -22, ry = 32;          // текущие углы
  let vx = 0, vy = reduce ? 0 : 0.18; // скорость (град/кадр)
  let dragging = false;
  let lastX = 0, lastY = 0, lastT = 0;
  let idleSince = performance.now();
  const AUTO = reduce ? 0 : 0.18;

  function render() {
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  scene.addEventListener("pointerdown", (e) => {
    dragging = true;
    scene.classList.add("drag");
    scene.setPointerCapture(e.pointerId);
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    vx = vy = 0;
    try { tg?.HapticFeedback?.impactOccurred("light"); } catch (_) {}
  });

  scene.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dt = Math.max(now - lastT, 1);

    ry += dx * 0.45;
    rx -= dy * 0.45;

    // скорость для инерции
    vy = (dx * 0.45) / dt * 16;
    vx = (-dy * 0.45) / dt * 16;

    lastX = e.clientX; lastY = e.clientY; lastT = now;
    render();
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    scene.classList.remove("drag");
    idleSince = performance.now();
  };
  scene.addEventListener("pointerup", release);
  scene.addEventListener("pointercancel", release);

  // двойной тап — быстрый «бросок»
  let lastTap = 0;
  scene.addEventListener("pointerup", () => {
    const t = performance.now();
    if (t - lastTap < 300) {
      vy = 14; vx = -6;
      try { tg?.HapticFeedback?.impactOccurred("medium"); } catch (_) {}
    }
    lastTap = t;
  });

  function loop() {
    if (!dragging) {
      rx += vx;
      ry += vy;
      // затухание инерции
      vx *= 0.955;
      vy *= 0.955;

      // после паузы плавно возвращаем автовращение
      if (performance.now() - idleSince > 1200) {
        vy += (AUTO - vy) * 0.02;
        vx += (0 - vx) * 0.02;
      }
      // мягко выравниваем наклон по X, чтобы куб не «заваливался»
      rx += (-22 - (((rx + 180) % 360 + 360) % 360 - 180)) * 0.0015;
      render();
    }
    requestAnimationFrame(loop);
  }
  render();
  requestAnimationFrame(loop);

  // ================= ЧАСТИЦЫ НА ФОНЕ =================
  const canvas = document.getElementById("dust");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, dots = [];
  let px = 0, py = 0; // параллакс от указателя

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((W * H) / 14000);
    dots = Array.from({ length: Math.min(n, 90) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 0.9 + 0.1,
      r: Math.random() * 1.6 + 0.4,
      s: Math.random() * 0.25 + 0.05,
      p: Math.random() * Math.PI * 2,
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (e) => {
    px = (e.clientX / W - 0.5) * 2;
    py = (e.clientY / H - 0.5) * 2;
  });

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      if (!reduce) {
        d.y -= d.s * d.z;
        if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
      }
      const x = d.x + px * 18 * d.z;
      const y = d.y + py * 18 * d.z;
      const a = (0.25 + 0.55 * Math.abs(Math.sin(t / 1400 + d.p))) * d.z;
      ctx.beginPath();
      ctx.arc(x, y, d.r * d.z, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,225,255,${a})`;
      ctx.shadowColor = "rgba(140,200,255,.9)";
      ctx.shadowBlur = 8 * d.z;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
