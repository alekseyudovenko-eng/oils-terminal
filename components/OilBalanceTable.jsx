"use client"; // Next.js App Router — убрать если используете Pages Router

import { useState } from "react";

// ─────────────────────────────────────────────
// ДАННЫЕ
// ─────────────────────────────────────────────
const C_PROD = "#1D9E75";
const C_IMP  = "#BA7517";
const C_EXP  = "#7F77DD";
const C_CONS = "#3266ad";

const DATASETS = {
  eu: {
    title: "Европейский Союз — EU-27",
    sub: "Все показатели в тыс. тонн готового масла (MY 2023/24)",
    yieldNote: "Выход масла из сырья: рапс ≈42% · подсолнечник ≈44% · соя ≈19% · оливка ≈20% · хлопок ≈16% · лён ≈36%",
    srcBox: [
      { code: "U",  text: "USDA FAS GAIN «EU Oilseeds & Products Annual», май 2023 — агрегат ЕС-27 верифицирован." },
      { code: "B",  text: "USDA FAS GAIN «Bulgaria Oilseeds Market Update» BU2024-0010 — Болгария частично верифицирована." },
      { code: "E",  text: "Eurostat «Agricultural production – crops», окт. 2025 — объём семян по странам (не масло)." },
      { code: "~",  text: "Расчётная оценка — пересчёт из объёма семян с коэффициентами выхода масла." },
    ],
    aggRow: { label: "ЕС-27 итого", src: "U", prod_oil: 19108, imp: 9282, exp: 3409, cons: 24892 },
    rows: [
      { name:"Германия",   crops:"Рапс, соя",             src:"~", prod_oil:2450, imp:2400, exp:1580, cons:3100 },
      { name:"Франция",    crops:"Рапс, подсолн., соя",   src:"~", prod_oil:2150, imp:1100, exp:880,  cons:2200 },
      { name:"Польша",     crops:"Рапс, подсолн.",         src:"~", prod_oil:1620, imp:1200, exp:790,  cons:1800 },
      { name:"Румыния",    crops:"Подсолн., рапс, соя",   src:"~", prod_oil:1720, imp:280,  exp:980,  cons:900  },
      { name:"Венгрия",    crops:"Подсолн., рапс, соя",   src:"~", prod_oil:1280, imp:320,  exp:760,  cons:700  },
      { name:"Болгария",   crops:"Подсолн., рапс",         src:"B", prod_oil:1050, imp:200,  exp:640,  cons:500  },
      { name:"Испания",    crops:"Подсолн., оливка",       src:"~", prod_oil:880,  imp:1600, exp:580,  cons:2000 },
      { name:"Италия",     crops:"Соя, подсолн., оливка",  src:"~", prod_oil:680,  imp:2100, exp:430,  cons:2800 },
      { name:"Чехия",      crops:"Рапс",                   src:"~", prod_oil:610,  imp:430,  exp:240,  cons:650  },
      { name:"Нидерланды", crops:"Реэксп. хаб",            src:"~", prod_oil:80,   imp:4100, exp:3050, cons:1100 },
      { name:"Бельгия",    crops:"Реэксп. хаб",            src:"~", prod_oil:32,   imp:2750, exp:1870, cons:850  },
      { name:"Австрия",    crops:"Рапс, соя, тыква",       src:"~", prod_oil:360,  imp:380,  exp:135,  cons:550  },
      { name:"Словакия",   crops:"Рапс, подсолн., соя",    src:"~", prod_oil:360,  imp:240,  exp:145,  cons:380  },
      { name:"Дания",      crops:"Рапс",                   src:"~", prod_oil:308,  imp:480,  exp:158,  cons:600  },
      { name:"Швеция",     crops:"Рапс",                   src:"~", prod_oil:246,  imp:430,  exp:108,  cons:550  },
      { name:"Литва",      crops:"Рапс, лён",              src:"~", prod_oil:274,  imp:280,  exp:196,  cons:320  },
      { name:"Финляндия",  crops:"Рапс",                   src:"~", prod_oil:130,  imp:350,  exp:52,   cons:400  },
      { name:"Латвия",     crops:"Рапс",                   src:"~", prod_oil:198,  imp:160,  exp:158,  cons:180  },
      { name:"Эстония",    crops:"Рапс",                   src:"~", prod_oil:90,   imp:110,  exp:58,   cons:120  },
      { name:"Греция",     crops:"Хлопок, подсолн., олив.",src:"~", prod_oil:215,  imp:520,  exp:195,  cons:600  },
      { name:"Португалия", crops:"Оливка, подсолн.",        src:"~", prod_oil:126,  imp:430,  exp:126,  cons:500  },
      { name:"Хорватия",   crops:"Подсолн., рапс, соя",    src:"~", prod_oil:180,  imp:190,  exp:78,   cons:280  },
      { name:"Словения",   crops:"Рапс, соя",              src:"~", prod_oil:50,   imp:150,  exp:18,   cons:180  },
      { name:"Ирландия",   crops:"Рапс (мало)",             src:"~", prod_oil:24,   imp:300,  exp:9,    cons:320  },
      { name:"Люксембург", crops:"—",                       src:"~", prod_oil:2,    imp:38,   exp:2,    cons:40   },
      { name:"Мальта",     crops:"—",                       src:"~", prod_oil:1,    imp:24,   exp:1,    cons:25   },
      { name:"Кипр",       crops:"Оливка (немного)",        src:"~", prod_oil:5,    imp:65,   exp:5,    cons:70   },
    ],
    note: "Агрегат ЕС-27 верифицирован по USDA FAS GAIN (U). Страновая разбивка — расчётные оценки (~) на основе Eurostat (объём семян) + коэффициенты выхода масла.",
  },

  baltic: {
    title: "Балтийский регион",
    sub: "Все показатели в тыс. тонн готового масла (MY 2023/24)",
    yieldNote: "Выход масла: рапс ≈42% · лён ≈36%",
    srcBox: [
      { code: "E", text: "Eurostat «Agricultural production – crops», окт. 2025 — объём семян рапса по странам." },
      { code: "~", text: "Расчётная оценка — пересчёт из семян, торговля по структуре ЕС." },
    ],
    aggRow: null,
    rows: [
      { name:"Польша*",   crops:"Рапс, подсолн.",   src:"~", prod_oil:1620, imp:1200, exp:790,  cons:1800 },
      { name:"Дания",     crops:"Рапс",              src:"~", prod_oil:308,  imp:480,  exp:158,  cons:600  },
      { name:"Швеция",    crops:"Рапс",              src:"~", prod_oil:246,  imp:430,  exp:108,  cons:550  },
      { name:"Литва",     crops:"Рапс, лён",         src:"~", prod_oil:274,  imp:280,  exp:196,  cons:320  },
      { name:"Финляндия", crops:"Рапс",              src:"~", prod_oil:130,  imp:350,  exp:52,   cons:400  },
      { name:"Латвия",    crops:"Рапс",              src:"~", prod_oil:198,  imp:160,  exp:158,  cons:180  },
      { name:"Норвегия",  crops:"Рапс (немного)",    src:"~", prod_oil:37,   imp:310,  exp:28,   cons:350  },
      { name:"Эстония",   crops:"Рапс",              src:"~", prod_oil:90,   imp:110,  exp:58,   cons:120  },
    ],
    note: "* Польша включена для регионального контекста. Все цифры — расчётные оценки (~).",
  },

  eeu: {
    title: "Восточная Европа",
    sub: "Все показатели в тыс. тонн готового масла (MY 2023/24)",
    yieldNote: "Выход масла: рапс ≈42% · подсолнечник ≈44% · соя ≈19% · лён ≈36%",
    srcBox: [
      { code: "B", text: "USDA FAS GAIN «Bulgaria Oilseeds» BU2024-0010 — урожай подсолнечника 1,8 млн т, статус топ-экспортёра подтверждён." },
      { code: "E", text: "Eurostat — объёмы семян по Польше и Чехии." },
      { code: "~", text: "Расчётная оценка для торговых потоков." },
    ],
    aggRow: null,
    rows: [
      { name:"Польша",   crops:"Рапс, подсолн., лён",  src:"~", prod_oil:1620, imp:1200, exp:790, cons:1800 },
      { name:"Болгария", crops:"Подсолн., рапс",        src:"B", prod_oil:1050, imp:200,  exp:640, cons:500  },
      { name:"Сербия",   crops:"Подсолн., соя, рапс",   src:"~", prod_oil:580,  imp:180,  exp:295, cons:420  },
      { name:"Чехия",    crops:"Рапс",                  src:"~", prod_oil:610,  imp:430,  exp:240, cons:650  },
    ],
    note: "Сербия — не член ЕС. Болгария верифицирована как крупнейший экспортёр подсолнечного масла в ЕС (источник B).",
  },

  ca: {
    title: "Центральная Азия",
    sub: "Все показатели в тыс. тонн готового масла (2024)",
    yieldNote: "Выход масла: подсолнечник ≈44% · рапс ≈42% · лён ≈36% · хлопок ≈16% · кунжут ≈50%",
    srcBox: [
      { code: "K",  text: "Министерство сельского хозяйства РК, март 2025 — Казахстан 2024: производство 753 тыс. т, экспорт 582 тыс. т." },
      { code: "UZ", text: "APK-Inform, сент. 2025 — Узбекистан: потребление подсолн. ≈280 тыс. т + хлопк. ≈185 тыс. т." },
      { code: "~",  text: "Расчётная оценка для Кыргызстана и торговых потоков Узбекистана." },
    ],
    aggRow: null,
    rows: [
      { name:"Казахстан",  crops:"Подсолн., рапс, лён, хлопок", src:"K",  prod_oil:753, imp:120, exp:582, cons:850  },
      { name:"Узбекистан", crops:"Хлопок, подсолн., кунжут",    src:"UZ", prod_oil:380, imp:580, exp:35,  cons:1050 },
      { name:"Кыргызстан", crops:"Подсолн., лён, кунжут",        src:"~",  prod_oil:32,  imp:130, exp:5,   cons:160  },
    ],
    note: "Казахстан: производство и экспорт масла верифицированы (K). Узбекистан: потребление частично верифицировано (UZ). Кыргызстан — полностью расчётная оценка.",
  },

  cau: {
    title: "Кавказ",
    sub: "Все показатели в тыс. тонн готового масла (2023–2024)",
    yieldNote: "Выход масла: подсолнечник ≈44% · хлопок ≈16%",
    srcBox: [
      { code: "AZ", text: "Госстаткомитет Азербайджана, февр. 2025 — импорт пальмового масла 64,6 тыс. т; произв. подсолн. масла ~38–46 тыс. т." },
      { code: "~",  text: "Расчётная оценка — суммарный импорт Азербайджана, все данные по Грузии." },
    ],
    aggRow: null,
    rows: [
      { name:"Азербайджан", crops:"Подсолн., хлопок",    src:"AZ", prod_oil:44, imp:265, exp:12, cons:310 },
      { name:"Грузия",      crops:"Подсолн. (немного)",  src:"~",  prod_oil:12, imp:172, exp:8,  cons:195 },
    ],
    note: "Азербайджан: импорт пальмового масла и производство подсолн. масла верифицированы (AZ). Все данные по Грузии — расчётные оценки.",
  },
};

