---
emoji: 🧬
layout: post
title: Matrix Quine
category: Dev
description: "An animated quine in only 187 bytes of HTML+JS:"
---

An animated quine in only 187 bytes of HTML+JS:

```html
<body onload='setInterval(f=_=>{for(t++,o=i=0,w=35;i<384;o+=i++%+w?(f+f+f)[i].fontcolor(g==9?"#FFF":[0,g,0]):"\n")g=0|(i/w-t/((i%w)**5%w+3)+w*t)%w;p.innerHTML=o},t=9)'bgcolor=X><pre id=p>
```

[Matrix Quine](matrix/quine)
