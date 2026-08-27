const fs = require('fs');
let content = fs.readFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', 'utf8');

// Replace all instances of `\` at the end of lines inside the string literals
// It's safer to just replace them manually because we know exactly where they are.
content = content.replace('Hello Supplier, please process the following stock replenishment for *Cobb Pundri*:\\', 'Hello Supplier, please process the following stock replenishment for *Cobb Pundri*:\\n`;');
content = content.replace('message += `*${type}*\\', 'message += `*${type}*\\n`;');
content = content.replace('- Only ${i.CurrentStock} left.\\', '- Only ${i.CurrentStock} left.\\n`;');
content = content.replace('message += `\\', 'message += `\\n`;');

// Also, double check line 599 "Hello Supplier, please dispatch the following All-India Trending items"
content = content.replace('Hello Supplier, please dispatch the following All-India Trending items to Cobb Pundri immediately:\\', 'Hello Supplier, please dispatch the following All-India Trending items to Cobb Pundri immediately:\\n\\n`;');
content = content.replace('msg += `- [${item.ArticleNo}] ${item.ItemName} - ${item.Color} - Size ${item.Size}\\', 'msg += `- [${item.ArticleNo}] ${item.ItemName} - ${item.Color} - Size ${item.Size}\\n`;');
content = content.replace('msg += `\\', 'msg += `\\n`;');

fs.writeFileSync('d:\\cobbbb\\cobb-ui\\src\\App.jsx', content);
