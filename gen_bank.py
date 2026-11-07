import random, json, math

random.seed(777)
N = 30

def ru(x):
    if isinstance(x, int):
        return str(x)
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")

def coef(n):
    return "" if n == 1 else f"{n}·"

# =================================================================
# T1 (Тема 2): таблица TU для двух благ -> найти (Qa, Qb)
# =================================================================
def gen_t1(rng, tries=500):
    Qmax = 6
    for _ in range(tries):
        k = rng.randint(3, 10)
        Pa = rng.choice([2, 3, 4, 5, 6])
        Pb = rng.choice([2, 3, 4, 5, 6])
        Qa_s = rng.randint(2, 5)
        Qb_s = rng.randint(2, 5)
        sa = rng.randint(2, 6)
        sb = rng.randint(2, 6)
        MUa_star = k * Pa
        MUb_star = k * Pb
        MUa = [MUa_star + sa * (Qa_s - q) for q in range(1, Qmax + 1)]
        MUb = [MUb_star + sb * (Qb_s - q) for q in range(1, Qmax + 1)]
        if min(MUa) <= 0 or min(MUb) <= 0:
            continue
        if not all(MUa[i] > MUa[i + 1] for i in range(Qmax - 1)):
            continue
        if not all(MUb[i] > MUb[i + 1] for i in range(Qmax - 1)):
            continue
        TUa = []
        s = 0
        for m in MUa:
            s += m
            TUa.append(s)
        TUb = []
        s = 0
        for m in MUb:
            s += m
            TUb.append(s)
        I = Pa * Qa_s + Pb * Qb_s
        best, best_set = -1, []
        for aa in range(Qmax + 1):
            for bb in range(Qmax + 1):
                if Pa * aa + Pb * bb <= I:
                    val = (TUa[aa - 1] if aa > 0 else 0) + (TUb[bb - 1] if bb > 0 else 0)
                    if val > best:
                        best, best_set = val, [(aa, bb)]
                    elif val == best:
                        best_set.append((aa, bb))
        if best_set != [(Qa_s, Qb_s)]:
            continue
        text = (
            "Общая полезность (TU, в ютилях) от потребления благ A и Б:\n"
            f"Qa: 1, 2, 3, 4, 5, 6\n"
            f"TUa: {', '.join(map(str, TUa))}\n"
            f"Qб: 1, 2, 3, 4, 5, 6\n"
            f"TUб: {', '.join(map(str, TUb))}\n"
            f"Цена блага A — {Pa} руб., блага Б — {Pb} руб. Бюджет потребителя — {I} руб.\n"
            "Найдите набор (Qa, Qб), максимизирующий общую полезность потребителя при заданном бюджете."
        )
        method = (
            f"MU(Q)=TU(Q)-TU(Q-1). Равновесие: MUa/Pa=MUб/Pб при Pa·Qa+Pб·Qб=I={I}. "
            f"Общий коэффициент MUa/Pa=MUб/Pб={k}."
        )
        return {
            "text": text, "method": method,
            "answer": {"Qa": Qa_s, "Qb": Qb_s},
            "inputs": [{"key": "Qa", "label": "Qa ="}, {"key": "Qb", "label": "Qб ="}],
        }
    raise RuntimeError("t1 failed")

