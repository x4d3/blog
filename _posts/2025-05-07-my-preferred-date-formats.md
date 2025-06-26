---
layout: post
title: My preferred date formats
category: Dev
description: A quick reference to my favorite date formats, with code examples across several programming languages.
---
## Formats
- **Human-readable:** `dd mmm yyyy` → `17 Sep 1985`
- **File-friendly:** `yyyy-mm-dd` → `1985-09-17`

---

## 🐍 Python
```python
from datetime import datetime
date = datetime(1985, 9, 17)

print("Human-readable:", date.strftime("%d %b %Y"))  # 17 Sep 1985
print("File-friendly:", date.strftime("%Y-%m-%d"))   # 1985-09-17
```

---

## 🌐 JavaScript
```javascript
const date = new Date(1985, 8, 17); // Months are 0-indexed

const options = { day: '2-digit', month: 'short', year: 'numeric' };
console.log("Human-readable:", date.toLocaleDateString('en-GB', options)); // 17 Sep 1985

const fileFriendly = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
console.log("File-friendly:", fileFriendly); // 1985-09-17
```

---

## 🦀 Rust
```rust
use chrono::NaiveDate;

fn main() {
    let date = NaiveDate::from_ymd_opt(1985, 9, 17).unwrap();

    println!("Human-readable: {}", date.format("%d %b %Y")); // 17 Sep 1985
    println!("File-friendly: {}", date.format("%Y-%m-%d"));  // 1985-09-17
}
```

---

## 💎 Ruby
```ruby
require 'date'
date = Date.new(1985, 9, 17)

puts "Human-readable: #{date.strftime("%d %b %Y")}"  # 17 Sep 1985
puts "File-friendly: #{date.strftime("%Y-%m-%d")}"   # 1985-09-17
```

---

## 🐹 Go
```go
package main
import (
    "fmt"
    "time"
)

func main() {
    date := time.Date(1985, 9, 17, 0, 0, 0, 0, time.UTC)

    fmt.Println("Human-readable:", date.Format("02 Jan 2006")) // 17 Sep 1985
    fmt.Println("File-friendly:", date.Format("2006-01-02"))   // 1985-09-17
}
```

---

## ☕ Java
```java
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class Main {
    public static void main(String[] args) {
        LocalDate date = LocalDate.of(1985, 9, 17);

        DateTimeFormatter humanReadable = DateTimeFormatter.ofPattern("dd MMM yyyy");
        DateTimeFormatter fileFriendly = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        System.out.println("Human-readable: " + date.format(humanReadable)); // 17 Sep 1985
        System.out.println("File-friendly: " + date.format(fileFriendly));   // 1985-09-17
    }
}
```


