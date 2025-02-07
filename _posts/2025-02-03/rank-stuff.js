/**
 * return the mid value among x, y, and z
 * @param x
 * @param y
 * @param z
 * @param compare
 * @returns {Promise.<*>}
 */
async function getPivot(x, y, z, compare) {
    if ((await compare(x, y)) < 0) {
        if ((await compare(y, z)) < 0) {
            return y;
        } else if ((await compare(z, x)) < 0) {
            return x;
        } else {
            return z;
        }
    } else if ((await compare(y, z)) > 0) {
        return y;
    } else if ((await compare(z, x)) > 0) {
        return x;
    } else {
        return z;
    }
}

/**
 * asynchronous quick sort
 * @param arr array to sort
 * @param asyncCompare asynchronous comparing function
 * @param left index where the range of elements to be sorted starts
 * @param right index where the range of elements to be sorted ends
 * @returns {Promise.<*>}
 */
async function quickSort(arr, asyncCompare, left = 0, right = arr.length - 1) {
    const cache = {}
    const compare = async (a, b) => {
        if (a === b) {
            return 0
        }
        const key = a + b;
        let value = cache[key];
        if (value !== undefined) {
            return value;
        }
        value = cache[b + a];
        if (value !== undefined) {
            return -value;
        }
        value = await asyncCompare(a, b);
        cache[key] = value;
        return value;
    }

    if (left < right) {
        let i = left,
            j = right,
            tmp;
        const pivot = await getPivot(arr[i], arr[i + Math.floor((j - i) / 2)], arr[j], compare);
        while (true) {
            while ((await compare(arr[i], pivot)) < 0) {
                i++;
            }
            while ((await compare(pivot, arr[j])) < 0) {
                j--;
            }
            if (i >= j) {
                break;
            }
            tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;

            i++;
            j--;
        }
        await quickSort(arr, compare, left, i - 1);
        await quickSort(arr, compare, j + 1, right);
    }
    return arr;
}

const DEFAULT_VALUE = `Tomato
Spinach
Carrots
Broccoli
`

const decrypt = message => {
    return LZString144.decompressFromEncodedURIComponent(message);
}

const encrypt = message => {
    return LZString144.compressToEncodedURIComponent(message);
}

function compareItems(a, b) {
    return new Promise((resolve, reject) => {
        const popup = document.createElement("div");
        popup.classList.add("popup");


        const leftColumn = document.createElement("article");
        leftColumn.classList.add("column", "big");
        leftColumn.textContent = a;
        popup.appendChild(leftColumn);

        const rightColumn = document.createElement("article");
        rightColumn.classList.add("column", "big");
        rightColumn.textContent = b;
        popup.appendChild(rightColumn);

        document.body.appendChild(popup);

        const closePopup = () => {
            document.removeEventListener("keydown", onkeydown);
            popup.remove();
        };

        const stopSort = () => {
            closePopup();
            reject("Closed")
        };

        const chooseResult = (value) => {
            closePopup();
            resolve(value)
        };


        rightColumn.onclick = (e) => {
            e.preventDefault();
            chooseResult(1)
        };

        leftColumn.onclick = (e) => {
            e.preventDefault();
            chooseResult(-1)
        };

        const onkeydown = (e) => {
            switch (e.code) {
                case "Escape":
                    stopSort();
                    break;
                default:
                    break;
            }
        };
        document.addEventListener("keydown", onkeydown);
    });
}

const PARAMS = {
    ANSWER: "a",
    RESULT: "r",
    EDIT: "e"
}
const locationWithParam = (name, value) => {
    const searchParams = new URLSearchParams([[name, value]])
    return `${location.origin}${location.pathname}?${searchParams}`;
}

const displayEdit = (values) => {
    const app = document.getElementById("app");
    app.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.innerText = "Separate items by new lines, and send the Share URL to you friend so that they can do their own ranking.";
    app.appendChild(paragraph);

    const list = document.createElement("textarea");
    list.rows = 15;
    list.value = values;
    app.appendChild(list)

    const label = document.createElement("label");
    label.innerText = "Share Url"
    app.appendChild(label);

    const shareUrl = document.createElement("a");
    app.appendChild(shareUrl);

    const buttonParagraph = document.createElement("p");
    const copyButton = document.createElement("button");
    copyButton.innerText = "📋 Copy";
    buttonParagraph.appendChild(copyButton)
    app.appendChild(buttonParagraph);
    const updateLink = () => {
        const encrypted = encrypt(list.value);
        const answerUrl = locationWithParam(PARAMS.ANSWER, encrypted)
        shareUrl.href = answerUrl.toString();
        shareUrl.innerText = answerUrl.toString();
        history.replaceState({}, "", locationWithParam(PARAMS.EDIT, encrypted));

    }
    list.oninput = debounce(updateLink);
    updateLink();
    addCopyToClipboardOnButton(copyButton, () => shareUrl.href);
}

const displayResult = (array) => {
    const popup = document.createElement("div");
    popup.classList.add("popup");
    const content = document.createElement("div");
    content.classList.add("medium")
    content.innerHTML = "<p>Your ranking is: </p><ol>" + array.map(v => `<li>${v}</li>`).join("") + "</ol>";

    const closeButton = document.createElement("button");
    closeButton.innerText = "📋 Make your own list"
    content.appendChild(closeButton);
    popup.appendChild(content);
    document.body.appendChild(popup);

    closeButton.onclick = () => {
        popup.remove();
        const url = locationWithParam(PARAMS.EDIT, encodeArrayToParam(array));
        history.replaceState({}, "", url);
        displayEdit(arrayToInput(array));
    };
}
const debounce = function (func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
};
/**
 *
 * @returns {string[]}
 * @param query {string}
 */
const inputToArray = (query) => {
    return query.split("\n").filter(e => e)
}

/**
 *
 * @returns {string}
 * @param array {string[]}
 */
const arrayToInput = (array) => {
    return array.join("\n");
}


/**
 *
 * @returns {string}
 * @param array {string[]}
 */
const encodeArrayToParam = (array) => {
    return encrypt(arrayToInput(array));
}

document.addEventListener("DOMContentLoaded", async (event) => {
    const urlParams = new URLSearchParams(window.location.search);

    const answerQuery = urlParams.get(PARAMS.ANSWER);
    if (answerQuery) {
        const input = decrypt(answerQuery);
        const array = inputToArray(input);
        await quickSort(array, compareItems);
        displayResult(array);
        const url = locationWithParam(PARAMS.RESULT, encodeArrayToParam(array));
        history.replaceState({}, "", url);
        return;
    }

    const resultQuery = urlParams.get(PARAMS.RESULT);
    if (resultQuery) {
        const input = decrypt(resultQuery);
        console.log(input)
        const array = inputToArray(input);
        console.log(array);
        displayResult(array)
        return;
    }
    const editQuery = urlParams.get(PARAMS.EDIT);
    const values = editQuery ? decrypt(editQuery) : DEFAULT_VALUE;
    displayEdit(values);
});

