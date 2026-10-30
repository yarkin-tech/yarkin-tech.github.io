/* ==========================================================================
   hardware.js — интерактивный справочник GPU/CPU (страница /hardware/)
   Только логика этой страницы: фильтры, поиск, сортировка, модалка, URL.
   Поиск в шапке сайта (/js/search.js) сам подставляет нужный префикс ссылок,
   поэтому здесь SITE_INDEX больше не правится.
   ========================================================================== */

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

    // Расширенные характеристики — нужны только режиму сравнения «Полно»
    var EXTRA_FIELDS = [
        'threads', 'cache_l3_mb', 'socket', 'memory_support', 'pcie_version',
        'igpu', 'tjmax_c', 'codename', 'overclocking',
        'architecture', 'rt_cores', 'tensor_cores', 'ray_accelerators',
        'bus_width_bits', 'memory_bandwidth_gbps', 'power_connectors',
        'recommended_psu_w', 'outputs', 'upscaling'
    ];

    var MODELS = DB.GPU.concat(DB.CPU).map(function (item) {
        var model = {
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
        EXTRA_FIELDS.forEach(function (key) {
            model[key] = item[key] === undefined ? null : item[key];
        });
        model.specs_approx = item.specs_approx || [];
        return model;
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
        sortTouched: false,
        // Сравнение: максимум две модели одного типа (GPU с GPU, CPU с CPU)
        compare: []
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
        emptyTotal: document.getElementById('hw-empty-total'),
        reset: document.getElementById('hw-reset'),
        modal: document.getElementById('hw-modal'),
        modalContent: document.getElementById('hw-modal-content'),
        compare: document.getElementById('hw-compare'),
        compareItems: document.getElementById('hw-compare-items'),
        compareGo: document.getElementById('hw-compare-go'),
        compareClear: document.getElementById('hw-compare-clear')
    };

    var tableWrap = els.table ? els.table.closest('.hw-table-wrap') : null;

    /* ---------- Сравнение моделей ---------- */

    function selectedModels() {
        return state.compare.map(findById).filter(Boolean);
    }

    function isSelected(id) {
        return state.compare.indexOf(id) !== -1;
    }

    function buildCompareToggle(item, variant) {
        var active = isSelected(item.id);
        var button = el('button', 'hw-compare-toggle hw-compare-toggle--' + variant + (active ? ' is-active' : ''));
        button.type = 'button';
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.setAttribute('aria-label', (active ? 'Убрать из сравнения: ' : 'Добавить к сравнению: ') + item.name);
        button.title = active ? 'Убрать из сравнения' : 'Добавить к сравнению';
        button.appendChild(el('span', 'hw-compare-toggle__icon', active ? '✓' : '+'));
        if (variant === 'card') {
            button.appendChild(el('span', 'hw-compare-toggle__text', active ? 'В сравнении' : 'Сравнить'));
        }
        return button;
    }

    function toggleCompare(id) {
        var item = findById(id);
        if (!item) return;

        var index = state.compare.indexOf(id);
        if (index !== -1) {
            state.compare.splice(index, 1);
            reachGoal('hw_compare_remove', { model: item.name, type: item.type });
        } else {
            var first = selectedModels()[0];
            if (first && first.type !== item.type) {
                // GPU сравниваем только с GPU, CPU — только с CPU
                state.compare = [id];
                reachGoal('hw_compare_add', { model: item.name, type: item.type, replaced: first.name });
            } else {
                state.compare.push(id);
                if (state.compare.length > 2) {
                    state.compare.shift();
                }
                reachGoal('hw_compare_add', { model: item.name, type: item.type });
            }
        }

        renderList();
        renderCompareTray();
        syncUrl();
    }

    function renderCompareTray() {
        if (!els.compare) return;

        var items = selectedModels();
        els.compare.hidden = items.length === 0;
        document.body.classList.toggle('hw-compare-open', items.length > 0);
        if (!els.compareItems) return;

        els.compareItems.textContent = '';
        items.forEach(function (item) {
            var chip = el('span', 'hw-compare__chip');
            chip.appendChild(brandLogo(item.brand));
            chip.appendChild(el('span', 'hw-compare__chip-name', item.name));

            var remove = el('button', 'hw-compare__chip-remove', '×');
            remove.type = 'button';
            remove.setAttribute('aria-label', 'Убрать из сравнения: ' + item.name);
            remove.addEventListener('click', function () { toggleCompare(item.id); });
            chip.appendChild(remove);
            els.compareItems.appendChild(chip);
        });

        if (items.length === 1) {
            els.compareItems.appendChild(el('span', 'hw-compare__hint',
                'Выберите ещё ' + (items[0].type === 'GPU' ? 'видеокарту' : 'процессор')));
        }

        if (els.compareGo) els.compareGo.disabled = items.length !== 2;
        if (els.compareClear) els.compareClear.hidden = items.length === 0;
    }

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

        var tdCompare = el('td', 'hw-cell hw-cell--compare');
        tdCompare.appendChild(buildCompareToggle(item, 'row'));
        tr.appendChild(tdCompare);

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

        var foot = el('div', 'hw-card__foot');
        foot.appendChild(el('span', 'hw-card__more', 'Все характеристики'));
        foot.appendChild(buildCompareToggle(item, 'card'));
        card.appendChild(foot);

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

    /* ---------- Модалка сравнения (A vs B внутри одного типа) ---------- */

    /* Строка сравнения: get() отдаёт число для поиска лучшего значения,
       format() — текст для колонки. Числовые строки собирает numRow(),
       текстовые (без ✓) — textRow(). */

    function numRow(label, key, better, format) {
        return {
            label: label,
            key: key,
            better: better,
            get: function (item) {
                return typeof item[key] === 'number' ? item[key] : null;
            },
            format: format
        };
    }

    function textRow(label, key, format) {
        return {
            label: label,
            key: key,
            better: null,
            get: null,
            format: format
        };
    }

    /* Производные метрики считаем на лету — в базе их нет.
       «Больше — лучше», ✓ ставится так же, как для PassMark. */

    function passmarkPerWatt(item) {
        if (!item.tdp_w || !item.passmark_score) return null;
        return Math.round(item.passmark_score / item.tdp_w);
    }

    function passmarkPerDollar(item) {
        if (!item.launch_price_usd || !item.passmark_score) return null;
        return Math.round(item.passmark_score / item.launch_price_usd);
    }

    function passmarkPerWattText(item) {
        var value = passmarkPerWatt(item);
        return value === null ? null : fmtNum(value) + ' очк./Вт';
    }

    function passmarkPerDollarText(item) {
        var value = passmarkPerDollar(item);
        return value === null ? null : fmtNum(value) + ' очк./$';
    }

    // needBoth — метрика не показывается, если исходных данных нет хотя бы у одной модели
    function derivedRow(label, get, format) {
        return {
            label: label,
            key: null,
            needBoth: true,
            better: 'high',
            get: get,
            format: format
        };
    }

    function passmarkRow() {
        return {
            label: 'PassMark',
            key: 'passmark_score',
            better: 'high',
            bar: true,
            get: function (item) { return item.passmark_score; },
            format: function (item) { return passmarkText(item); }
        };
    }

    // У GPU ядра разных архитектур (CUDA / потоковые процессоры), поэтому подписываем явно
    function coresRow(type, withThreads) {
        var label = type === 'GPU' ? 'Ядра (CUDA / SP)' : (withThreads ? 'Ядра / потоки' : 'Ядер');
        return numRow(label, 'cores', 'high', function (item) {
            return withThreads ? item.cores + ' / ' + (item.threads || '—') : String(item.cores);
        });
    }

    // Базовый режим — тот же набор строк, что и до появления секций
    function compareRows(a) {
        var rows = [
            passmarkRow(),
            numRow('Год выпуска', 'release_year', null, function (item) { return item.release_year; }),
            numRow('TDP', 'tdp_w', 'low', function (item) { return item.tdp_w ? item.tdp_w + ' Вт' : null; }),
            numRow('Техпроцесс', 'tech_process_nm', 'low', function (item) { return item.tech_process_nm + ' нм'; }),
            numRow('Цена на старте', 'launch_price_usd', 'low', function (item) {
                return item.launch_price_usd ? '$' + fmtNum(item.launch_price_usd) : null;
            })
        ];

        if (a.type === 'GPU') {
            rows.splice(1, 0, numRow('Видеопамять', 'vram_gb', 'high', function (item) {
                return item.vram_gb ? item.vram_gb + ' ГБ' : null;
            }));
        }

        rows.push(coresRow(a.type, false));
        rows.push(numRow('Базовая частота', 'base_clock', 'high', function (item) { return clockValue(item.base_clock, item.type); }));
        rows.push(numRow('Буст-частота', 'boost_clock', 'high', function (item) { return clockValue(item.boost_clock, item.type); }));
        rows.push(textRow('Бренд', 'brand', function (item) { return item.brand; }));

        return rows;
    }

    function buildCompareValue(item, row, isBest) {
        var text = row.format(item);
        var empty = text === null || text === undefined || text === '';
        var cell = el('div', 'hw-cmp-val' + (isBest ? ' is-best' : '') + (empty ? ' hw-cmp-val--empty' : ''));
        cell.appendChild(el('span', 'hw-cmp-val__text', empty ? '—' : text));
        if (row.bar && !empty) {
            var bar = el('span', 'hw-cmp-bar');
            var fill = el('i', 'hw-cmp-bar__fill');
            fill.style.width = benchPercent(item) + '%';
            bar.appendChild(fill);
            cell.appendChild(bar);
        }
        return cell;
    }

    function buildCompareRows(container, a, b, rows) {
        rows.forEach(function (row) {
            var va = row.get ? row.get(a) : null;
            var vb = row.get ? row.get(b) : null;

            // Производную метрику без исходных данных не показываем вовсе
            if (row.needBoth && (va === null || vb === null)) return;

            var best = null;
            if (row.better && typeof va === 'number' && typeof vb === 'number' && va !== vb) {
                best = (row.better === 'high' ? (va > vb) : (va < vb)) ? 'a' : 'b';
            }

            var line = el('div', 'hw-cmp-row');
            line.appendChild(buildCompareValue(a, row, best === 'a'));
            line.appendChild(el('div', 'hw-cmp-label', row.label));
            line.appendChild(buildCompareValue(b, row, best === 'b'));
            container.appendChild(line);
        });
    }

    /* ---------- Режим детализации: «Базово» / «Полно» ---------- */

    var COMPARE_MODE_KEY = 'hw-compare-mode';
    var COMPARE_MODES = { basic: 'Базово', full: 'Полно' };
    var compareMode = 'basic';

    function readCompareMode() {
        try {
            var saved = window.localStorage.getItem(COMPARE_MODE_KEY);
            if (saved && COMPARE_MODES[saved]) return saved;
        } catch (err) {
            /* Приватный режим или отключённое хранилище — остаёмся на «Базово» */
        }
        return 'basic';
    }

    function saveCompareMode(mode) {
        try {
            window.localStorage.setItem(COMPARE_MODE_KEY, mode);
        } catch (err) {
            /* Сохранение режима не критично для сравнения */
        }
    }

    // Тумблер «Базово / Полно» в шапке модалки сравнения
    function buildCompareToolbar(a, b) {
        var toolbar = el('div', 'hw-cmp-toolbar');
        var group = el('div', 'hw-cmp-mode');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Детализация сравнения');

        ['basic', 'full'].forEach(function (mode) {
            var active = compareMode === mode;
            var button = el('button', 'hw-cmp-mode__btn' + (active ? ' is-active' : ''), COMPARE_MODES[mode]);
            button.type = 'button';
            button.setAttribute('data-mode', mode);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.addEventListener('click', function () { setCompareMode(mode, a, b); });
            group.appendChild(button);
        });

        toolbar.appendChild(group);
        return toolbar;
    }

    /* ---------- Полный режим: секции характеристик ---------- */

    // Оценочные значения помечаем «≈» — см. specs_approx в hardware-data.js
    function specText(item, key, text) {
        if (text === null || text === undefined || text === '') return null;
        return (item.specs_approx.indexOf(key) !== -1 ? '≈ ' : '') + text;
    }

    function buildCompareSection(section, a, b) {
        var details = el('details', 'hw-cmp-section');
        details.open = section.open === true;

        var summary = el('summary', 'hw-cmp-section__head');
        summary.appendChild(el('span', 'hw-cmp-section__title', section.title));
        summary.appendChild(el('span', 'hw-cmp-section__chev'));
        details.appendChild(summary);

        var body = el('div', 'hw-cmp-section__rows');
        buildCompareRows(body, a, b, section.rows);
        details.appendChild(body);

        return details;
    }

    function buildCompareHead(a, b) {
        var head = el('div', 'hw-cmp-head');
        [a, b].forEach(function (item, index) {
            if (index === 1) head.appendChild(el('div', 'hw-cmp-vs', 'VS'));
            var col = el('div', 'hw-cmp-col');
            var logo = el('span', 'hw-cmp-logo');
            logo.appendChild(brandLogo(item.brand));
            col.appendChild(logo);
            var title = el('h3', 'hw-cmp-title', item.name);
            if (index === 0) title.id = 'hw-modal-title';
            col.appendChild(title);
            col.appendChild(el('p', 'hw-cmp-meta', item.brand + ' · ' + item.type + ' · ' + item.release_year));
            head.appendChild(col);
        });
        return head;
    }

    // Отрисовка содержимого модалки — и при открытии, и при смене режима
    function renderCompare(a, b) {
        els.modalContent.textContent = '';
        els.modalContent.appendChild(buildCompareHead(a, b));
        els.modalContent.appendChild(buildCompareToolbar(a, b));


        if (a.passmark_score !== b.passmark_score) {
            var faster = a.passmark_score > b.passmark_score ? a : b;
            var slower = faster === a ? b : a;
            var diff = Math.round(((faster.passmark_score / slower.passmark_score) - 1) * 100);
            els.modalContent.appendChild(el('p', 'hw-cmp-summary',
                faster.name + ' быстрее на ' + diff + '% по PassMark: ' + passmarkText(faster) +
                ' против ' + passmarkText(slower)));
        } else {
            els.modalContent.appendChild(el('p', 'hw-cmp-summary', 'PassMark: результаты совпадают'));
        }

        if (compareMode === 'full') {
            // «Полно» — все характеристики по секциям, свёрнутым кроме первой
            var groups = el('div', 'hw-cmp-groups');
            compareSections(a, b).forEach(function (section) {
                groups.appendChild(buildCompareSection(section, a, b));
            });
            els.modalContent.appendChild(groups);
        } else {
            // «Базово» — прежний плоский список строк
            var rows = el('div', 'hw-cmp-rows');
            buildCompareRows(rows, a, b, compareRows(a));
            els.modalContent.appendChild(rows);
        }

        var actions = el('div', 'hw-modal__actions');
        var clearBtn = el('button', 'btn btn-secondary', 'Очистить');
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', function () {
            state.compare = [];
            renderList();
            renderCompareTray();
            syncUrl();
            reachGoal('hw_compare_clear');
            closeModal();
        });
        var closeBtn = el('button', 'btn btn-secondary', 'Закрыть');
        closeBtn.type = 'button';
        closeBtn.setAttribute('data-hw-close', '');
        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);
        els.modalContent.appendChild(actions);
    }

    // Переключение «Базово / Полно» без закрытия модалки
    function setCompareMode(mode, a, b) {
        if (compareMode === mode) return;
        compareMode = mode;
        saveCompareMode(mode);

        var dialog = els.modal.querySelector('.hw-modal__dialog');
        var scrollTop = dialog ? dialog.scrollTop : 0;
        renderCompare(a, b);
        if (dialog) dialog.scrollTop = scrollTop;

        // Возвращаем фокус на тот же тумблер — кнопка пересоздана вместе с контентом
        var next = els.modalContent.querySelector('.hw-cmp-mode__btn[data-mode="' + mode + '"]');
        if (next) {
            try {
                next.focus({ preventScroll: true });
            } catch (err) {
                next.focus();
            }
        }

        if (mode === 'full') {
            reachGoal('hw_compare_full', { left: a.name, right: b.name, type: a.type });
        }
    }

    function openCompare() {
        var items = selectedModels();
        // Сравниваем только модели одного типа — GPU с GPU, CPU с CPU
        if (items.length !== 2 || items[0].type !== items[1].type) return;
        if (!els.modal || !els.modalContent) return;

        var a = items[0];
        var b = items[1];

        compareMode = readCompareMode();
        renderCompare(a, b);

        var dialog = els.modal.querySelector('.hw-modal__dialog');
        if (dialog) dialog.classList.add('hw-modal__dialog--wide');

        lastFocused = document.activeElement;
        els.modal.classList.add('open');
        els.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hw-modal-open');

        var focusTarget = els.modal.querySelector('.hw-modal__close');
        window.requestAnimationFrame(function () {
            if (focusTarget) focusTarget.focus();
        });

        reachGoal('hw_compare_open', { left: a.name, right: b.name, type: a.type, mode: compareMode });
    }

    /* ---------- Полный режим: состав секций ---------- */

    function compareSections(a, b) {
        var isGpu = a.type === 'GPU';
        return [
            generalSection(),
            performanceSection(a.type),
            memorySection(isGpu),
            powerSection(isGpu),
            platformSection(a, b, isGpu)
        ];
    }

    function generalSection() {
        return {
            title: 'Общее',
            open: false,
            rows: [
                textRow('Бренд', 'brand', function (item) { return item.brand; }),
                numRow('Год выпуска', 'release_year', null, function (item) { return item.release_year; }),
                numRow('Техпроцесс', 'tech_process_nm', 'low', function (item) { return item.tech_process_nm + ' нм'; })
            ]
        };
    }

    // «Производительность» открыта по умолчанию, остальные секции свёрнуты
    function performanceSection(type) {
        return {
            title: 'Производительность',
            open: true,
            rows: [
                passmarkRow(),
                coresRow(type, type !== 'GPU'),
                numRow('Базовая частота', 'base_clock', 'high', function (item) { return clockValue(item.base_clock, item.type); }),
                numRow('Буст-частота', 'boost_clock', 'high', function (item) { return clockValue(item.boost_clock, item.type); }),
                derivedRow('PassMark на ватт', passmarkPerWatt, passmarkPerWattText),
                derivedRow('PassMark на $', passmarkPerDollar, passmarkPerDollarText),
                numRow('Цена на старте', 'launch_price_usd', 'low', function (item) {
                    return item.launch_price_usd ? '$' + fmtNum(item.launch_price_usd) : null;
                })
            ]
        };
    }

    function memorySection(isGpu) {
        if (isGpu) {
            return {
                title: 'Память',
                open: false,
                rows: [
                    numRow('Видеопамять', 'vram_gb', 'high', function (item) {
                        return item.vram_gb ? item.vram_gb + ' ГБ' : null;
                    }),
                    numRow('Шина памяти', 'bus_width_bits', 'high', function (item) {
                        return item.bus_width_bits ? item.bus_width_bits + ' бит' : null;
                    }),
                    numRow('Пропускная способность', 'memory_bandwidth_gbps', 'high', function (item) {
                        if (!item.memory_bandwidth_gbps) return null;
                        return specText(item, 'memory_bandwidth_gbps', fmtNum(item.memory_bandwidth_gbps) + ' ГБ/с');
                    })
                ]
            };
        }

        return {
            title: 'Память',
            open: false,
            rows: [
                numRow('Кэш L3', 'cache_l3_mb', 'high', function (item) {
                    return item.cache_l3_mb ? item.cache_l3_mb + ' МБ' : null;
                }),
                textRow('Тип памяти', 'memory_support', function (item) { return item.memory_support; }),
                {
                    label: 'PCIe',
                    key: 'pcie_version',
                    better: 'high',
                    get: function (item) { return item.pcie_version ? parseFloat(item.pcie_version) : null; },
                    format: function (item) { return item.pcie_version ? 'PCIe ' + item.pcie_version : null; }
                }
            ]
        };
    }

    // «Питание и тепло»: у GPU — БП и разъёмы, у CPU — Tjmax
    function powerSection(isGpu) {
        if (isGpu) {
            return {
                title: 'Питание и тепло',
                open: false,
                rows: [
                    numRow('TDP', 'tdp_w', 'low', function (item) { return item.tdp_w ? item.tdp_w + ' Вт' : null; }),
                    numRow('Рекомендуемый БП', 'recommended_psu_w', 'low', function (item) {
                        if (!item.recommended_psu_w) return null;
                        return specText(item, 'recommended_psu_w', item.recommended_psu_w + ' Вт');
                    }),
                    textRow('Разъёмы питания', 'power_connectors', function (item) {
                        return specText(item, 'power_connectors', item.power_connectors);
                    })
                ]
            };
        }

        return {
            title: 'Питание и тепло',
            open: false,
            rows: [
                numRow('TDP', 'tdp_w', 'low', function (item) { return item.tdp_w ? item.tdp_w + ' Вт' : null; }),
                numRow('Tjmax', 'tjmax_c', 'high', function (item) {
                    return item.tjmax_c ? specText(item, 'tjmax_c', item.tjmax_c + ' °C') : null;
                })
            ]
        };
    }

    // «Платформа»: у CPU — сокет, архитектура, iGPU и разгон,
    // у GPU — архитектура, RT/тензорные ядра, видеовыходы и апскейлинг
    function platformSection(a, b, isGpu) {
        if (isGpu) {
            return {
                title: 'Платформа',
                open: false,
                rows: gpuPlatformRows(a, b)
            };
        }

        return {
            title: 'Платформа',
            open: false,
            rows: [
                textRow('Socket', 'socket', function (item) { return item.socket; }),
                textRow('Архитектура', 'codename', function (item) { return item.codename; }),
                textRow('Встроенная графика', 'igpu', function (item) { return item.igpu; }),
                {
                    label: 'Разгон',
                    key: 'overclocking',
                    better: 'high',
                    get: function (item) {
                        return typeof item.overclocking === 'boolean' ? (item.overclocking ? 1 : 0) : null;
                    },
                    format: function (item) {
                        if (typeof item.overclocking !== 'boolean') return null;
                        return item.overclocking ? 'Да' : 'Нет';
                    }
                }
            ]
        };
    }

    function gpuPlatformRows(a, b) {
        var bothAmd = a.brand === 'AMD' && b.brand === 'AMD';
        var anyAmd = a.brand === 'AMD' || b.brand === 'AMD';
        var accelLabel = bothAmd ? 'Ray-акселераторы'
            : (anyAmd ? 'Tensor-ядра / Ray-акселераторы' : 'Tensor-ядра');

        var rows = [textRow('Архитектура', 'architecture', function (item) { return item.architecture; })];

        // RT-ядра есть у NVIDIA и Intel; у AMD их роль играют ray-акселераторы
        if (!bothAmd) {
            rows.push(numRow('RT-ядра', 'rt_cores', 'high', function (item) {
                return item.rt_cores === null ? null : String(item.rt_cores);
            }));
        }

        // Для AMD в данных нет Tensor-ядер — показываем ray_accelerators
        rows.push({
            label: accelLabel,
            key: 'tensor_cores',
            better: 'high',
            get: function (item) {
                var value = item.tensor_cores !== null ? item.tensor_cores : item.ray_accelerators;
                return typeof value === 'number' ? value : null;
            },
            format: function (item) {
                var key = item.tensor_cores !== null ? 'tensor_cores' : 'ray_accelerators';
                var value = item[key];
                return value === null || value === undefined ? null : specText(item, key, String(value));
            }
        });

        rows.push(textRow('Выводы изображения', 'outputs', function (item) {
            return item.outputs && item.outputs.length ? item.outputs.join(', ') : null;
        }));
        rows.push(textRow('Апскейлинг', 'upscaling', function (item) { return item.upscaling; }));

        return rows;
    }

    function openModal(id) {
        var item = findById(id);
        if (!item || !els.modal || !els.modalContent) return;

        var dialog = els.modal.querySelector('.hw-modal__dialog');
        if (dialog) dialog.classList.remove('hw-modal__dialog--wide');

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
        var focusable = els.modal.querySelectorAll('button, summary, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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
        if (state.compare.length) params.set('cmp', state.compare.join(','));
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

        // Сравнение из ссылки: берём максимум две модели одного типа
        var picked = [];
        var pickedType = null;
        (params.get('cmp') || '').split(',').forEach(function (id) {
            var item = findById(id.trim());
            if (!item || picked.length >= 2) return;
            if (pickedType && pickedType !== item.type) return;
            pickedType = item.type;
            picked.push(item.id);
        });
        state.compare = picked;
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
        var toggle = e.target && e.target.closest ? e.target.closest('.hw-compare-toggle') : null;
        if (toggle) {
            var holder = toggle.closest('[data-id]');
            if (holder) toggleCompare(holder.getAttribute('data-id'));
            return;
        }

        var row = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
        if (!row) return;
        openModal(row.getAttribute('data-id'));
    }

    function onListKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;

        var target = e.target;
        // Кнопке «Сравнить» отдаём клавишу целиком — она сама сгенерирует click
        if (target && target.closest && target.closest('.hw-compare-toggle')) return;

        var row = target && target.closest ? target.closest('[data-id]') : null;
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

        if (els.compareGo) {
            els.compareGo.addEventListener('click', openCompare);
        }

        if (els.compareClear) {
            els.compareClear.addEventListener('click', function () {
                if (!state.compare.length) return;
                state.compare = [];
                renderList();
                renderCompareTray();
                syncUrl();
                reachGoal('hw_compare_clear');
            });
        }
    }

    /* ---------- Старт ---------- */

    function init() {
        if (els.total) els.total.textContent = MODELS.length;
        if (els.emptyTotal) els.emptyTotal.textContent = MODELS.length;
        if (els.totalLabel) {
            els.totalLabel.textContent = plural(MODELS.length, 'модель', 'модели', 'моделей') + ' в базе';
        }

        readUrl();
        syncControls();
        bindEvents();
        renderList();
        renderCompareTray();
        syncUrl();

        // Ссылка вида ?cmp=… сразу открывает сравнение
        if (state.compare.length === 2) {
            openCompare();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

