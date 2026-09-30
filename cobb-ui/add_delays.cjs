const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');
let delayCounter = 0;
code = code.replace(/transition-all duration-500 ease-\[cubic-bezier\(0\.34,1\.56,0\.64,1\)\] \$\{/g, (match) => {
    let delay = delayCounter * 35;
    delayCounter++;
    return `transition-all duration-500 delay-[${delay}ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] \$\{`;
});
fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
console.log("Done");
