// ข้อมูลธาตุทั้ง 118 ธาตุ (ไม่พึ่งพา three.js เพื่อให้ทดสอบด้วย Node ได้)
// รูปแบบ: Z|สัญลักษณ์|ชื่ออังกฤษ|ชื่อไทย|มวลอะตอม|อิเล็กโทรเนกาติวิตี (Pauling, ว่าง = ไม่มีข้อมูล)
const RAW = `
1|H|Hydrogen|ไฮโดรเจน|1.008|2.20
2|He|Helium|ฮีเลียม|4.0026|
3|Li|Lithium|ลิเทียม|6.94|0.98
4|Be|Beryllium|เบริลเลียม|9.0122|1.57
5|B|Boron|โบรอน|10.81|2.04
6|C|Carbon|คาร์บอน|12.011|2.55
7|N|Nitrogen|ไนโตรเจน|14.007|3.04
8|O|Oxygen|ออกซิเจน|15.999|3.44
9|F|Fluorine|ฟลูออรีน|18.998|3.98
10|Ne|Neon|นีออน|20.180|
11|Na|Sodium|โซเดียม|22.990|0.93
12|Mg|Magnesium|แมกนีเซียม|24.305|1.31
13|Al|Aluminium|อะลูมิเนียม|26.982|1.61
14|Si|Silicon|ซิลิคอน|28.085|1.90
15|P|Phosphorus|ฟอสฟอรัส|30.974|2.19
16|S|Sulfur|กำมะถัน|32.06|2.58
17|Cl|Chlorine|คลอรีน|35.45|3.16
18|Ar|Argon|อาร์กอน|39.948|
19|K|Potassium|โพแทสเซียม|39.098|0.82
20|Ca|Calcium|แคลเซียม|40.078|1.00
21|Sc|Scandium|สแกนเดียม|44.956|1.36
22|Ti|Titanium|ไทเทเนียม|47.867|1.54
23|V|Vanadium|วาเนเดียม|50.942|1.63
24|Cr|Chromium|โครเมียม|51.996|1.66
25|Mn|Manganese|แมงกานีส|54.938|1.55
26|Fe|Iron|เหล็ก|55.845|1.83
27|Co|Cobalt|โคบอลต์|58.933|1.88
28|Ni|Nickel|นิกเกิล|58.693|1.91
29|Cu|Copper|ทองแดง|63.546|1.90
30|Zn|Zinc|สังกะสี|65.38|1.65
31|Ga|Gallium|แกลเลียม|69.723|1.81
32|Ge|Germanium|เจอร์เมเนียม|72.630|2.01
33|As|Arsenic|สารหนู|74.922|2.18
34|Se|Selenium|ซีลีเนียม|78.971|2.55
35|Br|Bromine|โบรมีน|79.904|2.96
36|Kr|Krypton|คริปทอน|83.798|3.00
37|Rb|Rubidium|รูบิเดียม|85.468|0.82
38|Sr|Strontium|สตรอนเชียม|87.62|0.95
39|Y|Yttrium|อิตเทรียม|88.906|1.22
40|Zr|Zirconium|เซอร์โคเนียม|91.224|1.33
41|Nb|Niobium|ไนโอเบียม|92.906|1.6
42|Mo|Molybdenum|โมลิบดีนัม|95.95|2.16
43|Tc|Technetium|เทคนีเชียม|98|1.9
44|Ru|Ruthenium|รูทีเนียม|101.07|2.2
45|Rh|Rhodium|โรเดียม|102.91|2.28
46|Pd|Palladium|แพลเลเดียม|106.42|2.20
47|Ag|Silver|เงิน|107.87|1.93
48|Cd|Cadmium|แคดเมียม|112.41|1.69
49|In|Indium|อินเดียม|114.82|1.78
50|Sn|Tin|ดีบุก|118.71|1.96
51|Sb|Antimony|พลวง|121.76|2.05
52|Te|Tellurium|เทลลูเรียม|127.60|2.1
53|I|Iodine|ไอโอดีน|126.90|2.66
54|Xe|Xenon|ซีนอน|131.29|2.6
55|Cs|Caesium|ซีเซียม|132.91|0.79
56|Ba|Barium|แบเรียม|137.33|0.89
57|La|Lanthanum|แลนทานัม|138.91|1.10
58|Ce|Cerium|ซีเรียม|140.12|1.12
59|Pr|Praseodymium|เพรซีโอดิเมียม|140.91|1.13
60|Nd|Neodymium|นีโอดิเมียม|144.24|1.14
61|Pm|Promethium|โพรมีเทียม|145|1.13
62|Sm|Samarium|ซาแมเรียม|150.36|1.17
63|Eu|Europium|ยูโรเพียม|151.96|1.2
64|Gd|Gadolinium|แกโดลิเนียม|157.25|1.2
65|Tb|Terbium|เทอร์เบียม|158.93|1.1
66|Dy|Dysprosium|ดิสโพรเซียม|162.50|1.22
67|Ho|Holmium|โฮลเมียม|164.93|1.23
68|Er|Erbium|เออร์เบียม|167.26|1.24
69|Tm|Thulium|ทูเลียม|168.93|1.25
70|Yb|Ytterbium|อิตเทอร์เบียม|173.05|1.1
71|Lu|Lutetium|ลูทีเชียม|174.97|1.27
72|Hf|Hafnium|แฮฟเนียม|178.49|1.3
73|Ta|Tantalum|แทนทาลัม|180.95|1.5
74|W|Tungsten|ทังสเตน|183.84|2.36
75|Re|Rhenium|รีเนียม|186.21|1.9
76|Os|Osmium|ออสเมียม|190.23|2.2
77|Ir|Iridium|อิริเดียม|192.22|2.20
78|Pt|Platinum|แพลทินัม|195.08|2.28
79|Au|Gold|ทองคำ|196.97|2.54
80|Hg|Mercury|ปรอท|200.59|2.00
81|Tl|Thallium|แทลเลียม|204.38|1.62
82|Pb|Lead|ตะกั่ว|207.2|2.33
83|Bi|Bismuth|บิสมัท|208.98|2.02
84|Po|Polonium|พอโลเนียม|209|2.0
85|At|Astatine|แอสทาทีน|210|2.2
86|Rn|Radon|เรดอน|222|2.2
87|Fr|Francium|แฟรนเซียม|223|0.7
88|Ra|Radium|เรเดียม|226|0.9
89|Ac|Actinium|แอกทิเนียม|227|1.1
90|Th|Thorium|ทอเรียม|232.04|1.3
91|Pa|Protactinium|โพรแทกทิเนียม|231.04|1.5
92|U|Uranium|ยูเรเนียม|238.03|1.38
93|Np|Neptunium|เนปทูเนียม|237|1.36
94|Pu|Plutonium|พลูโทเนียม|244|1.28
95|Am|Americium|อะเมริเซียม|243|1.13
96|Cm|Curium|คิวเรียม|247|1.28
97|Bk|Berkelium|เบอร์คีเลียม|247|1.3
98|Cf|Californium|แคลิฟอร์เนียม|251|1.3
99|Es|Einsteinium|ไอน์สไตเนียม|252|1.3
100|Fm|Fermium|เฟอร์เมียม|257|1.3
101|Md|Mendelevium|เมนเดลีเวียม|258|1.3
102|No|Nobelium|โนเบเลียม|259|1.3
103|Lr|Lawrencium|ลอว์เรนเซียม|266|1.3
104|Rf|Rutherfordium|รัทเทอร์ฟอร์เดียม|267|
105|Db|Dubnium|ดุบเนียม|268|
106|Sg|Seaborgium|ซีบอร์เกียม|269|
107|Bh|Bohrium|โบห์เรียม|270|
108|Hs|Hassium|ฮัสเซียม|277|
109|Mt|Meitnerium|ไมต์เนเรียม|278|
110|Ds|Darmstadtium|ดาร์มสตัดเทียม|281|
111|Rg|Roentgenium|เรินต์เกเนียม|282|
112|Cn|Copernicium|โคเปอร์นิเซียม|285|
113|Nh|Nihonium|นิโฮเนียม|286|
114|Fl|Flerovium|เฟลโรเวียม|289|
115|Mc|Moscovium|มอสโกเวียม|290|
116|Lv|Livermorium|ลิเวอร์มอเรียม|293|
117|Ts|Tennessine|เทนเนสซีน|294|
118|Og|Oganesson|โอกาเนสซอน|294|
`;

