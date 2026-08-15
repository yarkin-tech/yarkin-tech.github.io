// Основной JavaScript

// Определение активной страницы по текущему URL
(function () {
    // Получаем имя текущего файла из URL (например, "about.html")
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.nav-menu a');

    links.forEach(function (link) {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
})();

// Плавное появление секций и карточек при скролле
(function () {
    var targets = document.querySelectorAll('.card, .reveal');

    if (!('IntersectionObserver' in window)) {
        // Запасной вариант: показываем всё сразу
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

// Мобильное бургер-меню
(function () {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav-menu');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });

    // Закрываем меню после выбора пункта
    nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            nav.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
})();

// Обработка формы обратной связи
(function () {
    var form = document.getElementById('contact-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        alert('Спасибо! Ваша заявка отправлена. Я свяжусь с вами в ближайшее время.');
        form.reset();
    });
})();

// Анимация терминала в hero: посимвольная печать строк
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

// Полоска прогресса прокрутки (самый верх страницы, поверх шапки)
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

// Кнопка "Наверх" — появляется после 600px скролла, плавный скролл наверх
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

// Свечение, следующее за курсором при наведении на карточки
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

// Параллакс в hero на index.html: блобы и сетка движутся чуть медленнее контента
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