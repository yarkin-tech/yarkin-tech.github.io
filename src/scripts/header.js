// Поведение шапки: dropdown «Продукты», бургер, Ctrl+K, blur при скролле.
// Vanilla JS, без библиотек. Ошибки изолированы, чтобы не ломать страницу.
(function () {
    'use strict';

    function safe(fn) {
        try { fn(); } catch (err) {
            if (window.console && console.warn) { console.warn('header.js:', err); }
        }
    }

    // Dropdown «Продукты»: клик открывает/закрывает, закрытие по ESC и клику вне
    safe(function () {
        var dropdowns = document.querySelectorAll('.nav-dropdown');
        if (!dropdowns.length) return;

        function setOpen(dropdown, open) {
            var toggle = dropdown.querySelector('.nav-dropdown__toggle');
            dropdown.classList.toggle('open', open);
            if (toggle) { toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); }
        }

        dropdowns.forEach(function (dropdown) {
            var toggle = dropdown.querySelector('.nav-dropdown__toggle');
            if (!toggle) return;
            toggle.addEventListener('click', function () {
                setOpen(dropdown, !dropdown.classList.contains('open'));
            });
        });

        // Закрытие по клику вне
        document.addEventListener('click', function (e) {
            dropdowns.forEach(function (dropdown) {
                if (!dropdown.contains(e.target)) { setOpen(dropdown, false); }
            });
        });

        // Закрытие по ESC
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            dropdowns.forEach(function (dropdown) { setOpen(dropdown, false); });
        });
    });

    // Мобильное бургер-меню: открытие/закрытие + блокировка скролла body
    safe(function () {
        var toggle = document.querySelector('.menu-toggle');
        var nav = document.querySelector('.nav-menu');
        if (!toggle || !nav) return;

        function closeMenu() {
            nav.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Открыть меню');
            document.body.classList.remove('menu-open');
        }

        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('open');
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
            document.body.classList.toggle('menu-open', open);
        });

        // Закрываем меню после выбора пункта
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });
    });

    // Ctrl+K: фокус на поле поиска (логика поиска — заглушка до шага блога)
    safe(function () {
        var input = document.getElementById('search-input');
        if (!input) return;

        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    });

    // Sticky-шапка: blur-эффект при скролле (класс .scrolled, стиль в global.css)
    safe(function () {
        var header = document.querySelector('.site-header');
        if (!header) return;
        function onScroll() {
            var y = window.pageYOffset || document.documentElement.scrollTop;
            header.classList.toggle('scrolled', y > 8);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    });
})();
