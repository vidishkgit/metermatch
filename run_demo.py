import pandas as pd, numpy as np
import fund_scorer as fs

# --- load data (any category works; here we have the small-cap universe) ---
df = pd.read_csv("ranked.csv")
df["category"] = "Small Cap"          # real feed would carry many categories
keep = ["name","category","cagr","r1","r2","r3","r5","r7","r10","r15",
        "sharpe","upcap","infratio","downcap","sd","beta","pe","ter"]
df = df[[c for c in keep if c in df.columns]]
print(f"Loaded {len(df)} funds across {df['category'].nunique()} category(ies)\n")

# --- run every risk profile ---
for p in fs.ORDER:
    prof = fs.RISK_PROFILES[p]
    ranked = fs.score_funds(df, p)
    print("="*64)
    print(f"PROFILE: {prof.name}")
    print("="*64)
    for i,(_,r) in enumerate(ranked.head(5).iterrows(),1):
        print(f" {i}. {r['name']:32} score={r['score']:5}  "
              f"1Y={r['r1']:5}  3Y={r['r3'] if not pd.isna(r['r3']) else '  -':>5}  "
              f"beta={r['beta']}  SD={r['sd']}")
    ranked.to_csv(f"scored_{p}.csv", index=False)
    print()

# --- continuous risk dial demo (blend balanced -> aggressive) ---
print("="*64)
print("RISK DIAL  (blend balanced -> aggressive)  -  #1 fund at each step")
print("="*64)
for t in [0.0,0.25,0.5,0.75,1.0]:
    prof = fs.blend_profiles("balanced","aggressive",t)
    top = fs.score_funds(df, prof).iloc[0]
    print(f"  t={t:.2f}  ->  {top['name']:30} (score {top['score']})")

# --- category-aware proof: top 3 per category, >=5yr record only ---
print("\n"+"="*64)
print("top_n(profile='balanced', n=3, min_history='r5')  per category")
print("="*64)
res = fs.top_n(df, "balanced", n=3, min_history="r5")
print(res[["category","name","score"]].to_string(index=False))