const TABS = [
  { key: "eu",     label: "ЕС-27" },
  { key: "baltic", label: "Балтийский регион" },
  { key: "eeu",    label: "Восточная Европа" },
  { key: "ca",     label: "Центральная Азия" },
  { key: "cau",    label: "Кавказ" },
];

// ─────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ─────────────────────────────────────────────

function SrcBadge({ src }) {
  if (src === "~") {
    return (
      <span style={{
        display: "inline-block", fontSize: 10, padding: "1px 5px",
        borderRadius: 4, marginLeft: 4, verticalAlign: "middle",
        background: "#FAEEDA", color: "#854F0B", fontWeight: 600,
      }}>~ оценка</span>
    );
  }
  return (
    <span style={{
      display: "inline-block", fontSize: 10, padding: "1px 5px",
      borderRadius: 4, marginLeft: 4, verticalAlign: "middle",
      background: "#EAF3DE", color: "#3B6D11", fontWeight: 600,
    }}>{src}</span>
  );
}

function MiniBar({ value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ background: "#f0f0f0", borderRadius: 3, height: 5, overflow: "hidden", marginBottom: 2 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
    </div>
  );
}

function BalanceCell({ value }) {
  const formatted = (value >= 0 ? "+" : "") + Math.round(value).toLocaleString("ru");
  return (
    <td style={{
      textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12,
      fontWeight: 600, color: value >= 0 ? "#0F6E56" : "#993C1D", padding: "6px 5px",
    }}>{formatted}</td>
  );
}

