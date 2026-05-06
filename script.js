/* ================================================
   MY KIND OF WOMAN — script.js v3 (sin uploads)
   ================================================ */

// ============================================================
// 1. PETALS CANVAS
// ============================================================
const canvas = document.getElementById('petals-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas, { passive: true });

const PETAL_COLORS = [
    'rgba(247,221,224,',
    'rgba(232,134,154,',
    'rgba(250,238,240,',
    'rgba(212,165,176,',
    'rgba(255,255,255,',
    'rgba(200,213,185,',
];

class Petal {
    constructor(isInitial = false) { this.spawn(isInitial); }
    spawn(initial = false) {
        this.x     = Math.random() * canvas.width;
        this.y     = initial ? Math.random() * canvas.height : -20;
        this.r     = Math.random() * 11 + 5;
        this.vy    = Math.random() * 1.1 + 0.3;
        this.vx    = (Math.random() - 0.5) * 0.7;
        this.rot   = Math.random() * Math.PI * 2;
        this.rSpeed = (Math.random() - 0.5) * 0.028;
        this.alpha = Math.random() * 0.55 + 0.18;
        this.col   = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
        this.sway  = Math.random() * Math.PI * 2;
        this.swayS = Math.random() * 0.018 + 0.005;
        this.swayA = Math.random() * 1.4 + 0.4;
        this.type  = Math.floor(Math.random() * 3);
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.col + '1)';
        if (this.type === 0) {
            ctx.beginPath();
            ctx.ellipse(0, 0, this.r * 0.38, this.r, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 1) {
            ctx.beginPath();
            ctx.moveTo(0, -this.r);
            ctx.bezierCurveTo( this.r*.5, -this.r*.4,  this.r*.5,  this.r*.3, 0,  this.r*.6);
            ctx.bezierCurveTo(-this.r*.5,  this.r*.3, -this.r*.5, -this.r*.4, 0, -this.r);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 0.48, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    update() {
        this.sway += this.swayS;
        this.x    += Math.sin(this.sway) * this.swayA + this.vx;
        this.y    += this.vy;
        this.rot  += this.rSpeed;
        if (this.y > canvas.height + 25) this.spawn();
    }
}

const petals = Array.from({ length: 38 }, (_, i) => new Petal(true));

(function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
})();


// ============================================================
// 2. CUSTOM CURSOR
// ============================================================
const dot  = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');

let mx = -100, my = -100;
let rx = -100, ry = -100;

document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
});

(function cursorLoop() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(cursorLoop);
})();

document.querySelectorAll('a, button, .ptag').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovered'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovered'));
});


// ============================================================
// 3. HERO REVEAL ON LOAD
// ============================================================
window.addEventListener('load', () => {
    document.querySelectorAll('.rh').forEach((el, i) => {
        setTimeout(() => el.classList.add('vis'), 350 + i * 180);
    });
});


// ============================================================
// 4. SCROLL REVEAL
// ============================================================
const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const siblings = Array.from(
            entry.target.closest('section, .letter-card, .together-grid')
                ?.querySelectorAll('.reveal') ?? [entry.target]
        );
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('visible'), idx * 80);
        revealObs.unobserve(entry.target);
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));


// ============================================================
// 5. LYRIC CHAR-BY-CHAR REVEAL
// ============================================================
function wrapTextChars(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(tn => {
        const frag = document.createDocumentFragment();
        [...tn.textContent].forEach(ch => {
            if (ch === ' ' || ch === '\u00a0') {
                frag.appendChild(document.createTextNode('\u00a0'));
            } else {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = ch;
                frag.appendChild(span);
            }
        });
        tn.parentNode.replaceChild(frag, tn);
    });
}

document.querySelectorAll('[data-lyric]').forEach(lq => wrapTextChars(lq));

const lyricObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const chars = entry.target.querySelectorAll('.char');
        chars.forEach((ch, i) => {
            setTimeout(() => ch.classList.add('revealed'), i * 22);
        });
        lyricObs.unobserve(entry.target);
    });
}, { threshold: 0.35 });

document.querySelectorAll('[data-lyric]').forEach(lq => lyricObs.observe(lq));


