document.addEventListener("DOMContentLoaded", (event) => {
    const output = document.getElementById("output");
    const copy = document.getElementById("copy");

    const form = document.getElementById("main-form");
// Debouncing function to limit the frequency of updates
    let debounceTimer;
    const debounce = (callback, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(callback, delay);
    };

    form.addEventListener("input", (event) => {
        console.log(event.target.tagName.toLowerCase());
        if (event.target.tagName.toLowerCase() === 'input') {
            debounce(() => {
                const formData = Object.fromEntries(new FormData(form).entries());
                console.log(formData);
                const {title, url, author, description, handle} = formData;
                console.log(title || url || author || description || handle)
                if(!(title || url || author || description || handle)){
                    output.value = "Please fill all the fields";
                }else{
                    const xml = generateXml({title, url, author, description, handle});
                    output.rows = xml.split("\n").length +2;
                    output.value = generateXml({title, url, author, description, handle});
                }
            }, 100); // Debounce delay of 300ms
        }
    });

    addCopyToClipboardOnButton(copy,()=> output.value)

});


const generateXml = ({title, url, author, description, handle}) => {
    const previewUrl = url && (url + "/preview.png").replace(/\/\//g, "/");
    const xmlParts = [
        title && `<title>${title}</title>`,
        url && `<link href="${url}" rel="canonical" />`,
        `<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />`,
        author && `<meta name="author" content="${author}" />`,
        description &&`<meta name="description" content="${description}" />`,
        handle && `<meta name="twitter:site" content="${handle}" />`,
        handle && `<meta name="twitter:creator" content="${handle}" />`,
        previewUrl && `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
        description && `<meta property="og:description" content="${description}" />`,
        previewUrl && `<meta property="og:image" content="${previewUrl}" />`,
        `<meta property="og:locale" content="en_US" />`,
        title && `<meta property="og:site_name" content="${title}" />`,
        title && `<meta property="og:title" content="${title}" />`,
        `<meta property="og:type" content="website" />`,
        url && `<meta property="og:url" content="${url}" />`,
        previewUrl && `<meta property="twitter:image" content="${previewUrl}" />`,
        title && `<meta property="twitter:title" content="${title}" />`,
        `<script type="application/ld+json">`,
        title && description && url && `{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "author": {
                "@type": "Person",
                "name": "${author}"
            },
            "description": "${description}",
            "headline": "${title}",
            "name": "${title}",
            "url": "${url}"
        }`
    ];
    return xmlParts.filter(v => v).join("\n");
}
