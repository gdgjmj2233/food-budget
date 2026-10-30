const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/lib/plan-comparison.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText)(mod, mod.exports);
const { comparePlans } = mod.exports;
const plans = [{ id: 'lunch', price: 7000 }, { id: 'dinner', price: 12000 }];
const meal = { id: 'm1', planId: 'lunch', price: 8500 };
assert.deepEqual(comparePlans(plans, [meal]), { actual: 8500, completedCount: 1, difference: 1500, unplanned: 0 });
assert.equal(comparePlans(plans, [{ ...meal, price: 5000 }]).difference, -2000);
assert.equal(comparePlans(plans, [{ ...meal, price: 7000 }]).difference, 0);
assert.equal(comparePlans(plans, [{ ...meal, price: 0 }]).difference, -7000);
assert.deepEqual(comparePlans(plans, []), { actual: 0, completedCount: 0, difference: 0, unplanned: 0 });
assert.deepEqual(comparePlans(plans, [meal, { id: 'm2', price: 4500 }]), { actual: 13000, completedCount: 1, difference: 1500, unplanned: 4500 });
assert.equal(comparePlans([], [meal]).unplanned, 8500);
console.log('Plan comparison: 7 scenarios passed');
