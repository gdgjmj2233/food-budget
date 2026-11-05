import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/data/places.ts','utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText)(mod, mod.exports);
const { PLACES, mainMenu, mainMenuPrice, bestMenu } = mod.exports;
for (const place of PLACES) {
  assert.ok(place.menus.some(m => m.name === place.mainMenuName), `${place.name}: missing representative menu`);
  assert.equal(bestMenu(place,0).menu, mainMenu(place));
  assert.equal(bestMenu(place,999999).menu, mainMenu(place));
  assert.equal(bestMenu(place,mainMenuPrice(place)-1).fits,false);
  assert.equal(bestMenu(place,mainMenuPrice(place)).fits,true);
}
const pizza = PLACES.find(p => p.id === 'kU2C2IDFXADG');
assert.equal(mainMenu(pizza).name,'포테이토피자');
assert.equal(mainMenuPrice(pizza),11900);
assert.equal(bestMenu(pizza,7000).fits,false);
assert.equal(mainMenu(PLACES.find(p => p.id === 'siksin1722582')).name,'국내산 생닭갈비');
assert.equal(mainMenu(PLACES.find(p => p.id === 'ggasAoirprbm')).name,'등심돈까스');
const shuffled = {...pizza, menus:[...pizza.menus].reverse()};
assert.equal(mainMenu(shuffled).name,mainMenu(pizza).name);
console.log(`Representative menu checks passed for ${PLACES.length} restaurants; pizza, chicken and cutlet regression checks passed.`);
