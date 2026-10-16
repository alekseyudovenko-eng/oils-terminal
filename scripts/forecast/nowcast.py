"""Текущий прогноз модели fund на 3/6/12 мес. с поправкой на смещение и коридором 20–80% ошибок бэктеста.
Входные значения на 16.10.2026 заданы вручную в словаре x (FCPO 4760 MYR, USD/MYR 4.08, Brent 105, ONI авг. 2.16).
Запуск: python3 -I scripts/forecast/backtest.py, затем python3 scripts/forecast/nowcast.py из корня репозитория."""
import sys; sys.path.insert(0,'scripts/forecast')
import numpy as np, pandas as pd
import backtest as B
df=B.load(); bt=pd.read_csv('scripts/forecast/backtest_results.csv').dropna()
mean_spread=df.spread.rolling(60,min_periods=36).mean().loc['2026-07']
palm_now=4760/4.08
x={"spread_dev":np.log(1590.38/palm_now)-mean_spread,"oni":2.16,"oni_l3":0.95,"mom_b3":np.log(105/83.73),"mom_p3":np.log(palm_now/1106.47)}
print({k:round(v,3) for k,v in x.items()}, 'palm_now', round(palm_now,1))
cols=B.FEATS['fund']
for h in [3,6,12]:
    y=(df.lp.shift(-h)-df.lp); d=pd.concat([df[cols],y.rename('y')],axis=1).dropna()
    b=B.ols(d[cols].values,d.y.values); raw=B.predict(b,np.array([x[c] for c in cols]))
    e=(bt[bt.h==h].truth-bt[bt.h==h].fund)
    med=np.median(e); q20,q80=np.quantile(e,[.2,.8])
    adj=raw+med
    f=lambda r: round(4760*np.exp(r))
    print(h,'raw',round(raw,3),'bias-corr',round(adj,3),'→ MYR base',f(adj),'bear(q20)',f(raw+q20),'bull(q80)',f(raw+q80))
