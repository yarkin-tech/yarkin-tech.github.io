// Глобальный скрипт сайта (Astro): fade-in анимации + цели Яндекс.Метрики.
// Логика fade-in перенесена 1:1 со старого js/main.js:
// те же цели (.card, .reveal, h2, .timeline-item), те же классы
// (.reveal -> .active) и threshold 0.15, что и в global.css.

// ВАЖНО: модуль импортируется в layout и выполняется на сервере при сборке.
// Весь DOM-код запускаем только в браузере.
if (typeof document !== 'undefined') {

// ===== Плавное появление секций и карточек при скролле =====
(function () {
    var targets = document.querySelectorAll('.card, .reveal, h2, .timeline-item');

    var reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || reducedMotion) {
        // Запасной вариант / "уменьшить движение": показываем всё сразу
        targets.forEach(function (el) {
            el.classList.add('active');
        });
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    targets.forEach(function (el) {
        observer.observe(el);
    });
})();

// ===== Цели-события Яндекс.Метрики (делегирование) =====
// Номер счётчика задаётся data-атрибутом <body data-metrika-id="..."> в BaseLayout.
// Пока счётчик не подключён (плейсхолдер) — вызов не выполняется и не падает.
(function () {
    var counterId = document.body.getAttribute('data-metrika-id');

    function goal(name) {
        try {
            if (counterId && typeof ym === 'function') {
                ym(Number(counterId), 'reachGoal', name);
            }
        } catch (err) { /* метрика не критична */ }
    }

    document.addEventListener('click', function (e) {
        var g = e.target && e.target.closest ? e.target.closest('[data-goal]') : null;
        var gName = g ? g.getAttribute('data-goal') : '';
        if (gName) { goal(gName); }

        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('crm/') !== -1) { goal('click_product_crm'); return; }
        if (href.indexOf('tel:') === 0) { goal('click_phone'); return; }
        if (href.indexOf('t.me') !== -1) { goal('click_tg'); return; }
        if (href.indexOf('max.ru') !== -1) { goal('click_max'); return; }
        if (href.indexOf('vk.ru') !== -1) { goal('click_vk'); return; }
        if (href.indexOf('mailto:') === 0) { goal('copy_email'); }
    });

    document.addEventListener('submit', function () { goal('send_form'); }, true);
})();

// ===== Анимация терминала в hero: посимвольная печать строк =====
// (перенесено 1:1 из старого js/main.js — на шаге 4.1 этот модуль был упущен)
(function () {
    var body = document.querySelector('.terminal-body');
    if (!body) return;

    var lines = Array.prototype.slice.call(body.querySelectorAll('.terminal-line'));
    var typeDelay = 40; // мс на символ
    var reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function makeCursor() {
        var c = document.createElement('span');
        c.className = 'terminal-cursor';
        return c;
    }

    // Упрощённый режим: показываем все строки сразу + статичный курсор
    if (reducedMotion) {
        lines.forEach(function (line) {
            line.textContent = line.getAttribute('data-text');
        });
        var staticCursor = makeCursor();
        body.appendChild(staticCursor);
        return;
    }

    function typeLine(idx) {
        if (idx >= lines.length) {
            // Все строки напечатаны — оставляем мигающий курсор в конце
            var cursor = makeCursor();
            body.appendChild(cursor);
            return;
        }

        var line = lines[idx];
        var text = line.getAttribute('data-text') || '';
        var cursor = makeCursor();
        var pos = 0;
        line.appendChild(cursor);

        (function tick() {
            if (pos < text.length) {
                line.insertBefore(document.createTextNode(text[pos]), cursor);
                pos++;
                window.setTimeout(tick, typeDelay);
            } else {
                // Строка закончена: убираем курсор и пауза перед следующей
                cursor.remove();
                window.setTimeout(function () {
                    typeLine(idx + 1);
                }, typeDelay * 3);
            }
        })();
    }

    window.setTimeout(function () {
        typeLine(0);
    }, 400);
})();

// ===== Счётчик дней в индустрии: с 1 апреля 2009 до сегодня =====
// (дата старта — из старого сайта: «В индустрии с 2009 года» + Kernel: инженер с 2009)
(function () {
    var el = document.getElementById('days-in-industry');
    if (!el) return;

    var now = new Date();
    var start = new Date(2009, 3, 1); // 1 апреля 2009
    var days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    el.textContent = days.toLocaleString('ru-RU');
})();

