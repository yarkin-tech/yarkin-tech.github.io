// Конструктор заявки (страница «Контакты»): собирает текст заявки,
// копирует его в буфер обмена и открывает модалку с выбором канала.
// Никакой отправки на сервер — клиент вставляет текст в мессенджер сам.
// Логика перенесена 1:1 из старого js/main.js.

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
