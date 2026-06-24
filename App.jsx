import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const GOLD = "#0090D0";
const GOLD_LIGHT = "#4AB8F0";
const NAVY = "#0D1B35";
const NAVY_MID = "#14285F";
const NAVY_LIGHT = "#1A3A7A";
const WHITE = "#FFFFFF";
const SLATE = "#7A9AC0";
const PURPLE = "#6A287A";
const SUCCESS = "#2ECC71";
const WARN = "#F39C12";

function fmt(n) {
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtFull(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function calcEMI(P, rAnnual, nYears) {
  const r = rAnnual / 12 / 100;
  const n = nYears * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcSIPFV(monthlyAmt, annualReturn, months) {
  const i = annualReturn / 12 / 100;
  if (i === 0) return monthlyAmt * months;
  return monthlyAmt * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

function calcLoanSchedule(P, rAnnual, nYears) {
  const r = rAnnual / 12 / 100;
  const n = nYears * 12;
  const emi = calcEMI(P, rAnnual, nYears);
  let bal = P;
  let totalInterest = 0;
  const yearly = [];
  for (let yr = 1; yr <= nYears; yr++) {
    let yInt = 0, yPrin = 0;
    for (let m = 0; m < 12; m++) {
      const intPart = bal * r;
      const prinPart = emi - intPart;
      yInt += intPart;
      yPrin += prinPart;
      bal = Math.max(0, bal - prinPart);
      totalInterest += intPart;
    }
    yearly.push({ year: yr, outstanding: Math.max(0, bal), interest: yInt, principal: yPrin });
  }
  return { emi, totalInterest, schedule: yearly };
}

const Slider = ({ label, value, min, max, step, onChange, format, sublabel }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 13, color: SLATE }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: GOLD }}>{format ? format(value) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }} />
    {sublabel && <div style={{ fontSize: 11, color: "#5A7A9A", marginTop: 3 }}>{sublabel}</div>}
  </div>
);