// ============================================================
// 6. HERO PARALLAX
// ============================================================
const heroSection = document.querySelector('.hero');
const heroContent = document.querySelector('.hero-content');
const heroBlooms  = document.querySelector('.hero-blooms');

window.addEventListener('scroll', () => {
    if (!heroSection) return;
    const y = window.scrollY;
    const h = heroSection.offsetHeight;
    if (y < h) {
        const p = y / h;
        if (heroContent) {
            heroContent.style.transform = `translateY(${y * 0.28}px)`;
            heroContent.style.opacity   = `${1 - p * 1.6}`;
        }
        if (heroBlooms) {
            heroBlooms.style.transform = `translateY(${y * 0.12}px)`;
        }
    }
}, { passive: true });


// ============================================================
// 7. FEATURED SECTION — sparkle burst on enter
// ============================================================
const featSection = document.querySelector('.section-feat');
let sparkled = false;

if (featSection) {
    const sparkObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !sparkled) {
            sparkled = true;
            burstSparkles(featSection);
        }
    }, { threshold: 0.3 });
    sparkObs.observe(featSection);
}

function burstSparkles(container) {
    const glyphs = ['✦', '✧', '❀', '✿', '❋', '✵'];
    for (let i = 0; i < 14; i++) {
        setTimeout(() => {
            const s = document.createElement('span');
            s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            const size = (Math.random() * 1.4 + 0.5).toFixed(2);
            s.style.cssText = `
                position:absolute;
                color:rgba(255,255,255,.75);
                font-size:${size}rem;
                left:${(Math.random()*90+5).toFixed(1)}%;
                top:${(Math.random()*80+10).toFixed(1)}%;
                pointer-events:none;
                z-index:5;
                animation:sparkPop 1.1s ease forwards;
            `;
            container.appendChild(s);
            setTimeout(() => s.remove(), 1200);
        }, i * 90);
    }
}

const kf = document.createElement('style');
kf.textContent = `
    @keyframes sparkPop {
        0%   { opacity:0; transform:scale(0) rotate(0deg); }
        45%  { opacity:1; transform:scale(1.4) rotate(160deg); }
        100% { opacity:0; transform:scale(.7) rotate(320deg) translateY(-22px); }
    }
`;
document.head.appendChild(kf);


// ============================================================
// 8. PHOTO FRAME TILT (3-D hover)
// ============================================================
document.querySelectorAll('.pframe').forEach(frame => {
    const inner = frame.querySelector('.pinner, .video-inner');
    if (!inner) return;

    frame.addEventListener('mousemove', e => {
        const rect = frame.getBoundingClientRect();
        const cx   = rect.left + rect.width / 2;
        const cy   = rect.top  + rect.height / 2;
        const rx   = ((e.clientY - cy) / (rect.height / 2)) * -5;
        const ry   = ((e.clientX - cx) / (rect.width  / 2)) *  5;
        inner.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
        inner.style.transition = 'transform .15s ease';
    });
    frame.addEventListener('mouseleave', () => {
        inner.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
        inner.style.transition = 'transform .5s ease';
    });
});


// ============================================================
// 9. TYPEWRITER FOR LETTER (on scroll enter)
// ============================================================
const letterCard = document.querySelector('.letter-card');
let letterTyped  = false;

if (letterCard) {
    const ltObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !letterTyped) {
            letterTyped = true;
            animateLetter();
        }
    }, { threshold: 0.25 });
    ltObs.observe(letterCard);
}

function animateLetter() {
    const paras = document.querySelectorAll('.letter-body p');
    paras.forEach((p, pi) => {
        p.style.opacity = '0';
        p.style.transform = 'translateY(12px)';
        p.style.transition = 'opacity .6s ease, transform .6s ease';
        setTimeout(() => {
            p.style.opacity   = '1';
            p.style.transform = 'translateY(0)';
        }, 300 + pi * 220);
    });
}


// ============================================================
// 10. SUBTLE SECTION BG PARALLAX
// ============================================================
const parallaxSections = document.querySelectorAll('.lyric-band');
window.addEventListener('scroll', () => {
    parallaxSections.forEach(sec => {
        const rect = sec.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        const bloom = sec.querySelector('.band-bloom');
        if (bloom) {
            bloom.style.transform = `translateY(${center * 0.06}px)`;
        }
    });
}, { passive: true });