// สี CPK (แบบ Jmol) เรียงตามเลขอะตอม 1..109 (ปรับคาร์บอนให้เข้มขึ้นเพื่อให้เห็นชัดบนพื้นสว่าง)
const CPK = (
  'FFFFFF D9FFFF CC80FF C2FF00 FFB5B5 555555 3050F8 FF0D0D 90E050 B3E3F5 ' +
  'AB5CF2 8AFF00 BFA6A6 F0C8A0 FF8000 FFFF30 1FF01F 80D1E3 8F40D4 3DFF00 ' +
  'E6E6E6 BFC2C7 A6A6AB 8A99C7 9C7AC7 E06633 F090A0 50D050 C88033 7D80B0 ' +
  'C28F8F 668F8F BD80E3 FFA100 A62929 5CB8D1 702EB0 00FF00 94FFFF 94E0E0 ' +
  '73C2C9 54B5B5 3B9E9E 248F8F 0A7D8C 006985 C0C0C0 FFD98F A67573 668080 ' +
  '9E63B5 D47A00 940094 429EB0 57178F 00C900 70D4FF FFFFC7 D9FFC7 C7FFC7 ' +
  'A3FFC7 8FFFC7 61FFC7 45FFC7 30FFC7 1FFFC7 00FF9C 00E675 00D452 00BF38 ' +
  '00AB24 4DC2FF 4DA6FF 2194D6 267DAB 266696 175487 D0D0E0 FFD123 B8B8D0 ' +
  'A6544D 575961 9E4FB5 AB5C00 754F45 428296 420066 007D00 70ABFA 00BAFF ' +
  '00A1FF 008FFF 0080FF 006BFF 545CF2 785CE3 8A4FE3 A136D4 B31FD4 B31FBA ' +
  'B30DA6 BD0D87 C70066 CC0059 D1004F D90045 E00038 E6002E EB0026'
).split(' ');

