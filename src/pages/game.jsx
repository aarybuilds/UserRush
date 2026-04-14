import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// ASSET IMPORTS — Images
// ═══════════════════════════════════════════════════════════════
import modiFaceImg from "../assets/modi_face.png";
import rahulFaceImg from "../assets/rahul_face.png";
import modiBodyImg from "../assets/modi_body.png";
import rahulBodyImg from "../assets/rahul_body.png";
import modiPillarImg from "../assets/modi_pillar.png";
import rahulPillarImg from "../assets/rahul_pillar.png";
import dhruvImg from "../assets/dhruv.png";
import arnabImg from "../assets/arnab.png";
import backgroundImg from "../assets/background.png";

// ═══════════════════════════════════════════════════════════════
// ASSET IMPORTS — Audio
// ═══════════════════════════════════════════════════════════════
import modiBgmSrc from "../assets/modi_bgm.mp3";
import rahulBgmSrc from "../assets/rahul_bgm.mp3";
import modiDeathSrc from "../assets/modi_death.mp3";
import rahulDeathSrc from "../assets/rahul_death.mp3";
import flapSrc from "../assets/flap.mp3";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SAFFRON = "#FF9933";
const BLUE = "#0047AB";
const DARK_BG = "#0f172a";
const CARD_BG = "rgba(255,255,255,0.06)";
const CARD_BORDER = "rgba(255,255,255,0.10)";

const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const BIRD_SIZE = 42; // width & height for image-based bird
const BIRD_RADIUS = 18; // collision radius
const PIPE_WIDTH = 120;
const PIPE_GAP = 150;
const BASE_PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 100; // frames
const GROUND_HEIGHT = 60;
const SPEED_INCREMENT = 0.4;

