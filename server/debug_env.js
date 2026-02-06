
const pass = process.env.AD_PASS || '';
console.log('--- DEBUG PASSWORD ---');
console.log(`Length: ${pass.length}`);
console.log(`First Char: ${pass[0]}`);
console.log(`Last Char: ${pass[pass.length - 1]}`);
console.log(`Contains Quote? ${pass.includes('"')}`);
console.log('----------------------');