const MetricCard = ({ label, value, sub, accent, large }) => (
  <div style={{
    background: NAVY_MID, border: `1px solid ${accent ? GOLD : "#1E3A5F"}`,
    borderRadius: 10, padding: "14px 16px",
    boxShadow: accent ? `0 0 18px ${GOLD}33` : "none"
  }}>
    <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: large ? 22 : 18, fontWeight: 700, color: accent ? GOLD : WHITE }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#5A7A9A", marginTop: 4 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
    {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: GOLD, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</h2>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${GOLD}44, transparent)` }} />
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: NAVY, border: `1px solid ${GOLD}44`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: SLATE, fontSize: 12, marginBottom: 6 }}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [loanAmt, setLoanAmt] = useState(5000000);
  const [tenure, setTenure] = useState(20);
  const [currentRate, setCurrentRate] = useState(9.0);
  const [newRate, setNewRate] = useState(8.0);
  const [sipReturn, setSipReturn] = useState(12);
  const [sipFreq, setSipFreq] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");

  const calc = useMemo(() => {
    const orig = calcLoanSchedule(loanAmt, currentRate, tenure);
    const revised = calcLoanSchedule(loanAmt, newRate, tenure);
    const monthlyEmiSaving = orig.emi - revised.emi;
    const totalInterestSaved = orig.totalInterest - revised.totalInterest;
    const months = tenure * 12;
    const sipFV = calcSIPFV(monthlyEmiSaving, sipReturn, months);
    const totalInvested = monthlyEmiSaving * months;
    const wealthGain = sipFV - totalInvested;

    const chartData = orig.schedule.map((row, i) => {
      const yr = row.year;
      const sipCorpus = calcSIPFV(monthlyEmiSaving, sipReturn, yr * 12);
      return {
        year: yr,
        origOutstanding: Math.round(row.outstanding),
        newOutstanding: Math.round(revised.schedule[i].outstanding),
        origInterest: Math.round(row.interest),
        newInterest: Math.round(revised.schedule[i].interest),
        sipCorpus: Math.round(sipCorpus),
        totalInvested: Math.round(monthlyEmiSaving * yr * 12),
      };
    });

    const sensitivityRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const sensitivityReturns = [8, 10, 12, 15, 18];
    const sensitivityData = sensitivityRates.map(drop => {
      const nr = currentRate - drop;
      if (nr <= 0) return null;
      const origSch = calcLoanSchedule(loanAmt, currentRate, tenure);
      const newSch = calcLoanSchedule(loanAmt, nr, tenure);
      const saving = origSch.emi - newSch.emi;
      return {
        drop,
        cols: sensitivityReturns.map(ret => {
          const fv = calcSIPFV(saving, ret, months);
          return { fv: Math.round(fv), gain: Math.round(fv - saving * months) };
        })
      };
    }).filter(Boolean);

    // Monte Carlo
    const simulations = 500;
    const mcResults = [];
    for (let s = 0; s < simulations; s++) {
      let corpus = 0;
      for (let m = 0; m < months; m++) {
        const monthlyRet = (sipReturn / 100 / 12) + (Math.random() - 0.5) * 0.012;
        corpus = (corpus + monthlyEmiSaving) * (1 + monthlyRet);
      }
      mcResults.push(corpus);
    }
    mcResults.sort((a, b) => a - b);
    const p10 = mcResults[Math.floor(simulations * 0.1)];
    const p50 = mcResults[Math.floor(simulations * 0.5)];
    const p90 = mcResults[Math.floor(simulations * 0.9)];
    const probCrore = mcResults.filter(v => v >= 1e7).length / simulations * 100;

    return {
      origEMI: orig.emi,
      newEMI: revised.emi,
      monthlyEmiSaving,
      totalInterestSaved,
      sipFV,
      totalInvested,
      wealthGain,
      chartData,
      sensitivityData,
      sensitivityReturns,
      mc: { worst: p10, base: p50, best: p90, probCrore },
    };
  }, [loanAmt, tenure, currentRate, newRate, sipReturn, sipFreq]);

  const tabStyle = (t) => ({
    padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600,
    border: "none", transition: "all 0.2s",
    background: activeTab === t ? GOLD : "transparent",
    color: activeTab === t ? NAVY : SLATE,
  });

  return (
    <div style={{ background: NAVY, minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: WHITE }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 100%)`, borderBottom: `1px solid ${GOLD}33`, padding: "16px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="19" height="19" rx="3" fill="#7B2D8B"/>
              <path d="M20 1 C10 1 1 10 1 20 L20 20 Z" fill="#0090D0"/>
              <rect x="5" y="5" width="9" height="9" rx="1.5" fill="white"/>
              <rect x="24" y="1" width="19" height="19" rx="3" fill="#0090D0"/>
              <path d="M24 1 C34 1 43 10 43 20 L24 20 Z" fill="#7B2D8B"/>
              <rect x="30" y="5" width="9" height="9" rx="1.5" fill="white"/>
              <rect x="1" y="24" width="19" height="19" rx="3" fill="#14285F"/>
              <path d="M1 24 C1 34 10 43 20 43 L20 24 Z" fill="#0090D0"/>
              <rect x="5" y="30" width="9" height="9" rx="1.5" fill="white"/>
              <rect x="24" y="24" width="19" height="19" rx="3" fill="#7B2D8B"/>
              <path d="M43 24 C43 34 34 43 24 43 L24 24 Z" fill="#C0306A"/>
              <rect x="30" y="30" width="9" height="9" rx="1.5" fill="white"/>
            </svg>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, letterSpacing: 0.5 }}>Raaj Wealth Sol</div>
              <div style={{ fontSize: 11, color: "#A060C0", letterSpacing: 1.5, textTransform: "uppercase" }}>Making Financial Decisions Smarter Through Data</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: SLATE }}>Interactive Financial Dashboard</div>
            <div style={{ fontSize: 11, color: "#3A5F80" }}>For Advisor & Client Use</div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY_MID} 0%, ${NAVY} 60%)`, padding: "40px 28px 32px", borderBottom: `1px solid ${GOLD}22`, textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Wealth Creation Framework</div>
          <h1 style={{ margin: "0 0 16px", fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
            The <span style={{ color: GOLD }}>1% Rule</span> — How a Lower Home Loan Rate Can Create Crores
          </h1>
          <p style={{ fontSize: 15, color: SLATE, lineHeight: 1.7, maxWidth: 620, margin: "0 auto 24px" }}>
            A small reduction in borrowing cost can become a massive wealth creation opportunity through disciplined investing. Redirect your EMI savings into SIPs and let compounding work for you.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "EMI Saved/Month", value: fmt(calc.monthlyEmiSaving) },
              { label: "Interest Saved", value: fmt(calc.totalInterestSaved) },
              { label: "SIP Corpus", value: fmt(calc.sipFV) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: "10px 24px", minWidth: 140 }}>
                <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px" }}>

        {/* TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, background: NAVY_MID, padding: 6, borderRadius: 25, width: "fit-content" }}>
          {[["overview", "Overview"], ["charts", "Charts"], ["sensitivity", "Sensitivity Analysis"], ["montecarlo", "Monte Carlo"]].map(([t, l]) => (
            <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{l}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>

          {/* INPUT PANEL */}
          <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 22, position: "sticky", top: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🏠 Home Loan Details</div>
              <div style={{ height: 1, background: `${GOLD}33`, marginBottom: 16 }} />
              <Slider label="Loan Amount" value={loanAmt} min={500000} max={20000000} step={100000}
                onChange={setLoanAmt} format={v => fmt(v)} />
              <Slider label="Loan Tenure" value={tenure} min={5} max={30} step={1}
                onChange={setTenure} format={v => `${v} yrs`} />
              <Slider label="Current Interest Rate" value={currentRate} min={6} max={15} step={0.1}
                onChange={setCurrentRate} format={v => `${v.toFixed(1)}%`} />
              <Slider label="New Interest Rate" value={newRate} min={5} max={currentRate - 0.1} step={0.1}
                onChange={v => setNewRate(Math.min(v, currentRate - 0.1))} format={v => `${v.toFixed(1)}%`} />
              <div style={{ background: `${GOLD}11`, border: `1px solid ${GOLD}33`, borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>
                <span style={{ fontSize: 12, color: GOLD }}>Rate reduction: {(currentRate - newRate).toFixed(2)}%</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>📈 SIP Assumptions</div>
              <div style={{ height: 1, background: `${GOLD}33`, marginBottom: 16 }} />
              <Slider label="Expected Annual SIP Return" value={sipReturn} min={6} max={20} step={0.5}
                onChange={setSipReturn} format={v => `${v.toFixed(1)}%`} sublabel="Historical Nifty 50 CAGR ~12–14%" />
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: SLATE, marginBottom: 8 }}>SIP Frequency</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["monthly", "quarterly", "yearly"].map(f => (
                    <button key={f} onClick={() => setSipFreq(f)} style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8, border: `1px solid ${sipFreq === f ? GOLD : "#1E3A5F"}`,
                      background: sipFreq === f ? `${GOLD}22` : "transparent",
                      color: sipFreq === f ? GOLD : SLATE, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize"
                    }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>⚙️ Savings Strategy</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["emi", "Reduce EMI"], ["tenure", "Reduce Tenure"]].map(([v, l]) => (
                  <button key={v} onClick={() => setMode(v)} style={{
                    flex: 1, padding: "9px 4px", borderRadius: 8, border: `1px solid ${mode === v ? GOLD : "#1E3A5F"}`,
                    background: mode === v ? `${GOLD}22` : "transparent",
                    color: mode === v ? GOLD : SLATE, fontSize: 12, fontWeight: 600, cursor: "pointer"
                  }}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, background: `${NAVY}88`, borderRadius: 10, padding: 14, border: `1px solid ${GOLD}22` }}>
              <div style={{ fontSize: 11, color: SLATE, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Formula Reference</div>
              <div style={{ fontSize: 11, color: "#4A6A8A", lineHeight: 1.8 }}>
                <div style={{ color: GOLD, fontWeight: 600, marginBottom: 4 }}>EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ - 1)</div>
                <div>P = Principal • r = Monthly rate • n = Months</div>
                <div style={{ color: GOLD, fontWeight: 600, marginTop: 8, marginBottom: 4 }}>SIP FV = SIP × ((1+i)ⁿ - 1) / i × (1+i)</div>
                <div>i = Monthly return • n = Total months</div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div>

            {activeTab === "overview" && (
              <>
                {/* KEY METRICS */}
                <div style={{ marginBottom: 24 }}>
                  <SectionTitle icon="📊">Key Metrics</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    <MetricCard label="Original EMI" value={fmt(calc.origEMI)} sub={`@ ${currentRate}%`} />
                    <MetricCard label="New EMI" value={fmt(calc.newEMI)} sub={`@ ${newRate}%`} />
                    <MetricCard label="Monthly Savings" value={fmt(calc.monthlyEmiSaving)} sub="Redirected to SIP" accent />
                    <MetricCard label="Total Interest Saved" value={fmt(calc.totalInterestSaved)} sub="Over loan tenure" />
                    <MetricCard label="Total SIP Investment" value={fmt(calc.totalInvested)} sub={`Over ${tenure} years`} />
                    <MetricCard label="Future SIP Value" value={fmt(calc.sipFV)} sub={`@ ${sipReturn}% return`} accent large />
                    <MetricCard label="Wealth from Compounding" value={fmt(calc.wealthGain)} sub="Above invested amount" accent />
                  </div>
                </div>

                {/* ADVISOR EXPLAINER */}
                <div style={{ background: `linear-gradient(135deg, ${NAVY_MID}, ${NAVY})`, border: `1px solid ${GOLD}44`, borderRadius: 14, padding: 22, marginBottom: 24 }}>
                  <SectionTitle icon="💡">Financial Advisor Insight</SectionTitle>
                  <p style={{ color: SLATE, lineHeight: 1.8, fontSize: 14, margin: 0 }}>
                    "Instead of treating a lower interest rate as mere savings, redirecting the cash flow of{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(calc.monthlyEmiSaving)}/month</span> into SIP investments allows compounding to work for{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{tenure} years</span>. A{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{(currentRate - newRate).toFixed(2)}% rate reduction</span> not only saves{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(calc.totalInterestSaved)}</span> in interest but potentially creates a SIP corpus of{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(calc.sipFV)}</span> — where compounding alone contributes{" "}
                    <span style={{ color: SUCCESS, fontWeight: 700 }}>{fmt(calc.wealthGain)}</span> above your total investment.
                    The combination of debt optimization and disciplined investing is the most powerful wealth-creation strategy available to homebuyers."
                  </p>
                </div>

                {/* QUICK LOAN COMPARISON */}
                <div style={{ background: NAVY_MID, border: `1px solid #1E3A5F`, borderRadius: 14, padding: 22 }}>
                  <SectionTitle icon="⚖️">Loan Comparison</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[
                      { title: "Current Loan", rate: currentRate, color: "#E74C3C" },
                      { title: "Revised Loan", rate: newRate, color: SUCCESS },
                    ].map(({ title, rate, color }) => {
                      const s = calcLoanSchedule(loanAmt, rate, tenure);
                      return (
                        <div key={title} style={{ background: NAVY, borderRadius: 10, padding: 16, border: `1px solid ${color}44` }}>
                          <div style={{ fontSize: 13, color, fontWeight: 700, marginBottom: 12 }}>{title} @ {rate}%</div>
                          {[
                            ["Monthly EMI", fmt(s.emi)],
                            ["Total Principal", fmt(loanAmt)],
                            ["Total Interest", fmt(s.totalInterest)],
                            ["Total Outflow", fmt(loanAmt + s.totalInterest)],
                          ].map(([l, v]) => (
                            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1E3A5F", fontSize: 13 }}>
                              <span style={{ color: SLATE }}>{l}</span>
                              <span style={{ color: WHITE, fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === "charts" && (
              <>
                <SectionTitle icon="📉">Loan Outstanding Comparison</SectionTitle>
                <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 18, marginBottom: 24 }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={calc.chartData}>
                      <defs>
                        <linearGradient id="gOrig" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={SUCCESS} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={SUCCESS} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                      <XAxis dataKey="year" stroke={SLATE} tick={{ fontSize: 11 }} label={{ value: "Year", position: "insideBottom", fill: SLATE, fontSize: 11, offset: -2 }} />
                      <YAxis stroke={SLATE} tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Area type="monotone" dataKey="origOutstanding" name="Current Rate" stroke="#E74C3C" fill="url(#gOrig)" strokeWidth={2} />
                      <Area type="monotone" dataKey="newOutstanding" name="New Rate" stroke={SUCCESS} fill="url(#gNew)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <SectionTitle icon="💸">Annual Interest Paid Comparison</SectionTitle>
                <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 18, marginBottom: 24 }}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={calc.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                      <XAxis dataKey="year" stroke={SLATE} tick={{ fontSize: 11 }} />
                      <YAxis stroke={SLATE} tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="origInterest" name="Interest @ Current Rate" fill="#E74C3C" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="newInterest" name="Interest @ New Rate" fill={SUCCESS} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <SectionTitle icon="🚀">SIP Corpus Growth — Compounding Effect</SectionTitle>
                <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 18, marginBottom: 24 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={calc.chartData}>
                      <defs>
                        <linearGradient id="gSIP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={SLATE} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={SLATE} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                      <XAxis dataKey="year" stroke={SLATE} tick={{ fontSize: 11 }} />
                      <YAxis stroke={SLATE} tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="totalInvested" name="Amount Invested" stroke={SLATE} fill="url(#gInv)" strokeWidth={1.5} strokeDasharray="4 2" />
                      <Area type="monotone" dataKey="sipCorpus" name="SIP Corpus Value" stroke={GOLD} fill="url(#gSIP)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: SLATE }}>Gap between lines = Wealth created by compounding alone</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === "sensitivity" && (
              <>
                <SectionTitle icon="🔬">Sensitivity Analysis — Rate Reduction vs SIP Return</SectionTitle>
                <div style={{ fontSize: 13, color: SLATE, marginBottom: 16 }}>
                  Future SIP corpus (top) and wealth gain from compounding (bottom) for different rate cut & return combinations.
                </div>
                <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid #1E3A5F` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: NAVY_MID }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", color: GOLD, borderBottom: `1px solid ${GOLD}33`, whiteSpace: "nowrap" }}>Rate Reduction</th>
                        {calc.sensitivityReturns.map(r => (
                          <th key={r} style={{ padding: "12px 16px", textAlign: "center", color: GOLD, borderBottom: `1px solid ${GOLD}33`, minWidth: 120 }}>
                            {r}% SIP Return
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {calc.sensitivityData.map((row, ri) => (
                        <tr key={row.drop} style={{ background: ri % 2 === 0 ? NAVY : NAVY_MID }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: WHITE, borderRight: `1px solid #1E3A5F` }}>
                            -{row.drop.toFixed(2)}%
                            <div style={{ fontSize: 10, color: SLATE, fontWeight: 400 }}>
                              Saves {fmt((() => {
                                const nr = currentRate - row.drop;
                                const oe = calcEMI(loanAmt, currentRate, tenure);
                                const ne = calcEMI(loanAmt, nr, tenure);
                                return oe - ne;
                              })())}/mo
                            </div>
                          </td>
                          {row.cols.map((col, ci) => {
                            const intensity = col.fv / 1e7;
                            const bg = intensity > 1.5 ? `${SUCCESS}22` : intensity > 0.5 ? `${GOLD}15` : "transparent";
                            return (
                              <td key={ci} style={{ padding: "10px 12px", textAlign: "center", background: bg }}>
                                <div style={{ color: WHITE, fontWeight: 700, fontSize: 13 }}>{fmt(col.fv)}</div>
                                <div style={{ color: SUCCESS, fontSize: 11 }}>+{fmt(col.gain)}</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: SLATE }}>
                  <span>Top row = Total SIP corpus</span>
                  <span style={{ color: SUCCESS }}>Green = Compounding gain above investment</span>
                </div>
              </>
            )}

            {activeTab === "montecarlo" && (
              <>
                <SectionTitle icon="🎲">Monte Carlo Simulation — SIP Outcome Distribution</SectionTitle>
                <div style={{ fontSize: 13, color: SLATE, marginBottom: 20 }}>
                  500 simulations with randomized monthly returns around your {sipReturn}% target. Shows realistic outcome ranges.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                  <MetricCard label="Worst Case (P10)" value={fmt(calc.mc.worst)} sub="10th percentile" />
                  <MetricCard label="Base Case (P50)" value={fmt(calc.mc.base)} sub="Median outcome" accent />
                  <MetricCard label="Optimistic (P90)" value={fmt(calc.mc.best)} sub="90th percentile" />
                  <div style={{ background: NAVY_MID, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Prob. of ₹1 Cr+</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: calc.mc.probCrore > 50 ? SUCCESS : WARN }}>
                      {calc.mc.probCrore.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 11, color: "#5A7A9A" }}>Probability of crossing ₹1 Crore</div>
                  </div>
                </div>

                <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: GOLD, marginBottom: 16 }}>Range Comparison</div>
                  {[
                    { label: "Worst Case", value: calc.mc.worst, color: "#E74C3C", pct: 10 },
                    { label: "Base Case", value: calc.mc.base, color: GOLD, pct: 50 },
                    { label: "Optimistic", value: calc.mc.best, color: SUCCESS, pct: 90 },
                  ].map(({ label, value, color, pct }) => (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: SLATE }}>{label} <span style={{ color: "#3A5F80", fontSize: 11 }}>(P{pct})</span></span>
                        <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmt(value)}</span>
                      </div>
                      <div style={{ height: 8, background: "#1E3A5F", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4, background: color,
                          width: `${Math.min(100, (value / calc.mc.best) * 100).toFixed(1)}%`,
                          transition: "width 0.5s ease"
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: `${GOLD}11`, border: `1px solid ${GOLD}33`, borderRadius: 10, padding: 16, marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, marginBottom: 6 }}>⚠️ Important Disclaimer</div>
                  <div style={{ fontSize: 12, color: SLATE, lineHeight: 1.7 }}>
                    Monte Carlo simulations are based on randomized return distributions. Actual market returns are non-linear and subject to volatility, market risks, and macroeconomic factors. Past performance does not guarantee future results. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: 40, borderTop: `1px solid ${GOLD}22`, paddingTop: 24, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 4 }}>Raaj Wealth Sol</div>
          <div style={{ fontSize: 11, color: "#3A5F80", marginBottom: 12 }}>Making Financial Decisions Smarter Through Data</div>
          <div style={{ fontSize: 11, color: "#2A4F70", maxWidth: 700, margin: "0 auto", lineHeight: 1.7 }}>
            This dashboard is for educational and illustration purposes only. All calculations are approximations. 
            Investment in mutual funds/SIPs is subject to market risks. Please consult a SEBI-registered financial advisor before making investment decisions.
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#1E3A5F" }}>
            © 2025 Raaj Wealth Sol · For Advisor & Client Use Only
          </div>
        </div>
      </div>
    </div>
  );
}
