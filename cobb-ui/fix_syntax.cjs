const fs = require('fs');

function insertLine(file, lineNum, text) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  lines.splice(lineNum - 1, 0, text);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`Fixed ${file}`);
}

function removeLine(file, lineNum) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  lines.splice(lineNum - 1, 1);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`Fixed ${file}`);
}

const dir = 'd:\\cobbbb\\cobb-ui\\src\\components\\';

// CustomerInsightsTab.jsx:37 -> add )}
insertLine(dir + 'tabs\\CustomerInsightsTab.jsx', 37, '                      )}');

// AutomationEngineTab.jsx:62 -> add )}
insertLine(dir + 'tabs\\AutomationEngineTab.jsx', 62, '                        )}');

// CampaignBuilderTab.jsx:96 -> remove )}
// Wait, is line 96 really just `)}`?
let camp = fs.readFileSync(dir + 'tabs\\CampaignBuilderTab.jsx', 'utf8').split('\n');
if (camp[95].includes(')}')) {
  removeLine(dir + 'tabs\\CampaignBuilderTab.jsx', 96);
} else {
  console.log("Campaign builder line 96 is not )} it is: " + camp[95]);
}

// CustomerProfileModal.jsx:159 -> remove )}
let mod = fs.readFileSync(dir + 'CustomerProfileModal.jsx', 'utf8').split('\n');
if (mod[158].includes(')}')) {
  removeLine(dir + 'CustomerProfileModal.jsx', 159);
} else {
  console.log("Modal line 159 is not )} it is: " + mod[158]);
}
