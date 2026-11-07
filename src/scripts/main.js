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
}
