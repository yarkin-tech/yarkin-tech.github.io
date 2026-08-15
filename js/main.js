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