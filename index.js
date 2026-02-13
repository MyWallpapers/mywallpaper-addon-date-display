import { jsxs as G, jsx as C } from "react/jsx-runtime";
import { useSettings as R, useNetwork as j, useSettingsActions as P } from "@mywallpaper/sdk-react";
import { useState as $, useRef as D, useEffect as E, useCallback as _, useMemo as N } from "react";
const v = {
  en: {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  },
  fr: {
    days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
  },
  de: {
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
  },
  es: {
    days: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    months: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  },
  it: {
    days: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
    months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
  },
  pt: {
    days: ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
  },
  ja: {
    days: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
    months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  },
  zh: {
    days: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
    months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
  },
  ko: {
    days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
    months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
  },
  ru: {
    days: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
  },
  ar: {
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
  }
}, H = {
  100: "Thin (100)",
  200: "Extra-Light (200)",
  300: "Light (300)",
  400: "Regular (400)",
  500: "Medium (500)",
  600: "Semi-Bold (600)",
  700: "Bold (700)",
  800: "Extra-Bold (800)",
  900: "Black (900)"
}, V = {
  normal: "Normal",
  italic: "Italic",
  oblique: "Oblique"
};
function p(t) {
  return t < 10 ? "0" + t : t.toString();
}
function Y(t) {
  if (t.languageMode === "custom") {
    const o = (t.customDays || "").split(",").map((e) => e.trim()), r = (t.customMonths || "").split(",").map((e) => e.trim());
    return {
      days: o.length >= 7 ? o : v.en.days,
      months: r.length >= 12 ? r : v.en.months
    };
  }
  return v[t.language] || v.en;
}
function q(t, o, r) {
  const e = t.getDate(), c = t.getMonth(), a = t.getFullYear(), n = r.months[c], l = n.substring(0, 3);
  switch (o.dateFormat || "long") {
    case "long":
      return n + " " + e + ", " + a;
    case "short":
      return l + " " + e + ", " + a;
    case "numeric":
      return p(e) + "/" + p(c + 1) + "/" + a;
    case "numeric-us":
      return p(c + 1) + "/" + p(e) + "/" + a;
    case "iso":
      return a + "-" + p(c + 1) + "-" + p(e);
    case "day-month":
      return e + " " + n;
    case "month-day":
      return n + " " + e;
    default:
      return n + " " + e + ", " + a;
  }
}
function Q(t) {
  const o = {
    families: [],
    weights: {},
    styles: {}
  }, r = {};
  let e = t.match(/@font-face\s*\{[^}]+\}/gi) || [];
  e.length === 0 && (e = t.match(/@font-face\s*\{[\s\S]*?\}/gi) || []);
  const c = {
    thin: "100",
    hairline: "100",
    extralight: "200",
    "extra-light": "200",
    ultralight: "200",
    light: "300",
    normal: "400",
    regular: "400",
    medium: "500",
    semibold: "600",
    "semi-bold": "600",
    demibold: "600",
    bold: "700",
    extrabold: "800",
    "extra-bold": "800",
    ultrabold: "800",
    black: "900",
    heavy: "900"
  }, a = /* @__PURE__ */ new Set([
    "inherit",
    "initial",
    "unset",
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui"
  ]);
  for (const n of e) {
    const l = n.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i);
    if (!l) continue;
    const s = l[2].trim().replace(/^['"]|['"]$/g, "").trim();
    if (!s || a.has(s.toLowerCase())) continue;
    let f = "400";
    const b = n.match(/font-weight\s*:\s*([^;}\s]+)/i);
    if (b) {
      const M = b[1].trim().toLowerCase();
      f = c[M] || M;
    }
    let S = "normal";
    const F = n.match(/font-style\s*:\s*([^;}\s]+)/i);
    F && (S = F[1].trim().toLowerCase()), r[s] || (r[s] = !0, o.families.push(s), o.weights[s] = [], o.styles[s] = []), o.weights[s].includes(f) || o.weights[s].push(f), o.styles[s].includes(S) || o.styles[s].push(S);
  }
  for (const n of Object.keys(o.weights))
    o.weights[n].sort((l, s) => parseInt(l) - parseInt(s));
  return o;
}
function et() {
  const t = R(), { fetch: o } = j(), { updateOptions: r } = P(), [e, c] = $(() => /* @__PURE__ */ new Date()), a = D(null), n = D(null), l = D(null), s = D(null);
  E(() => {
    const i = setInterval(() => c(/* @__PURE__ */ new Date()), 6e4);
    return () => clearInterval(i);
  }, []);
  const f = _(
    async (i) => {
      if (!i || a.current === i || !i.startsWith("http://") && !i.startsWith("https://")) return;
      let u = i;
      try {
        if (new URL(i).hostname === "fonts.google.com") {
          const x = i.match(/family=([^&]+)/);
          if (x)
            u = "https://fonts.googleapis.com/css2?family=" + x[1] + "&display=swap";
          else
            return;
        }
      } catch {
        return;
      }
      try {
        const m = await o(u);
        if (!m.ok || !m.data) return;
        a.current = u;
        const x = m.data;
        n.current && n.current.remove();
        const A = document.createElement("style");
        A.textContent = x, document.head.appendChild(A), n.current = A;
        const d = Q(x);
        if (s.current = d, d.families.length > 0) {
          const w = d.families[0];
          l.current = w;
          const U = d.families.map((g) => ({ label: g, value: g }));
          r("customFontFamily", U, w);
          const h = d.weights[w] || [];
          if (h.length > 0) {
            const g = h.map((O) => ({
              label: H[O] || "Weight " + O,
              value: O
            })), y = h.includes("400") ? "400" : h.includes("500") ? "500" : h.includes("600") ? "600" : h[0];
            r("customFontWeight", g, y);
          }
          const J = d.styles[w] || [];
          if (J.length <= 1)
            r("customFontStyle", [{ label: "Normal", value: "normal" }], "normal");
          else {
            const g = J.map((y) => ({
              label: V[y] || y.charAt(0).toUpperCase() + y.slice(1),
              value: y
            }));
            r("customFontStyle", g, "normal");
          }
        }
      } catch {
      }
    },
    [o, r]
  );
  E(() => {
    t.fontMode === "custom" && t.customFontUrl ? f(t.customFontUrl) : (l.current = null, s.current = null, a.current = null);
  }, [t.fontMode, t.customFontUrl, f]), E(() => {
    if (t.fontMode !== "preset") return;
    const u = "https://fonts.googleapis.com/css2?family=" + (t.fontPreset || "Inter").replace(/ /g, "+") + ":wght@300;400;500;600;700;800&display=swap";
    if (a.current === u) return;
    a.current = u, n.current && n.current.remove();
    const m = document.createElement("style");
    m.textContent = '@import url("' + u + '");', document.head.appendChild(m), n.current = m;
  }, [t.fontMode, t.fontPreset]);
  const b = N(() => Y(t), [
    t.languageMode,
    t.language,
    t.customDays,
    t.customMonths
  ]), S = b.days[e.getDay()], F = q(e, t, b), M = N(() => t.fontMode === "custom" ? '"' + (l.current || t.customFontFamily || "sans-serif") + '", sans-serif' : '"' + (t.fontPreset || "Inter") + '", sans-serif', [t.fontMode, t.fontPreset, t.customFontFamily]), I = t.fontMode === "custom" ? t.customFontWeight || t.fontWeight || "600" : t.fontWeight || "600", W = t.fontMode === "custom" && t.customFontStyle || "normal", k = t.enableShadow ? `${t.shadowOffsetX ?? 2}px ${t.shadowOffsetY ?? 2}px ${t.shadowBlur ?? 10}px ${t.shadowColor || "#000000"}` : "none", T = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: t.textAlign === "center" ? "center" : t.textAlign === "right" ? "flex-end" : "flex-start",
    padding: 20,
    boxSizing: "border-box",
    overflow: "hidden",
    fontFamily: M,
    textAlign: t.textAlign || "left"
  }, L = {
    fontFamily: M,
    fontWeight: I,
    fontStyle: W,
    color: t.textColor || "#ffffff",
    opacity: (t.textOpacity ?? 100) / 100,
    letterSpacing: (t.letterSpacing ?? 0) + "px",
    textShadow: k,
    textTransform: t.textTransform || "none"
  }, z = {
    ...L,
    fontSize: (t.dayFontSize || 24) + "px",
    marginBottom: 5
  }, B = {
    ...L,
    fontSize: (t.dateFontSize || 48) + "px",
    lineHeight: 1.1
  };
  return /* @__PURE__ */ G("div", { style: T, children: [
    t.showDayOfWeek && /* @__PURE__ */ C("div", { style: z, children: S }),
    t.showDate && /* @__PURE__ */ C("div", { style: B, children: F })
  ] });
}
export {
  et as default
};
