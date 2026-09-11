/* ============================================================================
   Pinned slide deck — scroll-scrubbed transitions across all 5 slides.

   Global progress g (0..4) is derived from how far the .stage has scrolled.
   Each integer step is one transition:
     seg 0 : slide 1 -> 2  (hero: pieces fly out, polygons open, product reveals)
     seg 1 : slide 2 -> 3  }
     seg 2 : slide 3 -> 4  }  close/open: polygons close then re-open, product
     seg 3 : slide 4 -> 5  }  swaps at the centre, text boxes slide out then in
   Omega / Rockman / Born are identical & same-position on every slide, so they
   simply appear to stay put through every dissolve.
   ========================================================================== */
(function () {
    const stage = document.querySelector('.stage');
    if (!stage) return;

    const TRANSITIONS = 4;
    const TEXT_SHIFT = 8; // vh a text box travels as it slides in / out

    // Scroll timeline: each transition is followed by a short "hold" where the
    // arrived slide sits still before the next one starts closing in.
    const TRANSITION_W = 4; // relative scroll length of a transition
    const HOLD_W = 1;       // relative scroll length of the pause after it
    const phases = [];
    for (let i = 0; i < TRANSITIONS; i++) {
        phases.push({ kind: 'trans', w: TRANSITION_W, a: i });     // g: i -> i + 1
        phases.push({ kind: 'hold', w: HOLD_W, g: i + 1 });        // dwell on the arrived slide
    }
    const totalW = phases.reduce(function (s, ph) { return s + ph.w; }, 0);

    // Map raw scroll fraction (0..1) to global progress g (0..TRANSITIONS),
    // pausing on the hold phases.
    function scrollToG(rawT) {
        let pos = rawT * totalW;
        for (let i = 0; i < phases.length; i++) {
            const ph = phases[i];
            if (pos < ph.w) return ph.kind === 'trans' ? ph.a + pos / ph.w : ph.g;
            pos -= ph.w;
        }
        return TRANSITIONS;
    }

    // Cache each slide and the pieces we animate on it
    const slides = [1, 2, 3, 4, 5].map(function (n) {
        const el = document.getElementById('section' + n);
        return {
            el: el,
            up: el.querySelector('.polygon-up'),
            dn: el.querySelector('.polygon-down'),
            product: el.querySelector('.product'),
            intro: el.querySelector('.intro'),
            omega: el.querySelector('.omega'),
            rockman: el.querySelector('.rockman'),
            born: el.querySelector('.born')
        };
    });

    // Hero-only pieces
    const s1 = slides[0].el;
    const product1 = s1.querySelector('.product');
    const mountain = s1.querySelector('.mountain');
    const heroText = s1.querySelector('.hero-text');
    const features = s1.querySelector('.features');

    const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

    // distance from a polygon's resting centre to the viewport centre
    function polyDelta(poly) {
        return (window.innerHeight / 2) - (poly.offsetTop + poly.offsetHeight / 2);
    }
    // c: 0 = open (rest), 1 = closed. POLY_TRAVEL trims how far they move.
    const POLY_TRAVEL = 0.6; // travel 20% less than the full distance to centre
    function setPolys(slide, c) {
        const k = c * POLY_TRAVEL;
        if (slide.up) slide.up.style.transform = 'translateX(-50%) translateY(' + (polyDelta(slide.up) * k) + 'px)';
        if (slide.dn) slide.dn.style.transform = 'translateX(-50%) translateY(' + (polyDelta(slide.dn) * k) + 'px)';
    }
    // r: inset percentage — 0 = fully open, 50 = collapsed to the centre line
    function setProduct(slide, r) {
        if (slide.product) slide.product.style.clipPath = 'inset(' + r + '% 0% ' + r + '% 0%)';
    }
    // op: opacity, tyVh: vertical shift in vh
    function setIntro(slide, op, tyVh) {
        if (slide.intro) {
            slide.intro.style.opacity = String(op);
            slide.intro.style.transform = 'translateY(' + tyVh + 'vh)';
        }
    }

    function render() {
        const denom = stage.offsetHeight - window.innerHeight;
        const rawT = denom > 0 ? clamp(-stage.getBoundingClientRect().top / denom, 0, 1) : 0;
        const g = scrollToG(rawT);
        const seg = Math.min(Math.floor(g), TRANSITIONS - 1);
        const p = clamp(g - seg, 0, 1);

        // hide everything, then light up only the two slides in play
        for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            s.el.style.opacity = '0';
            ['up', 'dn', 'omega', 'rockman', 'born', 'intro'].forEach(function (k) {
                if (s[k]) s[k].style.opacity = '';
            });
        }

        if (seg === 0) {
            // ---- Hero -> Slide 2 ---------------------------------------------
            // Phase 1: the ENTIRE hero disappears (only bc2 dissolves in behind it).
            // Phase 2: slide 2's elements then appear and their animations play.
            const SPLIT = 0.5;
            const heroP = clamp(p / SPLIT, 0, 1);                    // hero leaves: p 0 -> SPLIT
            const slideP = clamp((p - SPLIT) / (1 - SPLIT), 0, 1);   // slide 2 in:  p SPLIT -> 1
            const to = slides[1];

            // hero fades + slides away; slide 2's background stays to receive the dissolve
            s1.style.opacity = String(1 - heroP);
            to.el.style.opacity = '1';
            if (product1) product1.style.transform = 'translate(-50%, -50%) translateY(' + (-heroP * 100) + 'vh)';
            if (mountain)  mountain.style.transform  = 'translateX(-50%) translateY(' + (-heroP * 100) + 'vh)';
            if (heroText)  heroText.style.transform  = 'translateY(' + (heroP * 100) + 'vh)';
            if (features)  features.style.transform  = 'translateX(' + (-heroP * 100) + 'vw)';

            // Omega / Rockman / Born stay visible the whole time — slide 2 holds
            // identical copies in the same spot, so the hero's fade is seamless.
            // The rest of slide 2 stays hidden until the hero is gone, then appears.
            const appear = String(slideP);
            if (to.up)      to.up.style.opacity = appear;
            if (to.dn)      to.dn.style.opacity = appear;
            if (to.intro) { to.intro.style.opacity = appear; to.intro.style.transform = 'translateY(0)'; }
            setPolys(to, 1 - slideP);          // polygons open from centre
            setProduct(to, 50 * (1 - slideP)); // product reveals from centre
        } else {
            // ---- Slide N -> N+1: same two-phase pattern as the hero ----------
            // Phase 1: the old slide clears out (background dissolves, product
            //   collapses, text slides out) as the polygon shutter closes.
            // Phase 2: the new slide appears (product reveals, text slides in)
            //   as the shutter opens. Omega / Rockman / Born stay put throughout.
            const SPLIT = 0.5;
            const fromP = clamp(p / SPLIT, 0, 1);                 // old leaves:  p 0 -> SPLIT
            const toP = clamp((p - SPLIT) / (1 - SPLIT), 0, 1);   // new arrives: p SPLIT -> 1
            const from = slides[seg];
            const to = slides[seg + 1];

            from.el.style.opacity = String(1 - fromP); // old gone by the midpoint
            to.el.style.opacity = '1';                 // new bg + persistent wordmarks/shutter

            // polygon shutter: one continuous close -> open, on screen throughout
            const shutter = p <= SPLIT ? fromP : (1 - toP); // 0 -> 1 -> 0
            setPolys(from, shutter);
            setPolys(to, shutter);

            // product swaps behind the closed shutter
            setProduct(from, 50 * fromP);     // collapse (phase 1)
            setProduct(to, 50 * (1 - toP));   // reveal   (phase 2)

            // text boxes swap out then in
            setIntro(from, 1 - fromP, fromP * TEXT_SHIFT); // slide out (phase 1)
            setIntro(to, toP, (1 - toP) * TEXT_SHIFT);     // slide in  (phase 2)
        }
    }

    let ticking = false;
    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(function () { render(); ticking = false; });
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', render);
    render();
})();
