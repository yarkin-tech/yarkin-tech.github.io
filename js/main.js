// Текущие задачи на главной (обновление — только этот массив)
const currentWork = [
    { emoji: '🖥️', text: 'Собираю ПК для нейросетей: RTX 5070, 64 ГБ RAM' },
    { emoji: '🔧', text: 'Ремонтирую материнскую плату ноутбука: замена цепей питания' },
    { emoji: '🌐', text: 'Разрабатываю сайт для компьютерного сервиса' }
];

// Рендер блока "Сейчас в работе" из массива
(function () {
    var list = document.getElementById('current-work-list');
    if (!list) return;

    currentWork.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'current-work-item';

        var emoji = document.createElement('span');
        emoji.className = 'current-work-emoji';
        emoji.setAttribute('aria-hidden', 'true');
        emoji.textContent = item.emoji;

        var text = document.createElement('span');
        text.className = 'current-work-text';
        text.textContent = item.text;

        li.appendChild(emoji);
        li.appendChild(text);
        list.appendChild(li);
    });
})();

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

// Конструктор заявки (страница «Контакты»): собирает текст заявки,
// копирует его в буфер обмена и открывает модалку с выбором канала.
// Никакой отправки на сервер — клиент вставляет текст в мессенджер сам.
(function () {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var service = document.getElementById('contact-service');
    var serviceField = document.getElementById('contact-service-field');
    var nameEl = document.getElementById('contact-name');
    var budgetEl = document.getElementById('contact-budget');
    var commentEl = document.getElementById('contact-comment');
    var errorEl = document.getElementById('contact-service-error');

    if (!service || !serviceField) return;

    // Модалка ищется в момент показа, а не при загрузке скрипта —
    // так она не сломается при любом порядке разметки/скриптов.
    function getModal() {
        return document.getElementById('order-modal');
    }

    // Сборка текста заявки: пустые поля пропускаем
    function buildText() {
        var lines = [];
        var name = nameEl ? nameEl.value.trim() : '';
        lines.push(name ? 'Здравствуйте! Меня зовут ' + name + '.' : 'Здравствуйте!');
        lines.push('Услуга: ' + service.value.trim());
        if (budgetEl && budgetEl.value.trim()) {
            lines.push('Бюджет: ' + budgetEl.value.trim());
        }
        var comment = commentEl ? commentEl.value.trim() : '';
        if (comment) {
            lines.push('Комментарий: ' + comment);
        }
        return lines.join('\n');
    }

    // Обычный режим: текст уже в буфере, показываем кнопки
    function showModal() {
        var modal = getModal();
        if (!modal) return;
        var status = document.getElementById('order-modal-status');
        var fallback = document.getElementById('order-modal-fallback');
        var hint = document.getElementById('order-modal-hint');
        if (status) {
            status.innerHTML = 'Текст скопирован в буфер обмена.<br>Выберите, куда отправить:';
        }
        if (fallback) fallback.hidden = true;
        if (hint) hint.textContent = 'Текст заявки уже скопирован — просто вставьте его в чат';
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    // Фолбэк: буфер недоступен — показываем текст в модалке и кнопку «Скопировать»
    function showFallback(text) {
        var modal = getModal();
        if (!modal) return;
        var status = document.getElementById('order-modal-status');
        var fallback = document.getElementById('order-modal-fallback');
        var preview = document.getElementById('order-modal-preview');
        var hint = document.getElementById('order-modal-hint');
        if (status) {
            status.textContent = 'Автоматически скопировать не удалось — сделайте это вручную:';
        }
        if (preview) preview.textContent = text;
        if (fallback) fallback.hidden = false;
        if (hint) hint.textContent = 'Выберите мессенджер и вставьте туда текст';
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        var modal = getModal();
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Резервное копирование для file:// и старых браузеров
    function legacyCopy(text) {
        var ok = false;
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '0';
            ta.style.left = '0';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            ok = document.execCommand('copy');
            document.body.removeChild(ta);
        } catch (err) { ok = false; }
        return ok;
    }

    // Валидация: услуга обязательна
    function flagServiceInvalid() {
        serviceField.classList.add('invalid');
        if (errorEl) {
            errorEl.textContent = 'Пожалуйста, выберите услугу';
        }
        service.focus();
    }

    service.addEventListener('change', function () {
        serviceField.classList.remove('invalid');
        if (errorEl) {
            errorEl.textContent = '';
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!service.value) {
            flagServiceInvalid();
            return;
        }

        var text = buildText();

        // Основной путь: Clipboard API (работает на https)
        if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function () { showModal(); },
                function () { showFallback(text); }
            );
        } else if (legacyCopy(text)) {
            // Буфер недоступен напрямую, но сработал резервный способ
            showModal();
        } else {
            // Скопировать никак не вышло — показываем текст и кнопку «Скопировать»
            showFallback(text);
        }

        form.reset();
    });

    // Закрытие модалки: крестик, клик по фону, Esc.
    // Слушаем на document, чтобы не зависеть от порядка разметки.
    document.addEventListener('click', function (e) {
        var modal = getModal();
        if (!modal || !modal.classList.contains('open')) return;
        if (e.target.classList.contains('order-modal__close') ||
            e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Кнопка «Скопировать» в фолбэк-режиме
    document.addEventListener('click', function (e) {
        if (e.target.id !== 'order-modal-copy') return;
        var preview = document.getElementById('order-modal-preview');
        if (!preview || !preview.textContent) return;

        if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(preview.textContent).then(
                function () { e.target.textContent = '✔ Скопировано'; },
                function () {
                    if (legacyCopy(preview.textContent)) {
                        e.target.textContent = '✔ Скопировано';
                    }
                }
            );
        } else if (legacyCopy(preview.textContent)) {
            e.target.textContent = '✔ Скопировано';
        }
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
// Шапка-пилюля: при прокрутке фон стекла чуть плотнее
(function () {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function onScroll() {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        header.classList.toggle('scrolled', y > 8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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
// Счётчик дней в индустрии: с 1 апреля 2009 до сегодня
(function () {
    var el = document.getElementById('days-in-industry');
    if (!el) return;

    var now = new Date();
    var start = new Date(2009, 3, 1); // 1 апреля 2009
    var days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    el.textContent = days.toLocaleString('ru-RU');
})();

// Калькулятор ПК: подбор примерной конфигурации по задачам и бюджету
(function () {
    var section = document.getElementById('pc-calculator');
    if (!section) return;

    var taskInputs = section.querySelectorAll('.task-input');
    var budgetInputs = section.querySelectorAll('.budget-input');
    var btn = document.getElementById('calc-btn');
    var errorEl = document.getElementById('calc-error');
    var resultEl = document.getElementById('calc-result');
    var configList = document.getElementById('result-config');

    // Базовый класс компонентов по бюджету
    var tiers = {
        budget:   { cpu: 'Ryzen 5 со встроенной графикой', gpu: 'встроенная графика Ryzen 5 (Radeon 760M / 780M)', ram: '16 ГБ', ssd: 'SSD 512 ГБ', psu: '400–500 Вт' },
        mid:      { cpu: 'Ryzen 5 / Ryzen 7',              gpu: 'RX 9060 XT / RX 9070',    ram: '16–32 ГБ', ssd: 'NVMe 1 ТБ',   psu: '650–750 Вт' },
        premium:  { cpu: 'Ryzen 7 / Ryzen 9',              gpu: 'RX 9070 XT / RTX 5070',   ram: '32–64 ГБ', ssd: 'NVMe 1–2 ТБ', psu: '750–850 Вт' },
        top:      { cpu: 'Ryzen 9 / Core i9 (топ)',        gpu: 'RTX 5080 / RX 9070 XT',   ram: '64–128 ГБ',ssd: 'NVMe 2–4 ТБ', psu: '1000+ Вт' }
    };

    function selectedTasks() {
        var out = [];
        taskInputs.forEach(function (i) { if (i.checked) out.push(i.value); });
        return out;
    }

    function selectedTier() {
        for (var i = 0; i < budgetInputs.length; i++) {
            if (budgetInputs[i].checked) return budgetInputs[i].value;
        }
        return null;
    }

    function refreshCards() {
        taskInputs.forEach(function (i) {
            var lbl = i.closest('.task-card');
            if (lbl) lbl.classList.toggle('selected', i.checked);
        });
        budgetInputs.forEach(function (i) {
            var lbl = i.closest('.budget-card');
            if (lbl) lbl.classList.toggle('selected', i.checked);
        });
    }

    taskInputs.forEach(function (i) { i.addEventListener('change', refreshCards); });
    budgetInputs.forEach(function (i) { i.addEventListener('change', refreshCards); });
    refreshCards();

    function buildConfig(tasks, tier) {
        var isAI    = tasks.indexOf('ai') !== -1;
        var isVideo = tasks.indexOf('video') !== -1;
        var isGames = tasks.indexOf('games') !== -1;
        var isLight = tasks.indexOf('work') !== -1 || tasks.indexOf('study') !== -1;

        // tier: budget | mid | premium | top — совпадает с ключами tiers
        var base = tiers[tier];
        var cpu = base.cpu, ram = base.ram, ssd = base.ssd, psu = base.psu;
        var gpu;
        var caveat = null;

        // CPU
        if (isVideo) {
            cpu = tier === 'budget' ? 'Ryzen 5 (6 ядер)' : 'Ryzen 7 / Ryzen 9 — многоядерный';
        } else if (isAI) {
            cpu = tier === 'top' ? 'Ryzen 9 / Core i9 (топ)' : (tier === 'budget' ? 'Ryzen 5' : 'Ryzen 7 / Ryzen 9');
        } else if (isLight) {
            cpu = tier === 'budget' ? 'Ryzen 5 со встроенной графикой' : 'Ryzen 5 / Ryzen 7 (без излишеств)';
        }

        // GPU: AMD vs Nvidia по задачам
        if (isAI) {
            // CUDA — стандарт ИИ, только Nvidia
            gpu = tier === 'budget'   ? 'RTX 3060 / RTX 4060' :
                  tier === 'mid'      ? 'RTX 4070 / RTX 5070' :
                  tier === 'premium'  ? 'RTX 5070 Ti / RTX 5080' :
                                        'RTX 5080 / RTX 5090';
            gpu += ' — CUDA, стандарт для нейросетей';
            ram = tier === 'budget' ? '32 ГБ' : (tier === 'mid' ? '32–64 ГБ' : '64–128 ГБ');
        } else if (isVideo) {
            // CUDA/NVENC предсказуемее в рабочем софте — Nvidia
            gpu = tier === 'budget'   ? 'RTX 3060 / RTX 4060' :
                  tier === 'mid'      ? 'RTX 4060 / RTX 5060' :
                  tier === 'premium'  ? 'RTX 5070 / RTX 5080' : 'RTX 5080 / RTX 5090';
            gpu += ' — CUDA/NVENC, предсказуемо в рабочем софте';
            if (tier === 'budget' || tier === 'mid') ram = '32 ГБ'; else ram = '64–128 ГБ';
        } else if (isGames) {
            // Игры без ИИ — AMD: больше FPS за рубль
            gpu = tier === 'budget'   ? 'Встроенная графика Ryzen 5 — игры на низких-средних в 1080p' :
                  tier === 'mid'      ? 'RX 9060 XT (старт в 1080p/1440p) / RX 9070 ближе к верхней границе бюджета' :
                  tier === 'premium'  ? 'RX 9070 XT (уверенный 1440p, старт в 4K)' :
                                        'RX 9070 XT + топ-CPU / RTX 5080–5090 (если важен рейтрейсинг)';
            if (tier === 'budget') {
                caveat = 'В бюджете до 70к новая дискретная карта не умещается — встроенная графика потянет базовые игры. За дискреткой смотри бюджет 70–150к или б/у рынок.';
            }
            if (tier === 'premium' || tier === 'top') ram = '32–64 ГБ';
        } else {
            // дом / учёба / офис
            gpu = 'встроенная графика';
            cpu = tier === 'budget' ? 'Ryzen 5 со встроенной графикой' : base.cpu;
            ram = base.ram;
        }

        return { cpu: cpu, gpu: gpu, ram: ram, ssd: ssd, psu: psu, caveat: caveat };
    }

    function render(cfg) {
        var rows = [
            ['Процессор', cfg.cpu],
            ['Видеокарта', cfg.gpu],
            ['Оперативная память', cfg.ram],
            ['Накопитель', cfg.ssd],
            ['Блок питания', cfg.psu]
        ];
        configList.innerHTML = rows.map(function (r) {
            return '<li><span class="lbl">' + r[0] + '</span><span class="val">' + r[1] + '</span></li>';
        }).join('');
    }

    btn.addEventListener('click', function () {
        var tasks = selectedTasks();
        var tier = selectedTier();

        if (!tasks.length || !tier) {
            errorEl.hidden = false;
            resultEl.hidden = true;
            return;
        }

        errorEl.hidden = true;
        var cfg = buildConfig(tasks, tier);
        render(cfg);

        // Честная заметка (например, для игр в бюджете до 70к)
        var caveatEl = document.getElementById('result-caveat');
        if (caveatEl) {
            caveatEl.hidden = !cfg.caveat;
            caveatEl.textContent = cfg.caveat || '';
        }

        resultEl.hidden = false;
        resultEl.classList.remove('fade-in');
        void resultEl.offsetWidth; // перезапуск fade+slide при каждом расчёте
        resultEl.classList.add('fade-in');
    });
})();

// Световой след за курсором в hero (только десктоп, pointer: fine)
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

// Пасхалка Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A
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
        btn.href = 'contact.html';
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