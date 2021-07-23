export function switchTab (root, id, callback) {
    const n = 'selected';
    const tabnav = root.querySelector('#tabnav');
    for (const node of tabnav.children) {
      if (node.id === id) {
        node.classList.add(n);
        continue;
      }
      node.classList.remove(n);
    }

    let activeTab = undefined;
    for (const node of root.querySelector('#tabs').children) {
      if (node.id === id) {
        node.classList.add(n);
        activeTab = node;
        continue;
      }
      node.classList.remove(n);
    }

    if (callback) {
      callback(activeTab);
    }
  }

  export function setupTabs (root, callback) {
    let first = undefined;

    for (const node of root.querySelector('#tabnav').children) {
      node.addEventListener('click', () => switchTab(root, node.id, callback), false);
      first = first || node;
    }

    if (first) {
      switchTab(root, first.id, callback);
    }
  }
