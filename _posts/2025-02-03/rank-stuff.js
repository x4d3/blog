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

const decrypt = message => {
    return LZString144.decompressFromEncodedURIComponent(message);
}

const encrypt = message => {
    return LZString144.compressToEncodedURIComponent(message);
}

function compareItems(a, b) {
    return new Promise((resolve, reject) => {
        const popup = document.createElement("article");
        popup.classList.add("popup");
        const closeButton = document.createElement("img");
        closeButton.src = "close.svg";
        closeButton.classList.add("closeButton");
        popup.appendChild(closeButton);

        const content = document.createElement("div");
        content.classList.add("content");


        const leftColumn = document.createElement("div");
        leftColumn.classList.add("column", "big");
        leftColumn.textContent = a;
        content.appendChild(leftColumn);

        const rightColumn = document.createElement("div");
        rightColumn.classList.add("column", "big");
        rightColumn.textContent = b;
        content.appendChild(rightColumn);
        popup.appendChild(content);

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

        closeButton.onclick = stopSort;

        rightColumn.onclick = (e) => {
            e.preventDefault();
            chooseResult(1)
        };

        leftColumn.onclick = (e) => {
            e.preventDefault();
            chooseResult(-1)
        };

        const onkeydown = (e) => {
            e.preventDefault();
            console.log(e);
            switch (e.code) {
                case "Escape":
                    stopSort();
                    break;
                case "ArrowRight":
                    chooseResult(1)
                    break;
                case "ArrowLeft":
                    chooseResult(-1)
                    break;
                default:
                    break;
            }
        };
        document.addEventListener("keydown", onkeydown);
    });
}

document.addEventListener("DOMContentLoaded", async (event) => {
    const list = document.getElementById("list");
    const shareUrl = document.getElementById("shareUrl");
    const copyButton = document.getElementById("copy");

    const QUERY_PARAM = "q";
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get(QUERY_PARAM);
    if (query) {
        const array = decrypt(query).split("\n").filter(e => e)
        await quickSort(array, compareItems);
        list.value = array.join("\n")

        const popup = document.createElement("article");
        popup.classList.add("popup");
        const content = document.createElement("div");
        content.classList.add("content");
        const column = document.createElement("div");
        column.classList.add("medium")
        column.innerHTML = "<p>Your ranking is: </p><ol>" + array.map(v => `<li>${v}</li>`).join("") + "</ol>";

        const closeButton = document.createElement("button");
        closeButton.innerText = "📋 Make your own list"
        column.appendChild(closeButton);
        content.appendChild(column);
        popup.appendChild(content);
        document.body.appendChild(popup);

        closeButton.onclick = () => {
            popup.remove();
            const url = new URL(window.location.href);
            url.searchParams.delete(QUERY_PARAM);
            history.replaceState({}, "", url);
        };
    }
    const updateLink = () => {
        const url = new URL(window.location.href);
        const encrypted = encrypt(list.value);
        url.searchParams.set(QUERY_PARAM, encrypted);
        shareUrl.href = url.toString();
        shareUrl.innerText = url.toString();
    }
    list.oninput = updateLink;
    updateLink();
    addCopyToClipboardOnButton(copyButton, () => shareUrl.href);
});