const CHARACTERS = {
  modi: {
    name: "Modi",
    color: SAFFRON,
    accent: SAFFRON,
    deathQuote: "Yeh PUBG wala hai kya?",
    faceImg: modiFaceImg,
    bodyImg: modiBodyImg,
    pipeImg: rahulPillarImg,       // opponent pillar as regular pipe
    specialPipeImg: dhruvImg,    // dhruv as special pipe at every 10
    bgmSrc: modiBgmSrc,
    deathSrc: modiDeathSrc,
    obstacleImg: dhruvImg,
    obstacle: {
      name: "Dhruv Rathee",
      text: "Dhruv Rathee appeared! Democracy restored!",
    },
  },
  rahul: {
    name: "Rahul",
    color: BLUE,
    accent: BLUE,
    deathQuote: "Khatam! Bye-bye! Tata! Goodbye! Gaya!",
    faceImg: rahulFaceImg,
    bodyImg: rahulBodyImg,
    pipeImg: modiPillarImg,        // opponent pillar as regular pipe
    specialPipeImg: arnabImg,    // arnab as special pipe at every 10
    bgmSrc: rahulBgmSrc,
    deathSrc: rahulDeathSrc,
    obstacleImg: arnabImg,
    obstacle: {
      name: "Arnab Goswami",
      text: "Mujhe points do! Mujhe points do!",
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// AUDIO MANAGER — handles play / stop / loop
// ═══════════════════════════════════════════════════════════════

function createAudioManager() {
  const audios = {};

  return {
    play(key, src, { loop = false, volume = 1.0 } = {}) {
      this.stop(key);
      try {
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = volume;
        audio.play().catch(() => { });
        audios[key] = audio;
      } catch { }
    },
    stop(key) {
      if (audios[key]) {
        audios[key].pause();
        audios[key].currentTime = 0;
        delete audios[key];
      }
    },
    stopAll() {
      Object.keys(audios).forEach((k) => this.stop(k));
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// IMAGE PRELOADER — loads Image objects for canvas drawImage
// ═══════════════════════════════════════════════════════════════

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Game() {
  const [screen, setScreen] = useState("start"); // start | select | play | over
  const [character, setCharacter] = useState(null);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem("flappyNeta_highScore")) || 0;
    } catch {
      return 0;
    }
  });
  const audioRef = useRef(createAudioManager());

  // full-page dark setup
  useEffect(() => {
    const s = document.documentElement.style;
    s.margin = s.padding = "0";
    s.width = s.height = "100%";
    const b = document.body.style;
    b.margin = b.padding = "0";
    b.width = b.height = "100%";
    b.background = DARK_BG;
    b.overflow = "auto";
    const r = document.getElementById("root");
    if (r) {
      r.style.width = r.style.height = "100%";
    }
    return () => audioRef.current.stopAll();
  }, []);

  const handleSelectCharacter = useCallback((char) => {
    setCharacter(char);
    setScreen("play");
    const ch = CHARACTERS[char];
    audioRef.current.play("bgm", ch.bgmSrc, { loop: true, volume: 0.4 });
  }, []);

  const handleGameOver = useCallback(
    (score) => {
      setFinalScore(score);
      const best = Math.max(score, highScore);
      setHighScore(best);
      try {
        localStorage.setItem("flappyNeta_highScore", best.toString());
      } catch { }
      setScreen("over");
      audioRef.current.stop("bgm");
      if (character) {
        const ch = CHARACTERS[character];
        audioRef.current.play("death", ch.deathSrc, { volume: 0.7 });
      }
    },
    [highScore, character]
  );

  const handleRestart = useCallback(() => {
    setScreen("play");
    if (character) {
      const ch = CHARACTERS[character];
      audioRef.current.play("bgm", ch.bgmSrc, { loop: true, volume: 0.4 });
    }
  }, [character]);

  const handleChangeNeta = useCallback(() => {
    audioRef.current.stopAll();
    setCharacter(null);
    setScreen("select");
  }, []);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      {screen === "start" && <StartScreen onNext={() => setScreen("select")} />}
      {screen === "select" && (
        <SelectScreen onSelect={handleSelectCharacter} />
      )}
      {screen === "play" && character && (
        <PlayScreen
          character={character}
          onGameOver={handleGameOver}
          audioManager={audioRef.current}
        />
      )}
      {screen === "over" && character && (
        <GameOverScreen
          character={character}
          score={finalScore}
          highScore={highScore}
          onRestart={handleRestart}
          onChangeNeta={handleChangeNeta}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// START SCREEN
// ═══════════════════════════════════════════════════════════════

function StartScreen({ onNext }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={styles.screenCenter}>
      <div style={styles.glassCard}>
        {/* Modi & Rahul face preview */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <img
            src={modiFaceImg}
            alt="Modi"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${SAFFRON}`,
              boxShadow: `0 0 16px ${SAFFRON}44`,
            }}
          />
          <img
            src={rahulFaceImg}
            alt="Rahul"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${BLUE}`,
              boxShadow: `0 0 16px ${BLUE}44`,
            }}
          />
        </div>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 80,
            fontWeight: 900,
            background: `linear-gradient(135deg, ${SAFFRON}, ${BLUE})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-1px",
            lineHeight: 1.1,
          }}
        >
          Flappy Neta
        </h1>
        <p style={{ margin: "0 0 40px", color: "#94a3b8", fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>
          Choose Your Destiny
        </p>

        {/* Button */}
        <button
          onClick={onNext}
          style={{
            ...styles.btn,
            background: `linear-gradient(135deg, ${SAFFRON}, ${BLUE})`,
            transform: pulse ? "scale(1.05)" : "scale(1)",
            boxShadow: pulse
              ? `0 0 30px rgba(255,153,51,0.4), 0 0 60px rgba(0,71,171,0.2)`
              : "0 8px 32px rgba(0,0,0,0.3)",
            transition: "all 0.4s ease",
          }}
        >
          Choose Your Neta
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER SELECT SCREEN
// ═══════════════════════════════════════════════════════════════

function SelectScreen({ onSelect }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={styles.screenCenter}>
      <h2
        style={{
          margin: "0 0 40px",
          fontSize: 54,
          fontWeight: 800,
          color: "#e2e8f0",
          textAlign: "center",
          letterSpacing: "-0.5px",
        }}
      >
        Pick Your Neta
      </h2>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
        {["modi", "rahul"].map((key) => {
          const ch = CHARACTERS[key];
          const isHov = hovered === key;
          return (
            <div
              key={key}
              onClick={() => onSelect(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width: 340,
                padding: "56px 40px",
                borderRadius: 24,
                background: isHov
                  ? `linear-gradient(160deg, ${ch.color}22, ${ch.color}11)`
                  : CARD_BG,
                border: `2px solid ${isHov ? ch.color : CARD_BORDER}`,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.3s ease",
                transform: isHov ? "translateY(-6px) scale(1.03)" : "none",
                boxShadow: isHov
                  ? `0 16px 48px ${ch.color}33`
                  : "0 8px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* Character body image */}
              <div
                style={{
                  width: 220,
                  height: 280,
                  margin: "0 auto 18px",
                  borderRadius: 18,
                  overflow: "hidden",
                  border: `2px solid ${ch.color}44`,
                  boxShadow: `0 4px 20px ${ch.color}33`,
                  background: `radial-gradient(circle at 50% 30%, ${ch.color}18, transparent)`,
                }}
              >
                <img
                  src={ch.bodyImg}
                  alt={ch.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 36, fontWeight: 800, color: "#fff" }}>
                {ch.name}
              </h3>
              <p style={{ margin: 0, fontSize: 20, color: "#94a3b8" }}>
                {key === "modi" ? "Mitron, let's fly!" : "Aaj mai udega!"}
              </p>
            </div>
          );
        })}
      </div>
      <p style={{
        marginTop: 32,
        fontSize: 22,
        color: "#94a3b8",
        textAlign: "center",
        maxWidth: 500,
        lineHeight: 1.5,
      }}>
        ⚡ <span style={{ color: "#fbbf24", fontWeight: 700 }}>Special obstacle</span> appears at every 5th pipe!
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PLAY SCREEN (Canvas Game)
// ═══════════════════════════════════════════════════════════════

function PlayScreen({ character, onGameOver, audioManager }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const animRef = useRef(null);
  const imagesRef = useRef({});
  const [obstacleText, setObstacleText] = useState(null);
  const obstacleTimerRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // ─── preload images for canvas ──────────────────────────────
  useEffect(() => {
    const ch = CHARACTERS[character];
    let cancelled = false;
    Promise.all([
      preloadImage(ch.faceImg),
      preloadImage(ch.obstacleImg),
      preloadImage(backgroundImg),
      preloadImage(ch.pipeImg),
      preloadImage(ch.specialPipeImg),
    ]).then(([face, obstacle, bg, pipeBody, specialPipe]) => {
      if (cancelled) return;
      imagesRef.current = { face, obstacle, bg, pipeBody, specialPipe };
      setImagesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [character]);

  // ─── game loop ───────────────────────────────────────────────
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const ch = CHARACTERS[character];

    gameRef.current = {
      bird: { x: W * 0.2, y: H / 2, vy: 0, radius: BIRD_RADIUS },
      pipes: [],
      score: 0,
      frame: 0,
      elapsed: 0,
      lastSpawnTime: -1800, // spawn first pipe immediately
      lastTimestamp: null,
      speed: BASE_PIPE_SPEED,
      gameOver: false,
      started: false,
      groundOffset: 0,
      bgOffset: 0,
      ch,
      W,
      H,
    };
  }, [character]);

  // spawn pipe
  const spawnPipe = useCallback((g) => {
    const minTop = 60;
    const maxTop = g.H - GROUND_HEIGHT - PIPE_GAP - 60;
    const topH = Math.random() * (maxTop - minTop) + minTop;

    // Check if this should be a special obstacle (every 5 pipes)
    const pipeIndex = g.pipes.filter((p) => !p.counted).length + g.score + 1;
    const isSpecial = pipeIndex > 0 && pipeIndex % 5 === 0;

    g.pipes.push({
      x: g.W + 10,
      topH,
      passed: false,
      counted: false,
      isSpecial,
    });
  }, []);

  // flap
  const flap = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.gameOver) return;
    if (!g.started) g.started = true;
    g.bird.vy = FLAP_FORCE;
    // Flap sound
    audioManager.play("flap", flapSrc, { volume: 0.5 });
  }, [audioManager]);

  // draw everything
  const draw = useCallback(
    (ctx, g) => {
      const { W, H, bird, pipes, score, ch } = g;
      const groundY = H - GROUND_HEIGHT;
      const imgs = imagesRef.current;

      // ── background ──
      if (imgs.bg) {
        // Scrolling tiled background
        const bgW = imgs.bg.width;
        const bgH = imgs.bg.height;
        const scale = H / bgH;
        const scaledW = bgW * scale;
        const offset = g.bgOffset % scaledW;

        // Draw solid dark background first
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        // Use global alpha to darken the image, avoiding a massive full-screen alpha fill
        ctx.globalAlpha = 0.4;
        for (let x = -offset; x < W; x += scaledW) {
          ctx.drawImage(imgs.bg, x, 0, scaledW, H);
        }
        ctx.restore();
      } else {
        // Fallback gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#020617");
        skyGrad.addColorStop(0.5, "#0f172a");
        skyGrad.addColorStop(1, "#1e293b");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // subtle stars (always visible for dark mood)
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97 + g.frame * 0.08) % W;
        const sy = (i * 61) % (groundY - 20);
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── pipes — draw using body images ──
      pipes.forEach((p) => {
        const bottomY = p.topH + PIPE_GAP;
        const pipeImg = p.isSpecial ? imgs.specialPipe : imgs.pipeBody;

        if (pipeImg) {
          // ── TOP PIPE (flipped upside-down, single image stretched) ──
          // Solid white background behind transparent images
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);

          ctx.save();
          // Flip vertically and draw one single image stretched to fill
          ctx.translate(p.x, p.topH);
          ctx.scale(1, -1);
          ctx.drawImage(pipeImg, 0, 0, PIPE_WIDTH, p.topH);
          ctx.restore();

          // Top pipe border/edge
          ctx.strokeStyle = p.isSpecial ? "#e11d48" : "rgba(255,255,255,0.2)";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topH);
          // Cap
          ctx.fillStyle = p.isSpecial ? "rgba(225,29,72,0.7)" : "rgba(0,0,0,0.3)";
          ctx.fillRect(p.x - 4, p.topH - 14, PIPE_WIDTH + 8, 14);
          ctx.strokeRect(p.x - 4, p.topH - 14, PIPE_WIDTH + 8, 14);

          // ── BOTTOM PIPE (right-side-up, single image stretched) ──
          const bottomH = groundY - bottomY;
          // Solid white background behind transparent images
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.x, bottomY, PIPE_WIDTH, bottomH);

          // Draw one single image stretched to fill (no need to clip, exact dimensions)
          ctx.drawImage(pipeImg, p.x, bottomY, PIPE_WIDTH, bottomH);

          // Bottom pipe border/edge
          ctx.strokeStyle = p.isSpecial ? "#e11d48" : "rgba(255,255,255,0.2)";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, bottomH);
          // Cap
          ctx.fillStyle = p.isSpecial ? "rgba(225,29,72,0.7)" : "rgba(0,0,0,0.3)";
          ctx.fillRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 14);
          ctx.strokeRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 14);

        } else {
          // Fallback: colored gradient pipes if images not loaded
          const pipeColor = p.isSpecial ? "#e11d48" : "#22c55e";
          const pipeHighlight = p.isSpecial ? "#fb7185" : "#4ade80";

          const tGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
          tGrad.addColorStop(0, pipeColor);
          tGrad.addColorStop(0.5, pipeHighlight);
          tGrad.addColorStop(1, pipeColor);

          ctx.fillStyle = tGrad;
          ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
          ctx.fillStyle = pipeHighlight;
          ctx.fillRect(p.x - 4, p.topH - 18, PIPE_WIDTH + 8, 18);

          ctx.fillStyle = tGrad;
          ctx.fillRect(p.x, bottomY, PIPE_WIDTH, groundY - bottomY);
          ctx.fillStyle = pipeHighlight;
          ctx.fillRect(p.x - 4, bottomY, PIPE_WIDTH + 8, 18);
        }
      });

      // ── ground ──
      const gGrad = ctx.createLinearGradient(0, groundY, 0, H);
      gGrad.addColorStop(0, "#854d0e");
      gGrad.addColorStop(1, "#422006");
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, groundY, W, GROUND_HEIGHT);
      // ground line
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();
      // scrolling marks
      ctx.strokeStyle = "#713f12";
      ctx.lineWidth = 1;
      for (let i = 0; i < W + 20; i += 20) {
        const gx = (i - (g.groundOffset % 20) + W) % W;
        ctx.beginPath();
        ctx.moveTo(gx, groundY + 8);
        ctx.lineTo(gx + 10, groundY + 16);
        ctx.stroke();
      }

      // ── bird — draw face image instead of colored circle ──
      ctx.save();
      ctx.translate(bird.x, bird.y);
      const rotation = Math.max(-0.5, Math.min(bird.vy * 0.06, 1.2));
      ctx.rotate(rotation);

      if (imgs.face) {
        // Draw the face image clipped to a circle
        const size = BIRD_SIZE;
        const half = size / 2;

        // Shadow / glow behind bird
        ctx.beginPath();
        ctx.arc(0, 0, half + 3, 0, Math.PI * 2);
        ctx.fillStyle = ch.color + "55";
        ctx.fill();

        // Clip circle and draw face
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(imgs.face, -half, -half, size, size);
        ctx.restore();

        // Border ring around bird (needs new save/restore since we clipped)
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      } else {
        // Fallback: colored circle bird
        const bGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, bird.radius);
        bGrad.addColorStop(0, ch.color + "ff");
        bGrad.addColorStop(1, ch.color + "99");
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fillStyle = bGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // beak
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(bird.radius - 2, -3);
        ctx.lineTo(bird.radius + 10, 0);
        ctx.lineTo(bird.radius - 2, 4);
        ctx.closePath();
        ctx.fill();

        // wing
        const wingAngle = Math.sin(g.frame * 0.3) * 12;
        ctx.fillStyle = ch.color + "aa";
        ctx.beginPath();
        ctx.ellipse(-6, 4 + wingAngle, 10, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ── HUD ──
      // score
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.fillText(score, W / 2, 50);
      ctx.shadowBlur = 0;

      // "tap to start" overlay
      if (!g.started) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, W, H);

        // Draw character face in center as prompt
        if (imgs.face) {
          const previewSize = 64;
          ctx.save();
          ctx.beginPath();
          ctx.arc(W / 2, H / 2 - 50, previewSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(imgs.face, W / 2 - previewSize / 2, H / 2 - 50 - previewSize / 2, previewSize, previewSize);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(W / 2, H / 2 - 50, previewSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = ch.color;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Tap / Click / Space to Fly!", W / 2, H / 2 + 10);
        ctx.font = "15px Arial";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`Playing as ${ch.name}`, W / 2, H / 2 + 36);
      }
    },
    []
  );

  // ─── main loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // size canvas to container
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = Math.min(parent.clientWidth, 480);
      canvas.height = Math.min(parent.clientHeight, 720);
      initGame();
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");

    let lastTime = null;
    const TARGET_FPS = 60;
    const loop = (timestamp) => {
      const g = gameRef.current;
      if (!g) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      // Delta time — normalize to 60fps so game runs same speed on all devices
      if (lastTime === null) lastTime = timestamp;
      const delta = Math.min((timestamp - lastTime) / (1000 / TARGET_FPS), 3); // cap at 3x to avoid huge jumps
      lastTime = timestamp;

      // ── update ──
      if (g.started && !g.gameOver) {
        g.frame++;
        g.elapsed += timestamp - (g.lastTimestamp || timestamp); // track real ms
        g.lastTimestamp = timestamp;
        g.groundOffset += g.speed * delta;
        g.bgOffset += g.speed * 0.3 * delta; // parallax background scrolling

        // gravity
        g.bird.vy += GRAVITY * delta;
        g.bird.y += g.bird.vy * delta;

        // ceiling
        if (g.bird.y - g.bird.radius < 0) {
          g.bird.y = g.bird.radius;
          g.bird.vy = 0;
        }

        // ground collision
        if (g.bird.y + g.bird.radius >= g.H - GROUND_HEIGHT) {
          g.gameOver = true;
          onGameOver(g.score);
          return;
        }

        // spawn pipes — TIME based (every 1800ms), not frame based
        const PIPE_SPAWN_MS = 1800;
        if (g.elapsed - (g.lastSpawnTime || 0) >= PIPE_SPAWN_MS) {
          spawnPipe(g);
          g.lastSpawnTime = g.elapsed;
        }

        // move pipes & collision
        for (let i = g.pipes.length - 1; i >= 0; i--) {
          const p = g.pipes[i];
          p.x -= g.speed * delta;

          // remove offscreen
          if (p.x + PIPE_WIDTH < -10) {
            g.pipes.splice(i, 1);
            continue;
          }

          // score
          if (!p.passed && p.x + PIPE_WIDTH < g.bird.x) {
            p.passed = true;
            g.score++;

            // Special obstacle — show text (no score penalty)
            if (p.isSpecial) {
              setObstacleText(g.ch.obstacle.text);
              if (obstacleTimerRef.current) clearTimeout(obstacleTimerRef.current);
              obstacleTimerRef.current = setTimeout(() => setObstacleText(null), 2500);
            }

            // speed up every 5 pipes
            if (g.score > 0 && g.score % 5 === 0) {
              g.speed += SPEED_INCREMENT;
            }
          }

          // collision detection (AABB vs circle)
          const bx = g.bird.x,
            by = g.bird.y,
            br = g.bird.radius;
          const bottomY = p.topH + PIPE_GAP;
          const groundY = g.H - GROUND_HEIGHT;

          // top pipe rect
          if (
            bx + br > p.x &&
            bx - br < p.x + PIPE_WIDTH &&
            by - br < p.topH
          ) {
            g.gameOver = true;
            onGameOver(g.score);
            return;
          }
          // bottom pipe rect
          if (
            bx + br > p.x &&
            bx - br < p.x + PIPE_WIDTH &&
            by + br > bottomY &&
            by - br < groundY
          ) {
            g.gameOver = true;
            onGameOver(g.score);
            return;
          }
        }
      }

      // ── draw ──
      draw(ctx, g);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    // ── input handlers ──
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        flap();
      }
    };
    const onClick = () => flap();
    const onTouch = (e) => {
      // Only block default (scroll) when game is active, not on menus
      const g = gameRef.current;
      if (g && g.started && !g.gameOver) {
        e.preventDefault();
      }
      flap();
    };

    window.addEventListener("keydown", onKey);
    // Bind touch/click to window so tapping anywhere on the screen works
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouch, { passive: false });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouch);
      if (obstacleTimerRef.current) clearTimeout(obstacleTimerRef.current);
    };
  }, [character, initGame, spawnPipe, flap, draw, onGameOver]);

  // ─── render ─────────────────────────────────────────────────
  const ch = CHARACTERS[character];

  return (
    <div style={styles.playContainer}>
      {!imagesLoaded && (
        <div style={{
          position: "absolute",
          zIndex: 10,
          color: "#94a3b8",
          fontSize: 18,
          fontWeight: 700,
        }}>
          Loading assets...
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          borderRadius: 16,
          boxShadow: `0 0 60px ${ch.accent}22, 0 24px 48px rgba(0,0,0,0.5)`,
          maxWidth: "100%",
          maxHeight: "100%",
          touchAction: "none",
        }}
      />
      {/* Obstacle text overlay */}
      {obstacleText && (
        <div
          style={{
            position: "absolute",
            top: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(225,29,72,0.92)",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 800,
            textAlign: "center",
            maxWidth: "85%",
            zIndex: 50,
            boxShadow: "0 8px 32px rgba(225,29,72,0.4)",
            letterSpacing: "0.3px",
            lineHeight: 1.4,
          }}
        >
          ⚠️ {obstacleText}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GAME OVER SCREEN
// ═══════════════════════════════════════════════════════════════

function GameOverScreen({ character, score, highScore, onRestart, onChangeNeta }) {
  const ch = CHARACTERS[character];
  const isNewBest = score >= highScore && score > 0;

  return (
    <div style={styles.screenCenter}>
      <div style={{ ...styles.glassCard, maxWidth: 420 }}>
        {/* Character face as death portrait */}
        <div style={{ marginBottom: 12 }}>
          <img
            src={ch.faceImg}
            alt={ch.name}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid #f87171`,
              boxShadow: "0 0 20px rgba(248,113,113,0.4)",
              filter: "grayscale(0.3)",
            }}
          />
        </div>

        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 36,
            fontWeight: 900,
            color: "#f87171",
            lineHeight: 1.1,
          }}
        >
          Game Over!
        </h1>

        {/* Quote */}
        <p
          style={{
            margin: "0 0 28px",
            fontSize: 18,
            fontWeight: 700,
            color: ch.accent,
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          "{ch.deathQuote}"
        </p>

        {/* Scores */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 28 }}>
          <div style={styles.scoreBox}>
            <span style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2 }}>
              Score
            </span>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{score}</span>
          </div>
          <div style={styles.scoreBox}>
            <span style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2 }}>
              Best
            </span>
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: isNewBest ? "#fbbf24" : "#fff",
              }}
            >
              {highScore}
              {isNewBest && " 🏆"}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onRestart}
            style={{
              ...styles.btn,
              background: `linear-gradient(135deg, ${ch.accent}, ${ch.accent}cc)`,
              minWidth: 140,
            }}
          >
            🔄 Restart
          </button>
          <button
            onClick={onChangeNeta}
            style={{
              ...styles.btn,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              minWidth: 140,
            }}
          >
            🔀 Change Neta
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = {
  root: {
    width: "100%",
    minHeight: "100vh",             // Let it expand for tall scrolling content
    background: `linear-gradient(160deg, #020617 0%, #0f172a 50%, #111827 100%)`,
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: "#fff",
    overflowY: "auto",              // Let the page scroll!
    overflowX: "hidden",
    position: "relative",
    WebkitUserSelect: "none",       // Prevent text selection highlight on tap
    userSelect: "none",             // Prevent text selection highlight on tap
  },
  screenCenter: {
    width: "100%",
    minHeight: "100vh",             // Let it expand naturally
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",           // More padding for mobile screens
    boxSizing: "border-box",
  },
  glassCard: {
    width: "min(96vw, 700px)",
    padding: "64px 56px",
    borderRadius: 28,
    background: CARD_BG,
    backdropFilter: "blur(20px)",
    border: `1px solid ${CARD_BORDER}`,
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    textAlign: "center",
  },
  btn: {
    padding: "24px 56px",
    border: "none",
    borderRadius: 16,
    color: "#fff",
    fontSize: 26,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.3px",
    outline: "none",
    transition: "all 0.25s ease",
  },
  playContainer: {
    width: "100%",
    height: "100vh",                // Force game screen to exactly 100vh
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    touchAction: "none",            // ONLY block touch scrolling inside the game
    overflow: "hidden",             // ONLY block overflow inside the game
  },
  scoreBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "12px 24px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};