// รัศมีโคเวเลนต์ (อังสตรอม) Z 1..96 ใช้กำหนดขนาดลูกบอลอะตอม
const COV = (
  '0.31 0.28 1.28 0.96 0.84 0.76 0.71 0.66 0.57 0.58 1.66 1.41 1.21 1.11 1.07 1.05 1.02 1.06 ' +
  '2.03 1.76 1.70 1.60 1.53 1.39 1.39 1.32 1.26 1.24 1.32 1.22 1.22 1.20 1.19 1.20 1.20 1.16 ' +
  '2.20 1.95 1.90 1.75 1.64 1.54 1.47 1.46 1.42 1.39 1.45 1.44 1.42 1.39 1.39 1.38 1.39 1.40 ' +
  '2.44 2.15 2.07 2.04 2.03 2.01 1.99 1.98 1.98 1.96 1.94 1.92 1.92 1.89 1.90 1.87 1.87 1.75 ' +
  '1.70 1.62 1.51 1.44 1.41 1.36 1.36 1.32 1.45 1.46 1.48 1.40 1.50 1.50 2.60 2.21 2.15 2.06 ' +
  '2.00 1.96 1.90 1.87 1.80 1.69'
).split(' ').map(Number);

const ALKALI = [3, 11, 19, 37, 55, 87];
const ALKALINE = [4, 12, 20, 38, 56, 88];
const NOBLE = [2, 10, 18, 36, 54, 86, 118];
const HALOGEN = [9, 17, 35, 53, 85, 117];
const METALLOID = [5, 14, 32, 33, 51, 52];
const NONMETAL = [1, 6, 7, 8, 15, 16, 34];

