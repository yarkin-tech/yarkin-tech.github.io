/* ==========================================================================
   hardware.js — интерактивный справочник GPU/CPU (страница /hardware/)
   Только логика этой страницы: фильтры, поиск, сортировка, модалка, URL.
   ========================================================================== */

// Сайтовый поиск в шапке: SITE_INDEX в /js/search.js задан ссылками от корня,
// поэтому на подстранице /hardware/ добавляем префикс ../ и саму эту страницу.
(function () {
    if (!Array.isArray(window.SITE_INDEX)) return;
    window.SITE_INDEX = window.SITE_INDEX.map(function (entry) {
        return {
            name: entry.name,
            type: entry.type,
            url: '../' + entry.url,
            keywords: entry.keywords
        };
    });
    window.SITE_INDEX.unshift({
        name: 'Справочник железа',
        type: 'Страница',
        url: 'index.html',
        keywords: 'справочник, железо, видеокарты, процессоры, gpu, cpu, passmark, сравнение, характеристики, rtx, radeon, ryzen, intel'
    });
})();

(function () {
    'use strict';

    var YM_ID = 111985647;
    var DB = window.HARDWARE_DATA || { GPU: [], CPU: [] };
    var DEFAULT_SORT_KEY = 'passmark_score';
    var DEFAULT_SORT_DIR = 'desc';
    var SEARCH_DEBOUNCE = 300;

    var BRAND_LOGO = {
        NVIDIA: 'assets/nvidia.svg',
        AMD: 'assets/amd.svg',
        Intel: 'assets/intel.svg'
    };

    var BRANDS = ['all', 'NVIDIA', 'AMD', 'Intel'];

    /* ---------- Подготовка данных ---------- */

    var MODELS = DB.GPU.concat(DB.CPU).map(function (item) {
        return {
            id: item.type.toLowerCase() + '-' + item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: item.name,
            brand: item.brand,
            type: item.type,
            release_year: item.release_year,
            vram_gb: item.vram_gb,
            cores: item.cores,
            base_clock: item.base_clock,
            boost_clock: item.boost_clock,
            tdp_w: item.tdp_w,
            passmark_score: item.passmark_score,
            tech_process_nm: item.tech_process_nm,
            launch_price_usd: item.launch_price_usd,
            approximate: item.approximate === true
        };
    });

    function topOfType(type) {
        return MODELS.filter(function (item) {
            return item.type === type;
        }).reduce(function (top, item) {
            return (!top || item.passmark_score > top.passmark_score) ? item : top;
        }, null);
    }

    // PassMark G3D Mark и CPU Mark — разные тесты, сравнивать их напрямую нельзя.
    // Поэтому шкала считается от лучшей модели того же класса.
    var TOP_BY_TYPE = {
        GPU: topOfType('GPU'),
        CPU: topOfType('CPU')
    };

    /* ---------- Состояние ---------- */

    var state = {
        q: '',
        type: 'all',
        brand: 'all',
        sortKey: DEFAULT_SORT_KEY,
        sortDir: DEFAULT_SORT_DIR,
        sortTouched: false
    };

    var searchTimer = null;
    var lastFocused = null;

    /* ---------- Утилиты ---------- */

    function reachGoal(name, params) {
        try {
            if (typeof ym === 'function') {
                ym(YM_ID, 'reachGoal', name, params || {});
            }
        } catch (err) {
            /* Метрика не должна ломать интерфейс */
        }
    }

    function plural(n, one, few, many) {
        var n10 = n % 10;
        var n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return one;
        if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
        return many;
    }

    function fmtNum(n) {
        return Number(n).toLocaleString('ru-RU');
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function brandLogo(brand) {
        var img = document.createElement('img');
        img.className = 'hw-brand__logo';
        img.src = BRAND_LOGO[brand] || '';
        img.alt = '';
        img.width = 16;
        img.height = 16;
        img.loading = 'lazy';
        img.setAttribute('aria-hidden', 'true');
        return img;
    }

    function findById(id) {
        for (var i = 0; i < MODELS.length; i++) {
            if (MODELS[i].id === id) return MODELS[i];
        }
        return null;
    }

    /* ---------- Форматирование характеристик ---------- */

    function coresText(item) {
        return item.cores + ' ' + plural(item.cores, 'ядро', 'ядра', 'ядер');
    }

    function clockText(item) {
        if (item.type === 'CPU') {
            return (item.base_clock / 1000).toFixed(1) + '–' + (item.boost_clock / 1000).toFixed(1) + ' ГГц';
        }
        return item.base_clock + '–' + item.boost_clock + ' МГц';
    }

    function specsText(item) {
        if (item.type === 'GPU') {
            return item.vram_gb + ' ГБ · ' + coresText(item) + ' · ' + clockText(item);
        }
        return coresText(item) + ' · ' + clockText(item);
    }

    function passmarkText(item) {
        return (item.approximate ? '≈ ' : '') + fmtNum(item.passmark_score);
    }

    function benchPercent(item) {
        var top = TOP_BY_TYPE[item.type];
        var topScore = top ? top.passmark_score : 1;
        var percent = (item.passmark_score / topScore) * 100;
        return Math.max(3, Math.min(100, Math.round(percent * 10) / 10));
    }

    /* ---------- Ссылки на DOM ---------- */

    var els = {
        total: document.getElementById('hw-total'),
        totalLabel: document.getElementById('hw-total-label'),
        search: document.getElementById('hw-search'),
        clear: document.getElementById('hw-search-clear'),
        found: document.getElementById('hw-found'),
        tbody: document.getElementById('hw-tbody'),
        table: document.getElementById('hw-table'),
        cards: document.getElementById('hw-cards'),
        empty: document.getElementById('hw-empty'),
        reset: document.getElementById('hw-reset'),
        modal: document.getElementById('hw-modal'),
        modalContent: document.getElementById('hw-modal-content')
    };

    var tableWrap = els.table ? els.table.closest('.hw-table-wrap') : null;

    /* ---------- Построение таблицы и карточек ---------- */

    function buildBench(item, className) {
        var wrap = el('div', className);

        var head = el('div', 'hw-bench__head');
        head.appendChild(el('span', 'hw-bench__value', passmarkText(item)));
        head.appendChild(el('span', 'hw-bench__caption', 'PassMark'));
        wrap.appendChild(head);

        var bar = el('span', 'hw-bench__bar');
        var fill = el('i', 'hw-bench__fill');
        fill.style.width = benchPercent(item) + '%';
        bar.appendChild(fill);
        wrap.appendChild(bar);

        return wrap;
    }

    function buildBrand(item) {
        var brand = el('span', 'hw-brand');
        brand.appendChild(brandLogo(item.brand));
        brand.appendChild(el('span', 'hw-brand__name', item.brand));
        return brand;
    }

    function buildRow(item) {
        var tr = el('tr', 'hw-row');
        tr.setAttribute('data-id', item.id);
        tr.tabIndex = 0;
        tr.setAttribute('aria-label', 'Подробнее: ' + item.name);

        var tdName = el('td', 'hw-cell hw-cell--name');
        var title = el('div', 'hw-row__title');
        title.appendChild(el('span', 'hw-row__name', item.name));
        title.appendChild(el('span', 'hw-type hw-type--' + item.type.toLowerCase(), item.type));
        tdName.appendChild(title);
        tr.appendChild(tdName);

        var tdBrand = el('td', 'hw-cell hw-cell--brand');
        tdBrand.appendChild(buildBrand(item));
        tr.appendChild(tdBrand);

        tr.appendChild(el('td', 'hw-cell hw-cell--year', item.release_year));
        tr.appendChild(el('td', 'hw-cell hw-cell--specs', specsText(item)));
        tr.appendChild(el('td', 'hw-cell hw-cell--tdp', item.tdp_w + ' Вт'));

        var tdBench = el('td', 'hw-cell hw-cell--bench');
        tdBench.appendChild(buildBench(item, 'hw-bench'));
        tr.appendChild(tdBench);

        return tr;
    }


    function addCardSpec(list, label, value) {
        var row = el('div', 'hw-card__spec');
        row.appendChild(el('dt', null, label));
        row.appendChild(el('dd', null, value));
        list.appendChild(row);
    }

    function buildCard(item) {
        var card = el('article', 'hw-card');
        card.setAttribute('data-id', item.id);
        card.tabIndex = 0;
        card.setAttribute('aria-label', 'Подробнее: ' + item.name);

        var head = el('div', 'hw-card__head');
        var title = el('div', 'hw-card__title');
        title.appendChild(el('span', 'hw-card__name', item.name));
        title.appendChild(el('span', 'hw-type hw-type--' + item.type.toLowerCase(), item.type));
        head.appendChild(title);
        head.appendChild(buildBrand(item));
        card.appendChild(head);

        var specs = el('dl', 'hw-card__specs');
        addCardSpec(specs, 'Год', item.release_year);
        if (item.type === 'GPU') {
            addCardSpec(specs, 'Память', item.vram_gb + ' ГБ');
        }
        addCardSpec(specs, item.type === 'GPU' ? 'Ядра' : 'Ядер', item.cores);
        addCardSpec(specs, 'Частота', clockText(item));
        addCardSpec(specs, 'TDP', item.tdp_w + ' Вт');
        card.appendChild(specs);

        card.appendChild(buildBench(item, 'hw-bench hw-bench--card'));
        card.appendChild(el('span', 'hw-card__more', 'Все характеристики'));

        return card;
    }

    function renderList() {
        var list = getVisible();

        if (els.tbody) {
            var rows = document.createDocumentFragment();
            list.forEach(function (item) {
                rows.appendChild(buildRow(item));
            });
            els.tbody.textContent = '';
            els.tbody.appendChild(rows);
        }

        if (els.cards) {
            var cards = document.createDocumentFragment();
            list.forEach(function (item) {
                cards.appendChild(buildCard(item));
            });
            els.cards.textContent = '';
            els.cards.appendChild(cards);
        }

        var isEmpty = list.length === 0;
        if (els.found) els.found.textContent = list.length;
        if (els.empty) els.empty.hidden = !isEmpty;
        if (tableWrap) tableWrap.hidden = isEmpty;
        if (els.cards) els.cards.hidden = isEmpty;

        updateSortUi();
    }

    /* ---------- Фильтрация и сортировка ---------- */

    function matches(item) {
        if (state.type !== 'all' && item.type !== state.type) return false;
        if (state.brand !== 'all' && item.brand !== state.brand) return false;
        if (!state.q) return true;

        var name = item.name.toLowerCase();
        var q = state.q.toLowerCase();
        if (name.indexOf(q) !== -1) return true;

        // «4060» найдёт «RTX 4060», «7800x3d» — «Ryzen 7 7800X3D»
        var compactName = name.replace(/[\s\-_]+/g, '');
        var compactQuery = q.replace(/[\s\-_]+/g, '');
        return compactQuery !== '' && compactName.indexOf(compactQuery) !== -1;
    }

    function compareItems(a, b) {
        var key = state.sortKey;
        var factor = state.sortDir === 'asc' ? 1 : -1;
        var result;

        if (key === 'name' || key === 'brand') {
            result = String(a[key]).localeCompare(String(b[key]), 'ru');
        } else {
            result = (a[key] || 0) - (b[key] || 0);
        }

        if (result === 0) {
            return b.passmark_score - a.passmark_score;
        }
        return result * factor;
    }

    function getVisible() {
        return MODELS.filter(matches).sort(compareItems);
    }

    function updateSortUi() {
        var buttons = document.querySelectorAll('.hw-sort-btn');
        Array.prototype.forEach.call(buttons, function (button) {
            var th = button.parentNode;
            var key = th.getAttribute('data-sort');
            var active = key === state.sortKey;
            th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
            th.classList.toggle('is-sorted', active);
        });
    }



    /* ---------- Модалка деталей ---------- */

    function clockValue(mhz, type) {
        return type === 'CPU' ? (mhz / 1000).toFixed(1) + ' ГГц' : mhz + ' МГц';
    }

    function modalSpecs(item) {
        var rows = [
            ['Тип', item.type === 'GPU' ? 'Видеокарта (GPU)' : 'Процессор (CPU)'],
            ['Бренд', item.brand],
            ['Год выпуска', item.release_year]
        ];
        if (item.type === 'GPU') {
            rows.push(['Видеопамять', item.vram_gb + ' ГБ']);
        }
        rows.push([item.type === 'GPU' ? 'Ядра' : 'Ядер', item.cores]);
        rows.push(['Базовая частота', clockValue(item.base_clock, item.type)]);
        rows.push(['Буст-частота', clockValue(item.boost_clock, item.type)]);
        rows.push(['TDP', item.tdp_w + ' Вт']);
        rows.push(['Техпроцесс', item.tech_process_nm + ' нм']);
        rows.push(['Цена на старте', '$' + fmtNum(item.launch_price_usd)]);
        rows.push(['PassMark', passmarkText(item)]);
        return rows;
    }

    function openModal(id) {
        var item = findById(id);
        if (!item || !els.modal || !els.modalContent) return;

        els.modalContent.textContent = '';

        var head = el('div', 'hw-modal__head');
        var logo = el('span', 'hw-modal__logo');
        var logoImg = brandLogo(item.brand);
        logoImg.width = 26;
        logoImg.height = 26;
        logo.appendChild(logoImg);
        head.appendChild(logo);

        var headText = el('div', 'hw-modal__head-text');
        var title = el('h3', 'hw-modal__title', item.name);
        title.id = 'hw-modal-title';
        headText.appendChild(title);
        headText.appendChild(el('p', 'hw-modal__meta', item.brand + ' · ' + item.type + ' · ' + item.release_year));
        head.appendChild(headText);
        els.modalContent.appendChild(head);

        var specs = el('dl', 'hw-modal__specs');
        modalSpecs(item).forEach(function (pair) {
            var row = el('div', 'hw-modal__spec');
            row.appendChild(el('dt', null, pair[0]));
            row.appendChild(el('dd', null, pair[1]));
            specs.appendChild(row);
        });
        els.modalContent.appendChild(specs);

        var percent = benchPercent(item);
        var bench = el('div', 'hw-modal__bench');
        var benchHead = el('div', 'hw-modal__bench-head');
        benchHead.appendChild(el('span', null, item.type === 'GPU' ? 'PassMark G3D Mark' : 'PassMark CPU Mark'));
        benchHead.appendChild(el('strong', null, passmarkText(item)));
        bench.appendChild(benchHead);

        var bar = el('div', 'hw-modal__bar');
        var fill = el('span', 'hw-modal__bar-fill');
        bar.appendChild(fill);
        bench.appendChild(bar);

        var top = TOP_BY_TYPE[item.type];
        var note;
        if (top && top.id === item.id) {
            note = (item.type === 'GPU' ? 'Лучшая видеокарта' : 'Лучший процессор') + ' в базе по PassMark';
        } else {
            note = 'Это ' + Math.round(percent) + '% от лучшей ' +
                (item.type === 'GPU' ? 'видеокарты' : 'процессора') + ' в базе';
            if (top) {
                note += ' (' + top.name + ' — ' + fmtNum(top.passmark_score) + ')';
            }
        }
        bench.appendChild(el('p', 'hw-modal__note', note));
        if (item.approximate) {
            bench.appendChild(el('p', 'hw-modal__note hw-modal__note--approx', '≈ — оценочное значение PassMark по открытым данным.'));
        }
        els.modalContent.appendChild(bench);

        var actions = el('div', 'hw-modal__actions');
        var closeBtn = el('button', 'btn btn-secondary', 'Закрыть');
        closeBtn.type = 'button';
        closeBtn.setAttribute('data-hw-close', '');
        actions.appendChild(closeBtn);
        els.modalContent.appendChild(actions);

        lastFocused = document.activeElement;
        els.modal.classList.add('open');
        els.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hw-modal-open');

        // Заполнение шкалы и фокус — после того как диалог попал в DOM
        var focusTarget = els.modal.querySelector('.hw-modal__close') || closeBtn;
        window.requestAnimationFrame(function () {
            fill.style.width = percent + '%';
            if (focusTarget) focusTarget.focus();
        });

        reachGoal('hw_card_open', { model: item.name, brand: item.brand, type: item.type });
    }

    function closeModal() {
        if (!els.modal || !els.modal.classList.contains('open')) return;
        els.modal.classList.remove('open');
        els.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('hw-modal-open');
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
        lastFocused = null;
    }

    function trapFocus(e) {
        if (e.key !== 'Tab' || !els.modal) return;
        var focusable = els.modal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /* ---------- Сортировка: asc → desc → сброс ---------- */

    function handleSort(key) {
        if (!key) return;

        if (state.sortKey !== key || !state.sortTouched) {
            state.sortKey = key;
            state.sortDir = 'asc';
            state.sortTouched = true;
        } else if (state.sortDir === 'asc') {
            state.sortDir = 'desc';
        } else {
            state.sortKey = DEFAULT_SORT_KEY;
            state.sortDir = DEFAULT_SORT_DIR;
            state.sortTouched = false;
        }

        reachGoal('hw_sort', { key: key, dir: state.sortDir });
        renderList();
        syncUrl();
    }

    /* ---------- Синхронизация состояния с URL ---------- */

    var SORT_KEYS = ['name', 'brand', 'release_year', 'cores', 'tdp_w', 'passmark_score'];

    function syncUrl() {
        if (typeof window.URLSearchParams !== 'function') return;

        var params = new URLSearchParams();
        if (state.q) params.set('q', state.q);
        if (state.type !== 'all') params.set('type', state.type);
        if (state.brand !== 'all') params.set('brand', state.brand);
        if (state.sortKey !== DEFAULT_SORT_KEY || state.sortDir !== DEFAULT_SORT_DIR) {
            params.set('sort', state.sortKey);
            params.set('dir', state.sortDir);
        }

        var query = params.toString();
        var url = window.location.pathname + (query ? '?' + query : '') + window.location.hash;

        try {
            window.history.replaceState(null, '', url);
        } catch (err) {
            /* file:// и очень старые браузеры — состояние просто не пишем в адрес */
        }
    }

    function readUrl() {
        if (typeof window.URLSearchParams !== 'function') return;

        var params = new URLSearchParams(window.location.search);

        var q = params.get('q');
        if (q) state.q = q.trim().slice(0, 60);

        var typeRaw = (params.get('type') || '').toUpperCase();
        state.type = (typeRaw === 'GPU' || typeRaw === 'CPU') ? typeRaw : 'all';

        var brandRaw = (params.get('brand') || '').toLowerCase();
        for (var i = 0; i < BRANDS.length; i++) {
            if (BRANDS[i].toLowerCase() === brandRaw) {
                state.brand = BRANDS[i];
                break;
            }
        }

        var sortKey = params.get('sort');
        if (sortKey && SORT_KEYS.indexOf(sortKey) !== -1) {
            state.sortKey = sortKey;
            state.sortDir = params.get('dir') === 'asc' ? 'asc' : 'desc';
            state.sortTouched = !(state.sortKey === DEFAULT_SORT_KEY && state.sortDir === DEFAULT_SORT_DIR);
        }
    }

    /* ---------- Элементы управления ---------- */

    function setRadio(name, value) {
        var inputs = document.querySelectorAll('input[name="' + name + '"]');
        Array.prototype.forEach.call(inputs, function (input) {
            input.checked = input.value === value;
        });
    }

    function syncControls() {
        if (els.search) els.search.value = state.q;
        if (els.clear) els.clear.hidden = state.q === '';
        setRadio('hw-type', state.type);
        setRadio('hw-brand', state.brand);
        updateSortUi();
    }

    function bindRadioGroup(name, onChange) {
        var inputs = document.querySelectorAll('input[name="' + name + '"]');
        Array.prototype.forEach.call(inputs, function (input) {
            input.addEventListener('change', function () {
                if (input.checked) onChange(input.value);
            });
        });
    }

    function onListClick(e) {
        var row = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
        if (!row) return;
        openModal(row.getAttribute('data-id'));
    }

    function onListKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        var row = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
        if (!row) return;
        e.preventDefault();
        openModal(row.getAttribute('data-id'));
    }

    function resetFilters() {
        state.q = '';
        state.type = 'all';
        state.brand = 'all';
        state.sortKey = DEFAULT_SORT_KEY;
        state.sortDir = DEFAULT_SORT_DIR;
        state.sortTouched = false;

        if (els.search) els.search.value = '';
        if (els.clear) els.clear.hidden = true;
        setRadio('hw-type', 'all');
        setRadio('hw-brand', 'all');

        renderList();
        syncUrl();

        reachGoal('hw_filter', { filter: 'reset', value: 'all' });

        if (els.search) els.search.focus();
    }

    /* ---------- События ---------- */

    function bindEvents() {
        Array.prototype.forEach.call(document.querySelectorAll('.hw-sort-btn'), function (button) {
            button.addEventListener('click', function () {
                handleSort(button.parentNode.getAttribute('data-sort'));
            });
        });

        bindRadioGroup('hw-type', function (value) {
            state.type = value;
            reachGoal('hw_filter', { filter: 'type', value: value });
            renderList();
            syncUrl();
        });

        bindRadioGroup('hw-brand', function (value) {
            state.brand = value;
            reachGoal('hw_filter', { filter: 'brand', value: value });
            renderList();
            syncUrl();
        });

        if (els.search) {
            els.search.addEventListener('input', function () {
                var raw = els.search.value;
                if (els.clear) els.clear.hidden = raw.length === 0;

                window.clearTimeout(searchTimer);
                searchTimer = window.setTimeout(function () {
                    var next = raw.trim();
                    if (next === state.q) return;
                    state.q = next;
                    if (next) reachGoal('hw_search', { query: next });
                    renderList();
                    syncUrl();
                }, SEARCH_DEBOUNCE);
            });
        }

        if (els.clear) {
            els.clear.addEventListener('click', function () {
                if (els.search) {
                    els.search.value = '';
                    els.search.focus();
                }
                els.clear.hidden = true;
                window.clearTimeout(searchTimer);

                if (state.q) {
                    state.q = '';
                    renderList();
                    syncUrl();
                }
            });
        }

        [els.tbody, els.cards].forEach(function (container) {
            if (!container) return;
            container.addEventListener('click', onListClick);
            container.addEventListener('keydown', onListKeydown);
        });

        if (els.modal) {
            els.modal.addEventListener('click', function (e) {
                if (e.target && e.target.closest && e.target.closest('[data-hw-close]')) {
                    closeModal();
                }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                closeModal();
                return;
            }
            if (els.modal && els.modal.classList.contains('open')) {
                trapFocus(e);
            }
        });

        if (els.reset) {
            els.reset.addEventListener('click', resetFilters);
        }
    }

    /* ---------- Старт ---------- */

    function init() {
        if (els.total) els.total.textContent = MODELS.length;
        if (els.totalLabel) {
            els.totalLabel.textContent = plural(MODELS.length, 'модель', 'модели', 'моделей') + ' в базе';
        }

        readUrl();
        syncControls();
        bindEvents();
        renderList();
        syncUrl();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

