/* globals window, document, MutationObserver, jQuery */
(function () {
  const NONE_VALUE = '__none__';

  // ──────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────
  const getValues = (select) => {
    if (select.multiple) {
      return Array.from(select.options)
          .filter(o => o.selected)
          .map(o => String(o.value));
    }
    return [String(select.value)];
  };

  const ensureHiddenContainer = (select) => {
    let container = select.parentElement.querySelector(`span[data-hidden-for="${select.id}"]`);
    if (!container) {
      container = document.createElement('span');
      container.dataset.hiddenFor = select.id;
      container.style.display = 'none';
      select.parentNode.insertBefore(container, select.nextSibling);
    }
    return container;
  };

  const syncHiddenInputs = (select) => {
    const container = ensureHiddenContainer(select);
    container.innerHTML = '';
    const values = getValues(select);
    values.forEach(v => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = select.name;
      input.value = v;
      container.appendChild(input);
    });
  };

  // Hide / show and enable / disable a single child <select>
  const updateChild = (parentSelect, childSelect, mapping) => {
    const parentValues = getValues(parentSelect);
    const hasMapping = parentValues.some(v => Object.prototype.hasOwnProperty.call(mapping, v));

    // Collect the union of allowed values based on current parent selection
    let allowed = [];
    parentValues.forEach(v => {
      if (Object.prototype.hasOwnProperty.call(mapping, v) && Array.isArray(mapping[v])) {
        allowed = allowed.concat(mapping[v].map(String));
      }
    });
    allowed = Array.from(new Set(allowed));

    const isBulk        = childSelect.querySelector(`option[value="${NONE_VALUE}"]`) !== null;
    const noChangeOption = childSelect.querySelector('option[value=""]');

    // Hide disallowed <option> elements
    Array.from(childSelect.querySelectorAll('option')).forEach(opt => {
      const val       = String(opt.value);
      const isSpecial = val === NONE_VALUE;
      const disallowed = !hasMapping
          ? val !== '' && !isSpecial
          : !allowed.includes(val) && val !== '' && !isSpecial;
      opt.hidden       = disallowed;
      opt.style.display = disallowed ? 'none' : '';
    });

    const hasNone  = parentValues.includes(NONE_VALUE);
    const hasValue = parentValues.some(v => v !== '' && v !== NONE_VALUE);

    // Enable / disable the child select depending on parent state
    if (hasNone) {
      childSelect.disabled = true;
      childSelect.value    = NONE_VALUE;
    } else if (!hasValue || !hasMapping) {
      childSelect.disabled = !isBulk;
      if (!isBulk) {
        childSelect.value = '';
      } else if (!allowed.includes(String(childSelect.value)) && childSelect.value !== NONE_VALUE) {
        childSelect.value = '';
      }
    } else {
      childSelect.disabled = false;
      if (!allowed.includes(String(childSelect.value)) && childSelect.value !== NONE_VALUE) {
        childSelect.value = '';
      }
    }

    // Hide “(no change)” option in bulk-edit when a real value is selected
    if (isBulk && hasValue && noChangeOption) {
      noChangeOption.hidden       = true;
      noChangeOption.style.display = 'none';
      if (childSelect.value === '') {
        childSelect.value = NONE_VALUE;
      }
    } else if (noChangeOption) {
      noChangeOption.hidden       = false;
      noChangeOption.style.display = '';
    }

    syncHiddenInputs(childSelect);
    childSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // ──────────────────────────────────────────────────────────────────────
  // Main setup routine
  // ──────────────────────────────────────────────────────────────────────
  const setup = (root = document) => {
    const rawData = window.DependingCustomFieldData;
    let mapping   = null;
    if (rawData && typeof rawData === 'object') {
      mapping = typeof rawData.mapping === 'object' ? rawData.mapping : rawData;
    }
    if (!mapping || typeof mapping !== 'object') {
      console.warn('DependingCustomFields: mapping is missing or invalid, setup skipped');
      return;
    }

    Object.keys(mapping).forEach(cid => {
      const info = mapping[cid];

      // All child <select> elements for this custom field ID
      const childSelects = root.querySelectorAll(
          `[id$="_custom_field_values_${cid}"], [id$="_custom_field_values_${cid}_"]`
      );

      childSelects.forEach(childSelect => {
        // Skip context-menu items unless inside the wizard pop-up
        const inMenu = childSelect.closest('#context-menu');
        if (inMenu && !childSelect.closest('.cf-wizard')) {
          const li = childSelect.closest('li');
          if (li) li.style.display = 'none';
          return;
        }
        if (childSelect.dataset.dependingInitialized) return;

        const prefix = childSelect.id.replace(/_custom_field_values_.*/, '');
        const parentSelect =
            document.getElementById(`${prefix}_custom_field_values_${info.parent_id}`) ||
            document.getElementById(`${prefix}_custom_field_values_${info.parent_id}_`);
        if (!parentSelect) return;

        // Initial bookkeeping for this child
        syncHiddenInputs(childSelect);
        childSelect.classList.add('depending-child');
        childSelect.dataset.dependingInitialized = '1';

        if (!childSelect.dataset.changeListener) {
          childSelect.addEventListener('change', () => syncHiddenInputs(childSelect));
          childSelect.dataset.changeListener = '1';
        }

        // ── NEW: register this child ID on the parent ───────────────────
        const key    = 'dependingChildIds';
        const cidStr = String(cid);
        const ids    = (parentSelect.dataset[key] || '').split(',').filter(Boolean);
        if (!ids.includes(cidStr)) {
          ids.push(cidStr);
          parentSelect.dataset[key] = ids.join(',');
        }
        // ────────────────────────────────────────────────────────────────

        // Attach ONE listener per parent that refreshes *all* its children
        if (!parentSelect.dataset.dependingChangeListener) {
          parentSelect.addEventListener('change', () => {
            const allIds  = (parentSelect.dataset[key] || '').split(',').filter(Boolean);
            const base    = parentSelect.id.replace(/_custom_field_values_.*/, '');
            allIds.forEach(id => {
              const child =
                  document.getElementById(`${base}_custom_field_values_${id}`) ||
                  document.getElementById(`${base}_custom_field_values_${id}_`);
              const childInfo = (mapping[id] || {}).map || {};
              if (child) updateChild(parentSelect, child, childInfo);
            });
          });
          parentSelect.dataset.dependingChangeListener = '1';
        }

        // Initial render for this child
        updateChild(parentSelect, childSelect, info.map || {});
      });
    });
  };

  // ──────────────────────────────────────────────────────────────────────
  // Debounced re-initialisation helpers
  // ──────────────────────────────────────────────────────────────────────
  let debounceTimeout;
  const requestSetup = (root = document) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => setup(root), 100);
  };

  // Initial load
  document.addEventListener('DOMContentLoaded', () => setup());

  // Re-run after any AJAX update (Redmine uses prototype & jQuery)
  if (window.jQuery) {
    jQuery(document).ajaxComplete(() => requestSetup(document));
  }

  // Observe dynamic context-menu content
  const observeContextMenu = () => {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.dataset.dependingObserver) {
      const observer = new MutationObserver(() => requestSetup(menu));
      observer.observe(menu, { childList: true, subtree: true });
      menu.dataset.dependingObserver = '1';
      requestSetup(menu);
    }
  };

  observeContextMenu();
  if (window.MutationObserver && document.body) {
    const bodyObserver = new MutationObserver(observeContextMenu);
    bodyObserver.observe(document.body, { childList: true });
  }

  window.DependingCustomFields = { requestSetup, setup };
})();