# =================================================================
# T2 (Тема 3): таблица наборов на кривой безразличия -> найти (X*, Y*)
# =================================================================
def gen_t2(rng, tries=500):
    for _ in range(tries):
        m = rng.randint(2, 8)           # MRS = Px/Py = m (целое!)
        Xstar = rng.randint(3, 9)
        Ystar = m * Xstar
        if Ystar > 60:
            continue
        c = Xstar * Ystar
        divs = [d for d in range(2, c + 1) if c % d == 0]
        mid = [d for d in divs if 2 <= d <= 16 and 2 <= c // d <= 60]
        others = [d for d in mid if d != Xstar]
        if len(others) < 4:
            continue
        rng.shuffle(others)
        chosen = sorted(others[:4])
        Xs = sorted(chosen + [Xstar])
        if len(set(Xs)) < 5:
            continue
        Ys = [c // x for x in Xs]
        k = rng.randint(2, 6)
        Py = k
        Px = m * k
        if Px > 40 or Py > 40 or Px == Py:
            continue
        I = Px * Xstar + Py * Ystar
        matches = [x for x, y in zip(Xs, Ys) if Px * x + Py * y == I]
        if matches != [Xstar]:
            continue
        idx = Xs.index(Xstar)
        rows = "; ".join(f"Н{i+1}(X={x}; Y={y})" for i, (x, y) in enumerate(zip(Xs, Ys)))
        text = (
            f"Наборы благ X и Y лежат на одной кривой безразличия потребителя:\n{rows}.\n"
            f"Цена блага X — {Px} руб., блага Y — {Py} руб. Бюджет потребителя — {I} руб.\n"
            "Найдите набор (X*, Y*), который удовлетворяет бюджетному ограничению потребителя "
            "и является точкой его равновесия."
        )
        method = (
            f"Проверяем Px·X+Py·Y={I} для каждого набора. В точке равновесия MRSxy=Y/X=Px/Py={m}."
        )
        return {
            "text": text, "method": method,
            "answer": {"X": Xstar, "Y": Ystar},
            "inputs": [{"key": "X", "label": "X* ="}, {"key": "Y", "label": "Y* ="}],
        }
    raise RuntimeError("t2 failed")

# =================================================================
# T3 (Тема 4): изменение цены блага Б -> найти A2 при известном Б2
# =================================================================
def gen_t3(rng, tries=500):
    for _ in range(tries):
        Pa = rng.choice([2, 4, 5, 10])
        Pb1 = rng.choice([10, 15, 20, 25, 30])
        delta = rng.choice([-15, -10, -5, 5, 10, 15])
        Pb2 = Pb1 + delta
        if Pb2 <= 0 or Pb2 == Pb1:
            continue
        B1 = rng.randint(4, 12)
        A1 = rng.randint(4, 12)
        I = Pa * A1 + Pb1 * B1
        if Pb2 > Pb1:
            cand = range(1, B1)
        else:
            cand = range(B1 + 1, B1 + 12)
        best_cand, best_score = None, None
        for B2 in cand:
            rem = I - Pb2 * B2
            if rem > 0 and rem % Pa == 0:
                A2 = rem // Pa
                if A2 >= 1:
                    score = abs(B2 - B1)
                    if best_score is None or score < best_score:
                        best_score, best_cand = score, (B2, A2)
        if not best_cand or best_score > 8:
            continue
        B2, A2 = best_cand
        if A2 < 2 or A2 > 25:
            continue
        direction = "выросла" if Pb2 > Pb1 else "снизилась"
        text = (
            f"Доход потребителя фиксирован и равен {I} руб. Цена блага A — {Pa} руб. и не меняется. "
            f"Цена блага Б {direction} с {Pb1} до {Pb2} руб.\n"
            f"При цене Б = {Pb1} руб. потребитель покупал набор (A1={A1}; Б1={B1}).\n"
            f"При новой цене Б = {Pb2} руб. потребитель тратит весь доход и покупает Б2={B2} ед. блага Б.\n"
            "Найдите A2 — количество блага A, которое потребитель сможет купить при новой цене."
        )
        method = f"Бюджет: Pa·A2+Pб·Б2=I ⇒ A2=(I−Pб2·Б2)/Pa=({I}−{Pb2}·{B2})/{Pa}."
        return {
            "text": text, "method": method,
            "answer": {"A2": A2},
            "inputs": [{"key": "A2", "label": "A2 ="}],
        }
    raise RuntimeError("t3 failed")

# =================================================================
# T4 (Тема 5а): эластичность -> найти %ΔQd (целое число)
# =================================================================
def gen_t4(rng, tries=300):
    ED = [i / 10 for i in range(1, 10)]
    P10 = [10, 20, 30]
    for _ in range(tries):
        Ed = rng.choice(ED)
        Ei = rng.choice(ED)
        p1 = rng.choice(P10)
        p2 = rng.choice(P10)
        price_dir = rng.choice(["снизится", "увеличится"])
        sign_p = -1 if price_dir == "снизится" else 1
        dQ = -Ed * sign_p * p1 + Ei * p2
        if abs(dQ - round(dQ)) > 1e-9:
            continue
        dQ = int(round(dQ))
        if dQ == 0 or abs(dQ) > 25:
            continue
        text = (
            f"Ценовая эластичность спроса на товар равна {ru(Ed)}, эластичность спроса по доходу — {ru(Ei)}. "
            f"Цена товара {price_dir} на {p1}%, доходы покупателей увеличатся на {p2}% "
            "(цены прочих товаров не меняются).\n"
            "На сколько процентов изменится объём спроса на товар? Если спрос вырастет — введите "
            "положительное число, если упадёт — отрицательное."
        )
        method = f"%ΔQd = −Ed·(%ΔP) + Ei·(%ΔI), %ΔP={'−' if price_dir=='снизится' else '+'}{p1}%, %ΔI=+{p2}%."
        return {
            "text": text, "method": method,
            "answer": {"dQ": dQ},
            "inputs": [{"key": "dQ", "label": "ΔQd, % ="}],
        }
    raise RuntimeError("t4 failed")

# =================================================================
# T5 (Тема 5б): равновесие Qd=Qs -> найти P*, Q*
# =================================================================
def gen_t5(rng, tries=300):
    for _ in range(tries):
        Pstar = rng.randint(4, 14)
        Qstar = rng.randint(20, 90)
        b = rng.randint(1, 5)
        d = rng.randint(1, 5)
        a = Qstar + b * Pstar
        c = Qstar - d * Pstar
        if c < 0:
            continue
        text = (
            f"Спрос и предложение на товар заданы функциями: Qd = {a} − {coef(b)}P, "
            f"Qs = {c} + {coef(d)}P, где P — цена (руб.), Q — объём (тыс. ед.).\n"
            "Найдите равновесную цену P* и равновесный объём Q*."
        )
        method = f"Qd=Qs ⇒ {a}−{coef(b)}P={c}+{coef(d)}P ⇒ P*=({a}−{c})/({b}+{d})."
        return {
            "text": text, "method": method,
            "answer": {"P": Pstar, "Q": Qstar},
            "inputs": [{"key": "P", "label": "P* ="}, {"key": "Q", "label": "Q* ="}],
        }
    raise RuntimeError("t5 failed")

# =================================================================
# T6 (Тема 6): таблица TP -> найти L (убывающая отдача), L (AP max)
# =================================================================
def gen_t6(rng, tries=300):
    for _ in range(tries):
        m1 = rng.randint(6, 10)
        m2 = m1 + rng.randint(2, 5)
        m3 = m2 - rng.randint(2, 4)
        m4 = m3 - rng.randint(2, 4)
        m5 = m4 - rng.randint(1, 3)
        if min(m1, m2, m3, m4, m5) <= 0:
            continue
        if not (m2 > m1 and m3 < m2 and m4 < m3 and m5 < m4):
            continue
        TP = [0]
        for m in (m1, m2, m3, m4, m5):
            TP.append(TP[-1] + m)
        AP = [None] + [TP[L] / L for L in range(1, 6)]
        ap_max_L = max(range(1, 6), key=lambda L: AP[L])
        dr_L = 3
        text = (
            "Общий продукт (TP) переменного фактора (труда) при разных значениях затрат труда L "
            "(прочие факторы фиксированы):\n"
            f"L: 0, 1, 2, 3, 4, 5\n"
            f"TP: {', '.join(map(str, TP))}\n"
            "1) Начиная с какого значения L вступает в действие закон убывающей предельной отдачи?\n"
            "2) При каком L средний продукт AP достигает максимума?"
        )
        method = "MP(L)=TP(L)-TP(L-1); AP(L)=TP(L)/L. Убывающая отдача — там, где MP начинает падать."
        return {
            "text": text, "method": method,
            "answer": {"Ldr": dr_L, "Lap": ap_max_L},
            "inputs": [{"key": "Ldr", "label": "L (убыв. отдача) ="}, {"key": "Lap", "label": "L (AP max) ="}],
        }
    raise RuntimeError("t6 failed")

GENERATORS = [
    ("t1", "Тема 2 — равновесие потребителя (TU)", gen_t1),
    ("t2", "Тема 3 — кривая безразличия", gen_t2),
    ("t3", "Тема 4 — изменение цены (бюджетная линия)", gen_t3),
    ("t4", "Тема 5 — эластичность спроса", gen_t4),
    ("t5", "Тема 5 — равновесие спроса и предложения", gen_t5),
    ("t6", "Тема 6 — TP / AP / MP", gen_t6),
]

bank = {}
for key, title, fn in GENERATORS:
    items = []
    for i in range(1, N + 1):
        rng = random.Random(10000 + hash(key) % 1000 + i * 97)
        item = fn(rng)
        item["id"] = f"{key}-{i:02d}"
        items.append(item)
    bank[key] = {"title": title, "items": items}

with open("/tmp/build3/bank.json", "w", encoding="utf-8") as f:
    json.dump(bank, f, ensure_ascii=False, indent=2)

for key, title, _ in GENERATORS:
    print(key, title, "->", len(bank[key]["items"]), "problems")
print(json.dumps(bank["t1"]["items"][0], ensure_ascii=False, indent=2))
print(json.dumps(bank["t2"]["items"][0], ensure_ascii=False, indent=2))