export const CATEGORIES = {
  'alkali': { th: 'โลหะแอลคาไล', en: 'Alkali metal', color: '#f0805f' },
  'alkaline': { th: 'โลหะแอลคาไลน์เอิร์ท', en: 'Alkaline earth metal', color: '#f2a65a' },
  'transition': { th: 'โลหะทรานซิชัน', en: 'Transition metal', color: '#4a7fd4' },
  'post-transition': { th: 'โลหะหลังทรานซิชัน', en: 'Post-transition metal', color: '#5aa0d8' },
  'metalloid': { th: 'ธาตุกึ่งโลหะ', en: 'Metalloid', color: '#3fb8a6' },
  'nonmetal': { th: 'อโลหะ', en: 'Reactive nonmetal', color: '#5cc46e' },
  'halogen': { th: 'แฮโลเจน', en: 'Halogen', color: '#e3c13b' },
  'noble': { th: 'แก๊สมีตระกูล', en: 'Noble gas', color: '#b46fd6' },
  'lanthanide': { th: 'แลนทาไนด์', en: 'Lanthanide', color: '#7181d0' },
  'actinide': { th: 'แอกทิไนด์', en: 'Actinide', color: '#9473cf' },
};

function categoryOf(z) {
  if (ALKALI.includes(z)) return 'alkali';
  if (ALKALINE.includes(z)) return 'alkaline';
  if (NOBLE.includes(z)) return 'noble';
  if (HALOGEN.includes(z)) return 'halogen';
  if (METALLOID.includes(z)) return 'metalloid';
  if (NONMETAL.includes(z)) return 'nonmetal';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return 'transition';
  return 'post-transition';
}

// คาบและหมู่ + ตำแหน่งบนตารางธาตุ (col 1..18, row 1..7 และแถว 9-10 สำหรับ f-block)
function placeOf(z) {
  const starts = [1, 3, 11, 19, 37, 55, 87, 119];
  let period = 1;
  while (z >= starts[period]) period++;
  const idx = z - starts[period - 1]; // ลำดับในคาบ เริ่มที่ 0
  let group = null;
  let row = period;
  let col;
  if (period === 1) {
    group = z === 1 ? 1 : 18;
  } else if (period <= 3) {
    group = idx < 2 ? idx + 1 : idx + 11;
  } else if (period <= 5) {
    group = idx + 1;
  } else {
    if (idx < 2) group = idx + 1;
    else if (idx < 17) {
      // f-block (La..Lu / Ac..Lr) แสดงในแถวแยกด้านล่าง
      row = period === 6 ? 9 : 10;
      col = idx + 1; // 3..17
    } else group = idx - 13;
  }
  if (col === undefined) col = group;
  return { period, group, row, col };
}

// อิเล็กตรอนวงนอก (เฉพาะธาตุหมู่หลัก)
function valenceElectronsOf(z, group) {
  if (z === 2) return 2;
  if (group === 1 || group === 2) return group;
  if (group >= 13 && group <= 18) return group - 10;
  return null;
}

// เวเลนซ์ที่อนุญาต (จำนวนพันธะรวม) — แบบจำลองอย่างง่ายสำหรับการเรียนรู้
const VALENCE_OVERRIDE = {
  H: [1], He: [0], Ne: [0], Ar: [0], Rn: [0], Og: [0], Kr: [0, 2], Xe: [0, 2, 4, 6],
  B: [3], C: [4], N: [3, 5], O: [2], F: [1],
  Al: [3], Si: [4], P: [3, 5], S: [2, 4, 6], Cl: [1, 3, 5, 7],
  Ge: [4], As: [3, 5], Se: [2, 4, 6], Br: [1, 3, 5],
  Sn: [2, 4], Sb: [3, 5], Te: [2, 4, 6], I: [1, 3, 5, 7], Pb: [2, 4], Bi: [3],
  Sc: [3], Ti: [4], V: [5], Cr: [3, 6], Mn: [2, 4, 7], Fe: [2, 3], Co: [2, 3], Ni: [2], Cu: [1, 2], Zn: [2],
  Y: [3], Zr: [4], Nb: [5], Mo: [6], Tc: [7], Ru: [3, 4], Rh: [3], Pd: [2], Ag: [1], Cd: [2],
  Hf: [4], Ta: [5], W: [6], Re: [7], Os: [4], Ir: [3, 4], Pt: [2, 4], Au: [1, 3], Hg: [1, 2],
  Th: [4], U: [4, 6],
};
// จำนวนอะตอมที่ต่อได้สูงสุด (ถ้าไม่ระบุ = ค่าเวเลนซ์สูงสุด)
const MAX_NEIGHBORS = { N: 3, Cl: 4, Br: 5, I: 5, Os: 4, Mn: 4, Re: 4, Tc: 4 };

