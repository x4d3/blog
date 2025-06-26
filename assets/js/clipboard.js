// Utility sleep function
const _sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fallback copy for browsers without Clipboard API
const fallbackCopyTextToClipboard = (text) => {
    return new Promise((resolve, reject) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand("copy");
            const msg = successful ? "successful" : "unsuccessful";
            console.log("Fallback: Copying text command was " + msg);
            document.body.removeChild(textArea);
            successful ? resolve() : reject(new Error("Fallback copy unsuccessful"));
        } catch (err) {
            console.error("Fallback: Oops, unable to copy", err);
            document.body.removeChild(textArea);
            reject(err);
        }
    });
};

// Async copy with fallback
const copyTextToClipboard = async (text) => {
    if (!navigator.clipboard) {
        return fallbackCopyTextToClipboard(text);
    }

    try {
        await navigator.clipboard.writeText(text);
        console.log("Async: Copying to clipboard was successful!");
    } catch (err) {
        console.error("Async: Could not copy text: ", err);
        return fallbackCopyTextToClipboard(text);
    }
};

// Add copy button logic to any element
const addCopyToClipboardOnButton = (button, getTextToCopy, copieText = "✅ Copied") => {
    button.onclick = async (e) => {
        e.preventDefault();
        await copyTextToClipboard(getTextToCopy());
        const original = button.innerHTML;
        button.innerHTML = copieText;
        await _sleep(1000);
        button.innerHTML = original;
    };
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.highlighter-rouge').forEach((shell) => {
        const code = shell.querySelector('code');
        if (!code) return;

        shell.style.position = 'relative';

        const clipboard = document.createElement('div');
        clipboard.setAttribute('role', 'button');
        clipboard.setAttribute('tabindex', '0');
        clipboard.setAttribute('aria-label', 'Copy');
        clipboard.className = 'ClipboardButton btn btn-invisible js-clipboard-copy m-2 p-0 tooltipped-no-delay d-flex flex-justify-center flex-items-center';
        clipboard.setAttribute('data-copy-feedback', 'Copied!');
        clipboard.setAttribute('data-tooltip-direction', 'w');

        Object.assign(clipboard.style, {
            position: 'absolute',
            top: '0.5em',
            right: '0.5em',
            cursor: 'pointer',
            zIndex: '10',
            background: 'transparent',
            border: 'none',
            padding: '0',
        });

        clipboard.innerHTML = `
          <svg
            aria-hidden="true"
            height="16"
            width="16"
            viewBox="0 0 16 16"
            class="octicon octicon-copy js-clipboard-copy-icon"
          >
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 
                     0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 
                     .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 
                     9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z">
            </path>
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 
                     .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 
                     11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 
                     0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 
                     0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z">
            </path>
          </svg>
        
          <svg
            aria-hidden="true"
            height="16"
            width="16"
            viewBox="0 0 16 16"
            class="octicon octicon-check js-clipboard-check-icon color-fg-success"
            style="display: none;"
          >
            <path d="M13.78 4.22a.75.75 0 0 1 0 
                     1.06l-7.25 7.25a.75.75 0 0 1-1.06 
                     0L2.22 9.28a.751.751 0 0 1 
                     .018-1.042.751.751 0 0 1 
                     1.042-.018L6 10.94l6.72-6.72a.75.75 
                     0 0 1 1.06 0Z">
            </path>
          </svg>
        `;

        clipboard.addEventListener('click', async () => {
            try {
                const copyIcon = clipboard.querySelector('.js-clipboard-copy-icon');
                const checkIcon = clipboard.querySelector('.js-clipboard-check-icon');
                await copyTextToClipboard(code.innerText);
                copyIcon.style.display = 'none';
                checkIcon.style.display = 'inline';
                await _sleep(1500);
                copyIcon.style.display = 'inline';
                checkIcon.style.display = 'none';
            } catch (err) {
                console.error("Copy failed", err);
            }
        });

        shell.appendChild(clipboard);
    });
});
