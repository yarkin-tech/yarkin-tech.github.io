/* ===== Клиентский поиск по сайту (шапка-пилюля) =====
   Массив всех страниц и статей: название + ключевые слова + ссылка. */
var SITE_INDEX = [
    { name: 'Главная', type: 'Страница', url: 'index.html', keywords: 'главная, инженерные решения, ии, нейросети, интеграция, сборка, ремонт, пк, ноутбук, сервер, hero' },
    { name: 'Услуги и прайс', type: 'Страница', url: 'services.html', keywords: 'услуги, цены, прайс, ремонт, сборка, пк, ноутбук, смартфон, планшет, сервер, нейросети, настройка, апгрейд, чистка' },
    { name: 'Блог и кейсы', type: 'Страница', url: 'blog.html', keywords: 'блог, кейсы, статьи, железо, софт, ии, советы, обзоры, инженер' },
    { name: 'Сайты под ключ', type: 'Страница', url: 'web.html', keywords: 'сайт, сайты, визитка, лендинг, бизнес, мастер, дизайн, адаптивность, размещение, домен, seo, абонемент' },
    { name: 'Обо мне', type: 'Страница', url: 'about.html', keywords: 'обо мне, артур, инженер, история, опыт, принципы, подход, ценности' },
    { name: 'Контакты', type: 'Страница', url: 'contact.html', keywords: 'контакты, связаться, телефон, почта, telegram, заявка, звонок, адрес' },
    { name: 'Политика конфиденциальности', type: 'Страница', url: 'privacy.html', keywords: 'политика, конфиденциальность, персональные данные, cookie, 152-фз, защита данных, обработка, согласие' },
    { name: 'Как собрать ПК для нейросетей в 2026 году', type: 'Статья', url: 'blog-ai-pc.html', keywords: 'пк, нейросеть, видеопамять, vram, rtx, cuda, сборка, gpu, оперативная память, ssd, охлаждение' },
    { name: 'Почему игровой ПК за 100 000 ₽ тормозит в монтаже', type: 'Статья', url: 'blog-laptop.html', keywords: 'игровой пк, монтаж, видео, видеомонтаж, тормозит, fps, cpu, процессор, производительность' },
    { name: 'Локальная нейросеть на ноутбуке: что реально возможно', type: 'Статья', url: 'blog-neiro.html', keywords: 'нейросеть, ноутбук, локально, llm, ии, возможно, портативный, ollama' },
    { name: 'Мой первый ПК: что собрал 10-летний пацан в 2009 году', type: 'Кейс', url: 'blog-case-2009.html', keywords: 'первый пк, 2009, история, кейс, сборка, детство, радиодетали' },
    { name: 'Сайт YARKIN: как я собрал бренд-хаб с нуля за неделю', type: 'Кейс', url: 'blog-case-site.html', keywords: 'сайт, yarkin, бренд, кейс, неделя, разработка, стек' },
    { name: 'iconBIT Mercury X: мой первый Android и начало мобильной экспертизы', type: 'Кейс', url: 'blog-case-mercury.html', keywords: 'iconbit, mercury, android, смартфон, кейс, мобильный, планшет' },
    { name: 'Собрать ПК самому или заказать сборку: честное сравнение', type: 'Гайд', url: 'blog-seo-build.html', keywords: 'сборка, собрать самому, заказать, сравнение, гарантия, гайд, мастер' },
    { name: 'Сколько стоит собрать ПК в 2026: реалистичные бюджеты', type: 'Гайд', url: 'blog-seo-budget.html', keywords: 'бюджет, сколько стоит, пк, 2026, цена, стоимость, сборка, гайд, экономия' }
];
(function () {
    'use strict';

    var input = document.getElementById('search-input');
    var wrap = document.getElementById('header-search');
    if (!input || !wrap) return;

    var box = document.getElementById('search-results');
    var activeIndex = -1;
    box.hidden = true;

    var TYPE_LABEL = {
        'страница': 'Страница',
        'статья': 'Статья',
        'кейс': 'Кейс',
        'гайд': 'Гайд'
    };

    function clean(s) {
        return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function render(query) {
        box.innerHTML = '';
        activeIndex = -1;
        var q = clean(query);
        if (!q) {
            box.hidden = true;
            return;
        }

        // Пасхалка: если ищут «arch» (CachyOS / Arch намек) — добавляем пункт-мем
        if (q.indexOf('arch') !== -1) {
            var egg = document.createElement('button');
            egg.type = 'button';
            egg.className = 'header-search__easter';
            egg.textContent = '🐧 I use Arch, btw — ты наш человек';
            egg.addEventListener('click', openArch);
            box.appendChild(egg);
        }

        var matches = SITE_INDEX
            .map(function (entry) {
                var name = clean(entry.name);
                var kw = clean(entry.keywords);
                var score;
                if (name.indexOf(q) !== -1) {
                    score = name.indexOf(q) === 0 ? 0 : 1;
                } else if (kw.indexOf(q) !== -1) {
                    score = 2;
                } else {
                    return null;
                }
                var typeLabel = TYPE_LABEL[clean(entry.type)] || entry.type;
                return { score: score, entry: entry, type: typeLabel };
            })
            .filter(Boolean)
            .sort(function (a, b) { return a.score - b.score; })
            .slice(0, 8);

        if (!matches.length) {
            var none = document.createElement('div');
            none.className = 'header-search__none';
            none.textContent = 'Ничего не найдено';
            box.appendChild(none);
        } else {
            matches.forEach(function (m) {
                var el = document.createElement('a');
                el.className = 'header-search__item';
                el.href = m.entry.url;

                var name = document.createElement('span');
                name.className = 'header-search__name';
                name.textContent = m.entry.name;

                var type = document.createElement('span');
                type.className = 'header-search__type';
                type.textContent = m.type;

                el.appendChild(name);
                el.appendChild(type);
                box.appendChild(el);
            });
        }
        box.hidden = false;
    }

    function links() {
        return box.querySelectorAll('.header-search__item, .header-search__easter');
    }

    function setActive(index) {
        var all = links();
        if (!all.length) return;
        activeIndex = (index + all.length) % all.length;
        all.forEach(function (link, i) {
            link.classList.toggle('active', i === activeIndex);
        });
        if (all[activeIndex]) {
            all[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    function openAndRender() {
        if (window.innerWidth < 768) return;
        input.focus();
        if (input.value.trim()) render(input.value);
    }
input.addEventListener('input', function () {
        render(input.value);
    });

    input.addEventListener('focus', function () {
        if (input.value.trim()) render(input.value);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!box.hidden) setActive(activeIndex + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!box.hidden) setActive(activeIndex - 1);
        } else if (e.key === 'Enter') {
            var all = links();
            if (all.length) {
                (all[activeIndex] || all[0]).click();
            }
        } else if (e.key === 'Escape') {
            box.hidden = true;
            box.innerHTML = '';
            input.blur();
        }
    });

    // Клик по результату должен сохранять фокус в поле до перехода,
    // а скролл списка (колесо/ползунок) — работать как обычно
    box.addEventListener('mousedown', function (e) {
        if (e.target.closest && e.target.closest('.header-search__item, .header-search__easter')) {
            e.preventDefault();
        }
    });

    // Закрытие по клику вне поля
    document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) {
            box.hidden = true;
        }
    });

    // Пасхалка «Arch»: модалка-мем
    var archModal = null;

    function buildArchModal() {
        var overlay = document.createElement('div');
        overlay.className = 'arch-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-hidden', 'true');

        var card = document.createElement('div');
        card.className = 'arch-card';

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'arch-card__close';
        close.setAttribute('aria-label', 'Закрыть');
        close.innerHTML = '&times;';

        var title = document.createElement('h3');
        title.className = 'arch-card__title';
        title.textContent = '🐧 I use Arch, btw';

        var text = document.createElement('p');
        text.className = 'arch-card__text';
        text.textContent = 'Уважение +100. Скидки не даём — арчевцам скидки не нужны, им бы wiki почитать.';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arch-card__btn';
        btn.textContent = 'Ясно, я с вами';

        card.appendChild(close);
        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(btn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        return overlay;
    }

    function openArch() {
        if (!archModal) archModal = buildArchModal();
        archModal.classList.add('open');
        archModal.setAttribute('aria-hidden', 'false');
        box.hidden = true;
        box.innerHTML = '';
        input.blur();
    }

    function closeArch() {
        if (archModal) {
            archModal.classList.remove('open');
            archModal.setAttribute('aria-hidden', 'true');
        }
    }

    document.addEventListener('click', function (e) {
        if (e.target.classList && (e.target.classList.contains('arch-overlay') ||
            e.target.classList.contains('arch-card__close') ||
            e.target.classList.contains('arch-card__btn'))) {
            closeArch();
        }
    });

    // Ctrl/Cmd + K — фокус в поле поиска; Esc — закрыть список и модалку
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openAndRender();
        } else if (e.key === 'Escape') {
            if (archModal && archModal.classList.contains('open')) {
                closeArch();
                return;
            }
            if (!box.hidden) {
                box.hidden = true;
                box.innerHTML = '';
            }
        }
    });
})();