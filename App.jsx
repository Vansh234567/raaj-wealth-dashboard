import { useState, useMemo  } from "react";


const GOLD = "#0090D0";
const GOLD_LIGHT = "#4AB8F0";
const NAVY = "#0D1B35";
const NAVY_MID = "#14285F";
const NAVY_LIGHT = "#1A3A7A";
const WHITE = "#FFFFFF";
const SLATE = "#5B6B85";
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
  const isMobile = window.innerWidth < 900;
  const [loanAmt, setLoanAmt] = useState(5000000);
  const [tenure] = useState(20);
  const [currentRate, setCurrentRate] = useState(9.0);
  const [newRate, setNewRate] = useState(8.0);
  const [sipReturn] = useState(16);
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
    
    return {
      origEMI: orig.emi,
      newEMI: revised.emi,
      monthlyEmiSaving,
      totalInterestSaved,
      sipFV,
      totalInvested,
      wealthGain,
    };
  }, [loanAmt, tenure, currentRate, newRate, sipReturn]);

  const tabStyle = (t) => ({
    flexShrink: 0,
    padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600,
    border: "none", transition: "all 0.2s",
    background: activeTab === t ? GOLD : "transparent",
    color: activeTab === t ? NAVY : SLATE,
  });

  return (
    <div style={{ background: "#F5F7FA", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: WHITE }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 100%)`, borderBottom: `1px solid ${GOLD}33`, padding: "16px 28px" }}>
       <div
  style={{
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "flex-start" : "center",
    gap: isMobile ? 20 : 0,
    maxWidth: 1400,
    margin: "0 auto",
  }}
>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
           <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#C2188B" />
      <stop offset="100%" stopColor="#5E2CA5" />
    </linearGradient>

    <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1EA7FD" />
      <stop offset="100%" stopColor="#2E3192" />
    </linearGradient>

    <linearGradient id="grad3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1EA7FD" />
      <stop offset="100%" stopColor="#2E3192" />
    </linearGradient>

    <linearGradient id="grad4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#7A1FA2" />
      <stop offset="100%" stopColor="#C2188B" />
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="45" height="45" rx="4" fill="url(#grad1)" />
  <path
    d="M0 0 C28 0 45 17 45 45 L45 45 L0 45 Z"
    fill="white"
fillOpacity="0.12"
  />
  <rect x="16" y="16" width="13" height="13" fill="white" />

  <rect x="55" y="0" width="45" height="45" rx="4" fill="url(#grad2)" />
  <path
    d="M55 0 C55 25 75 45 100 45 L100 45 L55 45 Z"
    fill="white"
fillOpacity="0.12"
  />
  <rect x="71" y="16" width="13" height="13" fill="white" />

  <rect x="0" y="55" width="45" height="45" rx="4" fill="url(#grad3)" />
  <path
    d="M0 55 C25 55 45 75 45 100 L45 100 L0 100 Z"
    fill="white"
fillOpacity="0.12"
  />
  <rect x="16" y="71" width="13" height="13" fill="white" />

  <rect x="55" y="55" width="45" height="45" rx="4" fill="url(#grad4)" />
  <path
    d="M55 55 C55 80 75 100 100 100 L100 100 L55 100 Z"
    fill="white"
fillOpacity="0.12"
  />
  <rect x="71" y="71" width="13" height="13" fill="white" />
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
      <div style={{ background: `linear-gradient(135deg, ${NAVY_MID} 0%, ${NAVY} 60%)`, padding: isMobile ? "24px 16px" : "40px 28px 32px", borderBottom: `1px solid ${GOLD}22`, textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Wealth Creation Framework</div>
          <h1 style={{ margin: "0 0 16px", fontSize: isMobile ? 24 : 32, fontWeight: 800, lineHeight: 1.2 }}>
            The <span style={{ color: GOLD }}>1% Rule</span> 
          </h1>
          <p style={{ fontSize: 15, color: SLATE, lineHeight: 1.7, maxWidth: 620, margin: "0 auto 24px" }}>
            A lower home loan interest rate can free up monthly cash flow. Investing those savings through SIPs allows compounding to build long-term wealth alongside home ownership.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "EMI Saved/Month", value: fmt(calc.monthlyEmiSaving) },
              { label: "Interest Saved", value: fmt(calc.totalInterestSaved) },
              { label: "SIP Corpus", value: fmt(calc.sipFV) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: `${GOLD}18`, border: `1px solid ${GOLD}44`, borderRadius: 10, padding: "10px 24px", minWidth: isMobile ? 120 : 140 }}>
                <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? "20px" : "32px" }}>

        {/* TABS */}
        <div
  style={{
    display: "flex",
    gap: 8,
    marginBottom: 28,
    background: NAVY_MID,
    padding: 6,
    borderRadius: 25,
    width: "fit-content",
  }}
>
  <button
    style={tabStyle("overview")}
    onClick={() => setActiveTab("overview")}
  >
    Overview
  </button>
</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 24, alignItems: "start" }}>

          {/* INPUT PANEL */}
          <div style={{ background: NAVY_MID, borderRadius: 14, border: `1px solid #1E3A5F`, padding: 22, position: isMobile ? "static" : "sticky",
top: isMobile ? 0 : 20}}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🏠 Home Loan Details</div>
              <div style={{ height: 1, background: `${GOLD}33`, marginBottom: 16 }} />
              <Slider label="Loan Amount" value={loanAmt} min={500000} max={20000000} step={100000}
                onChange={setLoanAmt} format={v => fmt(v)} />
              <Slider label="Current Interest Rate" value={currentRate} min={6} max={15} step={0.1}
                onChange={setCurrentRate} format={v => `${v.toFixed(1)}%`} />
              <Slider label="New Interest Rate" value={newRate} min={5} max={currentRate - 0.1} step={0.1}
                onChange={v => setNewRate(Math.min(v, currentRate - 0.1))} format={v => `${v.toFixed(1)}%`} />


       

            </div>
          </div>
       
          {/* MAIN CONTENT */}
          <div>

            {activeTab === "overview" && (
              <>
                {/* KEY METRICS */}
                <div style={{ marginBottom: 24 }}>
                  <SectionTitle icon="📊">Key Metrics</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns:
  isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
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
                    <span style={{ color: GOLD, fontWeight: 700 }}>{tenure} years</span>. The lower interest rate saves{" "}
<span style={{ color: GOLD, fontWeight: 700 }}>
  {fmt(calc.totalInterestSaved)}
</span>
{" "}in interest and can potentially create a SIP corpus of{" "}
                    <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(calc.sipFV)}</span> — where compounding alone contributes{" "}
                    <span style={{ color: SUCCESS, fontWeight: 700 }}>{fmt(calc.wealthGain)}</span> above your total investment.
                    The combination of debt optimization and disciplined investing is the most powerful wealth-creation strategy available to homebuyers."
                  </p>
                </div>

                {/* QUICK LOAN COMPARISON */}
                <div style={{ background: NAVY_MID, border: `1px solid #1E3A5F`, borderRadius: 14, padding: 22 }}>
                  <SectionTitle icon="⚖️">Loan Comparison</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
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
          </div>
        </div>

        <div
  style={{
    marginTop: 24,
    background: `linear-gradient(135deg, ${NAVY_MID}, ${NAVY})`,
    border: `1px solid ${GOLD}44`,
    borderRadius: 14,
    padding: 22,
    textAlign: "center",
  }}
>
  <div
    style={{
      fontSize: 22,
      fontWeight: 700,
      color: GOLD,
      marginBottom: 12,
    }}
  >
    Your Wealth Position After 20 Years
  </div>

<div
  style={{
    fontSize: 16,
    lineHeight: 1.8,
    color: SLATE,
  }}
>
  At the end of the loan tenure, you own your home and could also accumulate approximately{" "}
  <span
    style={{
      color: GOLD,
      fontWeight: 700,
    }}
  >
    {fmt(calc.sipFV)}
  </span>{" "}
  in your investment portfolio through disciplined SIP investing.

  <br />
  <br />

  In simple terms, you could potentially have:
  <br />
  🏠 Your fully owned house
  <br />
  💰 An investment corpus of approximately{" "}
  <span
    style={{
      color: SUCCESS,
      fontWeight: 700,
    }}
  >
    {fmt(calc.sipFV)}
  </span>
  .
</div>
          </div>
        {/* FOOTER */}
        <div style={{ marginTop: 40, borderTop: `1px solid ${GOLD}22`, paddingTop: 24, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 4 }}>Raaj Wealth Sol</div>
          <div style={{ fontSize: 11, color: "#7C8CA3", marginBottom: 12 }}>Making Financial Decisions Smarter Through Data</div>
          <div style={{ fontSize: 11, color: "#66758A", maxWidth: 700, margin: "0 auto", lineHeight: 1.7 }}>
            This dashboard is for educational and illustration purposes only. All calculations are approximations. 
            Investment in mutual funds/SIPs is subject to market risks. Please consult a SEBI-registered financial advisor before making investment decisions.
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#4B607A" }}>
            © 2025 Raaj Wealth Sol · For Advisor & Client Use Only
          </div>
        </div>
      </div>
    </div>
  );
}
