document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("li").forEach((li, idx) => {
        if (!li.querySelector('input[type="checkbox"]')) {
            replaceTextNodesWithCheckboxes(li, "li" + idx);
        } else {
            // For existing checkboxes, assign id and restore state
            li.querySelectorAll('input[type="checkbox"]').forEach((checkbox, cidx) => {
                const checkboxId = "li" + idx + "-cb" + cidx;
                checkbox.dataset.checkboxId = checkboxId;
                const data = getCheckboxData();
                if (data[checkboxId]) {
                    checkbox.checked = data[checkboxId].checked;
                }
                checkbox.addEventListener("change", () => {
                    const now = new Date().toISOString();
                    const data = getCheckboxData();
                    data[checkboxId] = {
                        checked: checkbox.checked,
                        timestamp: now
                    };
                    setCheckboxData(data);
                });
            });
        }
    });


    document.querySelectorAll('li > input[type="checkbox"]').forEach(parentCheckbox => {
        parentCheckbox.addEventListener('change', function () {
            const li = parentCheckbox.closest('li');
            if (!li) return;
            const childCheckboxes = li.querySelectorAll('input[type="checkbox"]');
            console.log(childCheckboxes);
            childCheckboxes.forEach(cb => {
                if (cb.checked !== parentCheckbox.checked) {
                    cb.checked = parentCheckbox.checked;
                    // Save state directly to localStorage
                    const checkboxId = cb.dataset.checkboxId || cb.id;
                    const now = new Date().toISOString();
                    const data = getCheckboxData();
                    data[checkboxId] = {
                        checked: cb.checked,
                        timestamp: now
                    };
                    setCheckboxData(data);
                }
            });
            renderProgressBar();
        });
    });

    attachProgressListeners();
    renderProgressBar();
});


function getCheckboxData() {
    return JSON.parse(localStorage.getItem("checkboxStates") || "{}");
}

function setCheckboxData(data) {
    localStorage.setItem("checkboxStates", JSON.stringify(data));
}

function replaceTextNodesWithCheckboxes(node, path = "") {
    const currentData = getCheckboxData();
    let index = 0;
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent.includes("[ ]")) {
                const parts = child.textContent.split("[ ]");
                for (let i = 0; i < parts.length - 1; i++) {
                    child.parentNode.insertBefore(document.createTextNode(parts[i]), child);
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.style.marginRight = "8px";
                    // Unique id based on path and index
                    const checkboxId = path + "-cb" + index++;
                    checkbox.id = checkboxId;
                    // Restore state
                    checkbox.checked = !!currentData[checkboxId];

                    checkbox.addEventListener("change", () => {
                        const now = new Date().toISOString();
                        const data = getCheckboxData();
                        data[checkboxId] = {
                            checked: checkbox.checked,
                            timestamp: now
                        };
                        setCheckboxData(data);
                    });

                    child.parentNode.insertBefore(checkbox, child);
                }
                child.parentNode.insertBefore(document.createTextNode(parts[parts.length - 1]), child);
                child.parentNode.removeChild(child);
            }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            replaceTextNodesWithCheckboxes(child, path + "-" + index++);
        }
    });
}

function getCheckboxLabel(checkbox) {
    let node = checkbox.nextSibling;
    // Skip whitespace text nodes
    while (node && node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
        node = node.nextSibling;
    }
    // If next is an element (like <a>), return its text
    if (node && node.nodeType === Node.ELEMENT_NODE) {
        return node.textContent.trim();
    }
    // If next is a non-empty text node, return its text
    if (node && node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
    }
    return '';
}

function renderProgressBar() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const percent = total ? Math.round((checked / total) * 100) : 0;

    const progressDiv = document.getElementById('progress');
    if (!progressDiv) return;

    let nextLink = '';
    const nextCb = Array.from(checkboxes).find(cb => !cb.checked);
    if (nextCb) {
        const label = getCheckboxLabel(nextCb) || 'Next item';
        nextLink = `<div>Next: <a href="#${nextCb.id}">${label}</a></div>`;
    }

    progressDiv.innerHTML = `
        <div style="background:#eee;border-radius:4px;overflow:hidden;height:24px;width:100%;margin-bottom:8px;">
            <div style="background:#4caf50;height:100%;width:${percent}%;transition:width 0.3s;"></div>
        </div>
        <span>${checked} of ${total} completed (${percent}%)</span>
        ${nextLink}
    `;
}
// Attach to all checkboxes
function attachProgressListeners() {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', renderProgressBar);
    });
}
