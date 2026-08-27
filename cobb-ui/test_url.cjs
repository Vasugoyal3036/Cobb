fetch('https://cobb-7qrhj3446-vasugoyal3036s-projects.vercel.app/')
  .then(r => r.text())
  .then(html => {
    console.log(html);
  }).catch(e => console.error(e));