// ===== Полоска прогресса прокрутки (перенесено 1:1 из старого js/main.js) =====
(function () {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    function update() {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var pct = max > 0 ? (window.pageYOffset || doc.scrollTop) / max * 100 : 0;
        bar.style.width = (pct <= 100 ? pct : 100) + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
})();

// ===== Кнопка "Наверх" (перенесено 1:1 из старого js/main.js) =====
(function () {
    var btn = document.createElement('button');
    btn.className = 'scroll-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Наверх');
    btn.innerHTML = '&#8593;';
    document.body.appendChild(btn);

    var shown = false;

    function onScroll() {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        var isOver = y > 600;
        if (isOver !== shown) {
            shown = isOver;
            btn.classList.toggle('visible', isOver);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// ===== Свечение, следующее за курсором на карточках (1:1 из старого js/main.js) =====
(function () {
    var cards = document.querySelectorAll('.card');
    if (!cards.length) return;

    cards.forEach(function (card) {
        var glow = document.createElement('span');
        glow.className = 'card-glow';
        card.appendChild(glow);

        card.addEventListener('mousemove', function (e) {
            var r = card.getBoundingClientRect();
            glow.style.left = (e.clientX - r.left) + 'px';
            glow.style.top = (e.clientY - r.top) + 'px';
        });

        card.addEventListener('mouseenter', function () {
            glow.classList.add('active');
        });

        card.addEventListener('mouseleave', function () {
            glow.classList.remove('active');
        });
    });
})();

// ===== Параллакс в hero: блобы и сетка движутся медленнее контента (1:1) =====
(function () {
    var grid = document.querySelector('.hero-bg');
    if (!grid) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    var ticking = false;
    var factor = 0.35; // коэффициент 0.3-0.4

    function update() {
        ticking = false;
        var y = window.pageYOffset || document.documentElement.scrollTop;
        grid.style.transform = 'translateY(' + (-y * factor).toFixed(1) + 'px)';
    }

    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
    }, { passive: true });
})();

// ===== Световой след за курсором в hero (только десктоп, pointer: fine) =====
// (перенесено 1:1 из старого js/main.js — упущен на шаге 4.1)
(function () {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    var glow = document.createElement('span');
    glow.className = 'hero-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    hero.appendChild(glow);

    var target = { x: -400, y: -400 };
    var cur = { x: -400, y: -400 };
    var raf = null;

    function step() {
        cur.x += (target.x - cur.x) * 0.14; // мягкое отставание
        cur.y += (target.y - cur.y) * 0.14;
        glow.style.transform = 'translate(' + cur.x + 'px, ' + cur.y + 'px) translate(-50%, -50%)';
        if (Math.abs(target.x - cur.x) > 0.5 || Math.abs(target.y - cur.y) > 0.5) {
            raf = window.requestAnimationFrame(step);
        } else {
            raf = null;
        }
    }

    hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        target.x = e.clientX - r.left;
        target.y = e.clientY - r.top;
        glow.classList.add('visible');
        if (!raf) {
            raf = window.requestAnimationFrame(step);
        }
    });

    hero.addEventListener('mouseleave', function () {
        if (raf) { window.cancelAnimationFrame(raf); raf = null; }
        glow.classList.remove('visible');
    });
})();

// ===== Пасхалка Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A =====
// (перенесено 1:1 из старого js/main.js — упущено на шаге 4.1; ссылка правлена на /contact/)
(function () {
    var code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;
    var modal = null;

    function buildModal() {
        var overlay = document.createElement('div');
        overlay.className = 'konami-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-hidden', 'true');

        var card = document.createElement('div');
        card.className = 'konami-card';

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'konami-close';
        close.setAttribute('aria-label', 'Закрыть');
        close.innerHTML = '&times;';

        var title = document.createElement('h3');
        title.textContent = '🎮 Ты нашёл пасхалку!';

        var text = document.createElement('p');
        text.textContent = 'Код Konami — привет из эпохи Dendy и NES. Ты свой человек. Покажи этот экран при заказе — скидка 10% на первую услугу.';

        var btn = document.createElement('a');
        btn.className = 'btn btn-primary';
        btn.href = '/contact/';
        btn.textContent = 'Забрать скидку';

        card.appendChild(close);
        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        return overlay;
    }

    function openModal() {
        if (!modal) modal = buildModal();
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
            return;
        }
        if (e.key === code[pos]) {
            pos++;
        } else {
            pos = (e.key === code[0]) ? 1 : 0;
        }
        if (pos === code.length) {
            pos = 0;
            openModal();
        }
    });

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('konami-close') || e.target.classList.contains('konami-overlay')) {
            closeModal();
        }
    });

    // Подсказка о пасхалке в футере
    var footerBottom = document.querySelector('.footer-bottom');
    if (footerBottom) {
        var hint = document.createElement('p');
        hint.className = 'footer-konami-hint';
        hint.textContent = '↑↑↓↓←→←→BA — для тех, кто в теме 🎮';
        footerBottom.appendChild(hint);
    }
})();
}
