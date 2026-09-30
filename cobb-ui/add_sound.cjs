const fs = require('fs');
let code = fs.readFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', 'utf8');

code = code.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect } from 'react';\nimport { playSound } from '../utils/sound';"
);

const newEffect = `
  useEffect(() => {
    const handleClick = (e) => {
      const btn = e.target.closest('button');
      if (btn) playSound('click');
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {`;

code = code.replace(
  `useEffect(() => {
    const handleKeyDown = (e) => {`,
  newEffect
);

fs.writeFileSync('d:/cobbbb/cobb-ui/src/components/Layout.jsx', code);
