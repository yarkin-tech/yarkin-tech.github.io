/* =========================================================
   YARKIN CRM — специфичный JS лендинга /crm/
   Подключается после /js/main.js и /js/search.js
   ========================================================= */
(function () {
    'use strict';

    /* ===== Цели Яндекс.Метрики =====
       Элементы с data-goal="click_..." шлют одноимённую цель. */
    function goal(name) {
        try {
            if (typeof ym === 'function') { ym(111985647, 'reachGoal', name); }
        } catch (err) {}
    }

    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-goal]') : null;
        if (!el) return;
        var name = el.getAttribute('data-goal');
        if (name) { goal(name); }
    });

    /* Цель scroll_to_pricing — первый раз, когда секция тарифов в кадре */
    (function () {
        var pricing = document.getElementById('pricing');
        if (!pricing) return;

        if (!('IntersectionObserver' in window)) {
            // Запасной вариант: считаем, что цель достигнута при обычном скролле
            window.addEventListener('scroll', function onScroll() {
                var r = pricing.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) {
                    window.removeEventListener('scroll', onScroll);
                    goal('scroll_to_pricing');
                }
            }, { passive: true });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    goal('scroll_to_pricing');
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });

        observer.observe(pricing);
    })();

    /* ===== FAQ: аккордеон (логика как на services.html) ===== */
    (function () {
        var items = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
        if (!items.length) return;

        function closeItem(item) {
            var answer = item.querySelector('.faq__answer');
            item.classList.remove('active');
            var question = item.querySelector('.faq__question');
            if (question) {
                question.setAttribute('aria-expanded', 'false');
            }
            if (!answer) return;
            if (answer.style.maxHeight === 'none') {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                void answer.offsetHeight;
            }
            answer.style.maxHeight = '';
        }

        function openItem(item) {
            var question = item.querySelector('.faq__question');
            var answer = item.querySelector('.faq__answer');
            item.classList.add('active');
            if (question) {
                question.setAttribute('aria-expanded', 'true');
            }
            if (answer) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                answer.addEventListener('transitionend', function onEnd(e) {
                    if (e.propertyName === 'max-height' && item.classList.contains('active')) {
                        answer.style.maxHeight = 'none';
                    }
                });
            }
        }

        items.forEach(function (item) {
            var question = item.querySelector('.faq__question');
            if (!question) return;
            question.addEventListener('click', function () {
                var isOpen = item.classList.contains('active');
                items.forEach(closeItem);
                if (!isOpen) {
                    openItem(item);
                }
            });
        });
    })();

    /* ===== Поиск: базовый патч для подпапки /crm/ =====
       search.js строит ссылки относительно текущей страницы (index.html,
       services.html, ...), а мы лежим в /crm/. Поэтому:
       1) ко всем записям индекса добавляем префикс «../»;
       2) добавляем саму страницу YARKIN CRM в выдачу. */
    (function () {
        if (typeof SITE_INDEX === 'undefined' || !Array.isArray(SITE_INDEX)) return;

        SITE_INDEX.forEach(function (entry) {
            if (!entry || typeof entry.url !== 'string') return;
            if (/^(https?:|\/\/|\.\.\/|\/)/.test(entry.url)) return;
            entry.url = '../' + entry.url;
        });

        var already = SITE_INDEX.some(function (entry) {
            return entry && entry.url === '../crm/index.html';
        });

        if (!already) {
            SITE_INDEX.unshift({
                name: 'YARKIN CRM',
                type: 'Страница',
                url: '../crm/index.html',
                keywords: 'crm, црм, калькулятор, сервисный центр, ремонт, заказы, клиенты, склад, финансы, документы, без облака, offline, лицензия, тарифы'
            });
        }
    })();

    /* ===== Прелоадер =====
       Скрываем после полной загрузки; CSS-анимация позаботится
       об этом и без JS, чтобы контент никогда не «завис». */
    (function () {
        var preloader = document.getElementById('crm-preloader');
        if (!preloader) return;

        function hide() {
            preloader.classList.add('is-hidden');
            window.setTimeout(function () {
                if (preloader.parentNode) { preloader.parentNode.removeChild(preloader); }
            }, 500);
        }

        if (document.readyState === 'complete') {
            hide();
        } else {
            window.addEventListener('load', hide);
            // Страховка: убираем даже если load долго не приходит
            window.setTimeout(hide, 2500);
        }
    })();
})();