// ─────────────────────────────────────────────
// ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────

export default function OilBalanceTable() {
  const [activeTab, setActiveTab] = useState("eu");
  const d = DATASETS[activeTab];

  const allRows = d.aggRow ? [d.aggRow, ...d.rows] : d.rows;
  const allMax = Math.max(...allRows.flatMap(r => [r.prod_oil, r.imp, r.exp, r.cons]));

  const tdStyle = (color) => ({
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontSize: 12,
    color,
    padding: "6px 5px",
  });

  const thStyle = (color) => ({
    textAlign: "right",
    fontSize: 10.5,
    fontWeight: 500,
    color: color || "#888",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "0 5px 8px",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #e5e7eb",
  });

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", maxWidth: 900, margin: "0 auto", padding: "1rem" }}>

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              fontSize: 13, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
              border: "1px solid",
              borderColor: activeTab === t.key ? "#111" : "#d1d5db",
              background: activeTab === t.key ? "#111" : "#f9fafb",
              color: activeTab === t.key ? "#fff" : "#555",
              fontWeight: activeTab === t.key ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 3px", color: "#111" }}>{d.title}</p>
      <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>{d.sub}</p>

      {/* Source box */}
      <div style={{ fontSize: 11, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", marginBottom: 10, lineHeight: 1.8 }}>
        {d.srcBox.map((s, i) => (
          <div key={i}>
            <SrcBadge src={s.code} /> {s.text}
          </div>
        ))}
      </div>

      {/* Yield note */}
      <div style={{ fontSize: 11, background: "#f3f4f6", borderRadius: 6, padding: "6px 10px", marginBottom: 10, color: "#666" }}>
        ℹ️ {d.yieldNote}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 10, fontSize: 12, color: "#666", alignItems: "center" }}>
        {[
          [C_PROD, "Произв. масла"],
          [C_IMP,  "Импорт"],
          [C_EXP,  "Экспорт"],
          [C_CONS, "Потребл."],
        ].map(([color, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <SrcBadge src="X" /> верифицировано
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <SrcBadge src="~" /> расчётная оценка
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle(), textAlign: "left", width: 20 }}></th>
              <th style={{ ...thStyle(), textAlign: "left" }}>Страна</th>
              <th style={{ ...thStyle(), textAlign: "left", color: "#aaa", fontSize: 10 }}>Осн. культуры</th>
              <th style={thStyle(C_PROD)}>Произв.</th>
              <th style={thStyle(C_IMP)}>Импорт</th>
              <th style={thStyle(C_EXP)}>Экспорт</th>
              <th style={thStyle(C_CONS)}>Потребл.</th>
              <th style={thStyle()}>Баланс</th>
              <th style={{ ...thStyle(), width: 64 }}></th>
            </tr>
            <tr>
              <td colSpan={3} />
              <td colSpan={4} style={{ fontSize: 9.5, color: "#bbb", textAlign: "center", paddingBottom: 6, borderLeft: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0" }}>
                тыс. тонн масла
              </td>
              <td colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {/* Aggregate row */}
            {d.aggRow && (() => {
              const r = d.aggRow;
              const bal = r.prod_oil + r.imp - r.exp - r.cons;
              return (
                <tr key="agg" style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ textAlign: "right", color: "#bbb", fontSize: 11, padding: "6px 5px" }}>—</td>
                  <td style={{ textAlign: "left", fontWeight: 700, padding: "6px 5px" }}>
                    {r.label} <SrcBadge src={r.src} />
                  </td>
                  <td />
                  <td style={tdStyle(C_PROD)}>{r.prod_oil.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_IMP)}>{r.imp.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_EXP)}>{r.exp.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_CONS)}>{r.cons.toLocaleString("ru")}</td>
                  <BalanceCell value={bal} />
                  <td />
                </tr>
              );
            })()}

            {/* Country rows */}
            {d.rows.map((r, i) => {
              const bal = r.prod_oil + r.imp - r.exp - r.cons;
              return (
                <tr key={r.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ textAlign: "right", color: "#ccc", fontSize: 11, padding: "6px 5px" }}>{i + 1}</td>
                  <td style={{ textAlign: "left", fontWeight: 500, padding: "6px 5px", whiteSpace: "nowrap" }}>
                    {r.name} <SrcBadge src={r.src} />
                  </td>
                  <td style={{ textAlign: "left", color: "#aaa", fontSize: 11, padding: "6px 5px" }}>{r.crops}</td>
                  <td style={tdStyle(C_PROD)}>{r.prod_oil.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_IMP)}>{r.imp.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_EXP)}>{r.exp.toLocaleString("ru")}</td>
                  <td style={tdStyle(C_CONS)}>{r.cons.toLocaleString("ru")}</td>
                  <BalanceCell value={bal} />
                  <td style={{ padding: "6px 5px", width: 64 }}>
                    <MiniBar value={r.prod_oil} max={allMax} color={C_PROD} />
                    <MiniBar value={r.imp}      max={allMax} color={C_IMP}  />
                    <MiniBar value={r.exp}      max={allMax} color={C_EXP}  />
                    <MiniBar value={r.cons}     max={allMax} color={C_CONS} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 11, color: "#aaa", marginTop: 12, lineHeight: 1.6 }}>{d.note}</p>
    </div>
  );
}