function valenceOf(sym, z, group, cat) {
  if (VALENCE_OVERRIDE[sym]) return VALENCE_OVERRIDE[sym];
  if (z >= 104) return [0];
  if (cat === 'lanthanide' || cat === 'actinide') return [3];
  if (group === 1) return [1];
  if (group === 2) return [2];
  if (group === 13) return [3];
  if (group === 14) return [4];
  if (group === 15) return [3, 5];
  if (group === 16) return [2, 4, 6];
  if (group === 17) return [1, 3, 5, 7];
  if (group === 18) return [0];
  return [2];
}

// โครงแบบอิเล็กตรอนแยกตามระดับพลังงาน (แสดงเฉพาะธาตุที่ข้อมูลเชื่อถือได้)
const AUFBAU = [
  [1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10], [4, 6], [5, 2], [4, 10], [5, 6],
  [6, 2], [4, 14], [5, 10], [6, 6], [7, 2], [5, 14], [6, 10], [7, 6],
];
const SHELL_EXCEPTIONS = {
  24: [2, 8, 13, 1], 29: [2, 8, 18, 1], 41: [2, 8, 18, 12, 1], 42: [2, 8, 18, 13, 1],
  44: [2, 8, 18, 15, 1], 45: [2, 8, 18, 16, 1], 46: [2, 8, 18, 18], 47: [2, 8, 18, 18, 1],
  78: [2, 8, 18, 32, 17, 1], 79: [2, 8, 18, 32, 18, 1],
};
function shellsOf(z, cat, group) {
  if (SHELL_EXCEPTIONS[z]) return SHELL_EXCEPTIONS[z];
  const mainGroup = group !== null && (group <= 2 || group >= 13);
  const reliable = z <= 56 || (mainGroup && z <= 88) || (cat === 'transition' && z >= 72 && z <= 80);
  if (!reliable) return null;
  const shells = [];
  let left = z;
  for (const [n, cap] of AUFBAU) {
    if (left <= 0) break;
    const e = Math.min(cap, left);
    shells[n - 1] = (shells[n - 1] || 0) + e;
    left -= e;
  }
  return shells.map((v) => v || 0);
}

export const ELEMENTS = [];
export const BY_SYMBOL = {};

for (const line of RAW.trim().split('\n')) {
  const [zs, symbol, nameEn, nameTh, mass, en] = line.split('|');
  const z = Number(zs);
  const category = categoryOf(z);
  const { period, group, row, col } = placeOf(z);
  const valences = valenceOf(symbol, z, group, category);
  const el = {
    z, symbol, nameEn, nameTh,
    mass: Number(mass),
    en: en === '' ? null : Number(en),
    category, period, group, row, col,
    color: '#' + (CPK[z - 1] || 'DD77FF'),
    covalentRadius: COV[z - 1] || 1.6,
    valenceElectrons: valenceElectronsOf(z, group),
    valences,
    maxNeighbors: Math.min(6, MAX_NEIGHBORS[symbol] ?? Math.max(...valences)),
    shells: shellsOf(z, category, group),
    synthetic: z >= 104,
  };
  ELEMENTS.push(el);
  BY_SYMBOL[symbol] = el;
}

export function elementName(el, lang) {
  return lang === 'en' ? el.nameEn : el.nameTh;
}
