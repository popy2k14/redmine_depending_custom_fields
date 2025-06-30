(function () {
  const NONE_VALUE = '__none__';

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

  const updateChild = (parentSelect, childSelect, mapping) => {
    const parentValues = getValues(parentSelect);
    const hasMapping = parentValues.some(v => Object.prototype.hasOwnProperty.call(mapping, v));
    let allowed = [];
    parentValues.forEach(v => {
      if (Object.prototype.hasOwnProperty.call(mapping, v) && Array.isArray(mapping[v])) {
        allowed = allowed.concat(mapping[v].map(String));
      }
    });
    allowed = Array.from(new Set(allowed));

    const isBulk = childSelect.querySelector(`option[value="${NONE_VALUE}"]`) !== null;
    const noChangeOption = childSelect.querySelector('option[value=""]');

    Array.from(childSelect.querySelectorAll('option')).forEach(opt => {
      const val = String(opt.value);
      const isSpecial = val === NONE_VALUE;
      const disallowed = !hasMapping
        ? val !== '' && !isSpecial
        : !allowed.includes(val) && val !== '' && !isSpecial;
      opt.hidden = disallowed;
      opt.style.display = disallowed ? 'none' : '';
    });

    const hasNone = parentValues.includes(NONE_VALUE);
    const hasValue = parentValues.some(v => v !== '' && v !== NONE_VALUE);

    if (hasNone) {
      childSelect.disabled = true;
      childSelect.value = NONE_VALUE;
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

    if (hasValue && noChangeOption) {
      noChangeOption.hidden = true;
      noChangeOption.style.display = 'none';
      if (childSelect.value === '') {
        childSelect.value = NONE_VALUE;
      }
    } else if (noChangeOption) {
      noChangeOption.hidden = false;
      noChangeOption.style.display = '';
    }

    syncHiddenInputs(childSelect);

    childSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const setup = (root = document) => {
    const rawData = window.DependingCustomFieldData || {};
    const mapping = rawData.mapping || rawData;
    Object.keys(mapping).forEach(cid => {
      const info = mapping[cid];
      const childSelects = root.querySelectorAll(
        `[id$="_custom_field_values_${cid}"], [id$="_custom_field_values_${cid}_"]`
      );
      childSelects.forEach(childSelect => {
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

        syncHiddenInputs(childSelect);
        childSelect.classList.add('depending-child');
        childSelect.dataset.dependingInitialized = '1';
        childSelect.addEventListener('change', () => {
          syncHiddenInputs(childSelect);
        });
        parentSelect.addEventListener('change', () => {
          updateChild(parentSelect, childSelect, info.map || {});
        });
        updateChild(parentSelect, childSelect, info.map || {});
      });
    });
  };

  let debounceTimeout;
  const requestSetup = (root = document) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => setup(root), 100);
  };

  document.addEventListener('DOMContentLoaded', () => setup());
  if (window.jQuery) {
    jQuery(document).ajaxComplete(() => requestSetup(document));
  }

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
