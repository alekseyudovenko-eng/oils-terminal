"""Бэктест моделей прогноза цены пальмового масла (месячные данные IMF/FRED, USD/т).

Модели (прямой прогноз на горизонт h месяцев, переобучение на расширяющемся окне):
  rw    — случайное блуждание: цена через h месяцев = текущая;
  mom   — регрессия доходности на импульс самой пальмы (3 мес.);
  fund  — фундаментальная регрессия: отклонение спреда соя/пальма от 5-летнего среднего,
          ONI (Эль-Ниньо) с лагом, импульс Brent, импульс пальмы.
Метрики: RMSE лог-ошибки и доля угаданных направлений, с 2012 года.
Запуск: python3 -I scripts/forecast/backtest.py
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
H = [1, 3, 6, 12]


def load():
    p = pd.read_csv(ROOT / "data/history/monthly_prices.csv")
    o = pd.read_csv(ROOT / "data/history/oni.csv")
    df = p.merge(o, on="month", how="left").dropna(subset=["palm", "soy", "brent"])
    df["month"] = pd.PeriodIndex(df["month"], freq="M")
    df = df.set_index("month").sort_index()
    df["lp"] = np.log(df.palm)
    df["spread"] = np.log(df.soy / df.palm)                      # соя дороже пальмы → пальма отстаёт
    df["spread_dev"] = df.spread - df.spread.rolling(60, min_periods=36).mean()
    df["oni_l3"] = df.oni.shift(3)
    df["mom_p3"] = df.lp - df.lp.shift(3)
    df["mom_b3"] = np.log(df.brent) - np.log(df.brent).shift(3)
    return df


FEATS = {
    "mom": ["mom_p3"],
    "fund": ["spread_dev", "oni", "oni_l3", "mom_b3", "mom_p3"],
}


def ols(X, y):
    X1 = np.column_stack([np.ones(len(X)), X])
    beta, *_ = np.linalg.lstsq(X1, y, rcond=None)
    return beta


def predict(beta, x):
    return beta[0] + np.dot(beta[1:], x)


def backtest(df, start="2012-01"):
    rows = []
    idx = df.index
    for h in H:
        y = (df.lp.shift(-h) - df.lp)
        for t in idx[idx >= pd.Period(start, "M")]:
            if t + h > idx[-1]:
                break
            truth = y.loc[t]
            rec = {"h": h, "t": str(t), "truth": truth, "rw": 0.0}
            train = df.loc[: t - h]        # только то, что было известно на момент t
            ytr = y.loc[: t - h]
            for name, cols in FEATS.items():
                d = pd.concat([train[cols], ytr.rename("y")], axis=1).dropna()
                if len(d) < 60 or df.loc[t, cols].isna().any():
                    rec[name] = np.nan
                    continue
                b = ols(d[cols].values, d.y.values)
                rec[name] = predict(b, df.loc[t, cols].values.astype(float))
            rows.append(rec)
    return pd.DataFrame(rows)


def summarize(bt):
    out = []
    for h, g in bt.groupby("h"):
        g = g.dropna()
        r = {"h": h, "n": len(g)}
        for m in ["rw", "mom", "fund"]:
            err = g[m] - g.truth
            r[f"rmse_{m}"] = float(np.sqrt(np.mean(err ** 2)))
            if m != "rw":
                r[f"hit_{m}"] = float(np.mean(np.sign(g[m]) == np.sign(g.truth)))
        r["skill_fund_vs_rw"] = 1 - r["rmse_fund"] / r["rmse_rw"]
        out.append(r)
    return pd.DataFrame(out)


if __name__ == "__main__":
    df = load()
    bt = backtest(df)
    s = summarize(bt)
    pd.set_option("display.width", 200)
    print(s.round(3).to_string(index=False))
    bt.to_csv(ROOT / "scripts/forecast/backtest_results.csv", index=False)
