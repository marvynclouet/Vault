"""
Benchmark complet des capacités IA de Vault-PM.
Mesure : analyse PM Expert, Chat PM, latence, cas limites, stress.

Lancer : python eval/benchmark_full.py
Depuis la racine du projet (avec backend/.env configuré).

Sortie : rapport dans eval/benchmark_report.json + synthèse lisible en console.
"""
import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
_backend = _root / "backend"
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

_env = _backend / ".env"
if _env.exists():
    from dotenv import load_dotenv
    load_dotenv(_env)

from app.llm_router import analyze_project
from app.services.chat import chat_with_pm

# --- TESTS ANALYSE PM EXPERT ---
ANALYZE_TESTS = [
    {
        "name": "Idée claire (factures freelances)",
        "input": "Je veux créer une app pour que les freelances gèrent mieux leurs factures",
        "expected": {"type": "analysis", "min_stories": 5, "verdict_range": [40, 95]},
    },
    {
        "name": "Idée vague → clarification",
        "input": "un truc cool",
        "expected": {"type": "clarification", "min_questions": 2},
    },
    {
        "name": "Marketplace B2C",
        "input": "Une marketplace de location de matériel de sport entre particuliers dans les villes moyennes françaises",
        "expected": {"type": "analysis", "min_stories": 5, "verdict_range": [45, 90]},
    },
    {
        "name": "SaaS technique",
        "input": "Un outil de monitoring des performances web pour les équipes dev, avec alertes Slack et dashboards temps réel",
        "expected": {"type": "analysis", "min_stories": 5, "verdict_range": [50, 95]},
    },
    {
        "name": "Input long (stress tokens)",
        "input": (
            "Je veux une app mobile de gestion de budget personnel. "
            "L'utilisateur peut catégoriser ses dépenses, voir des graphiques, "
            "définir des objectifs d'épargne, recevoir des alertes quand il dépasse un seuil, "
            "et exporter ses données en CSV. Cible : jeunes actifs 25-35 ans en France. "
            "On vise un modèle freemium avec abonnement premium à 4,99€/mois."
        ),
        "expected": {"type": "analysis", "min_stories": 5, "verdict_range": [40, 95]},
    },
]

# --- TESTS CHAT PM ---
SAMPLE_PROJECT = {
    "project_name": "App Budget",
    "summary": "Application de gestion de budget personnel avec catégorisation des dépenses.",
    "tasks": [
        {"title": "Auth utilisateur", "description": "Login/register email", "assignee_role": "Developer", "priority": "Haute", "action_target": "Trello"},
        {"title": "Dashboard", "description": "Vue synthèse dépenses", "assignee_role": "Developer", "priority": "Haute", "action_target": "Trello"},
        {"title": "Catégories", "description": "Gérer catégories personnalisées", "assignee_role": "Developer", "priority": "Moyenne", "action_target": "Trello"},
    ],
}

CHAT_TESTS = [
    {
        "name": "Question simple",
        "messages": [],
        "user_message": "C'est quoi la priorité du dashboard ?",
        "expect_updates": False,
    },
    {
        "name": "Modification tâches",
        "messages": [],
        "user_message": "Retire la tâche Catégories et ajoute une tâche 'Export CSV' en priorité haute pour le Developer",
        "expect_updates": True,
    },
    {
        "name": "Changement priorités",
        "messages": [],
        "user_message": "Change les priorités : Auth en Basse, Dashboard reste Haute",
        "expect_updates": True,
    },
    {
        "name": "Conversation multi-tours",
        "messages": [
            {"role": "user", "content": "Combien de tâches on a ?"},
            {"role": "assistant", "content": "Tu as 3 tâches actuellement."},
        ],
        "user_message": "Ajoute une tâche de design du logo en priorité moyenne",
        "expect_updates": True,
    },
]

# --- STRESS : beaucoup de tâches ---
STRESS_PROJECT = {
    **SAMPLE_PROJECT,
    "tasks": [
        {"title": f"Tâche {i}", "description": f"Description tâche {i}", "assignee_role": "Developer", "priority": "Moyenne", "action_target": "Trello"}
        for i in range(1, 16)
    ],
}


async def run_analyze_test(test: dict, user_plan: str = "free") -> dict:
    t0 = time.perf_counter()
    try:
        result = await analyze_project(test["input"], user_plan=user_plan)
        elapsed = (time.perf_counter() - t0) * 1000
        data = result["data"]
        expected = test["expected"]
        passed = True
        errors = []

        if data.get("type") != expected["type"]:
            passed = False
            errors.append(f"type: got {data.get('type')}, expected {expected['type']}")

        if expected["type"] == "clarification":
            q = data.get("questions", [])
            if len(q) < expected.get("min_questions", 2):
                passed = False
                errors.append(f"questions: got {len(q)}, expected >= {expected['min_questions']}")

        if expected["type"] == "analysis":
            stories = data.get("user_stories", [])
            if len(stories) < expected.get("min_stories", 5):
                passed = False
                errors.append(f"stories: got {len(stories)}, expected >= {expected['min_stories']}")
            score = data.get("verdict", {}).get("score", -1)
            vmin, vmax = expected.get("verdict_range", [0, 100])
            if not (vmin <= score <= vmax):
                passed = False
                errors.append(f"score: got {score}, expected [{vmin}-{vmax}]")

        return {
            "passed": passed,
            "elapsed_ms": round(elapsed, 0),
            "engine": result.get("engine", "?"),
            "errors": errors,
        }
    except Exception as e:
        return {"passed": False, "elapsed_ms": (time.perf_counter() - t0) * 1000, "engine": "?", "errors": [str(e)]}


async def run_chat_test(test: dict) -> dict:
    project = STRESS_PROJECT if "stress" in test.get("name", "").lower() else SAMPLE_PROJECT
    t0 = time.perf_counter()
    try:
        result = await chat_with_pm(project, test["messages"], test["user_message"])
        elapsed = (time.perf_counter() - t0) * 1000
        has_updates = result.get("project_updates") is not None
        expect_updates = test.get("expect_updates", False)
        has_message = bool(result.get("message", "").strip())
        valid_json = "message" in result

        passed = valid_json and has_message and (has_updates == expect_updates)
        errors = []
        if not has_message:
            errors.append("message vide")
        if has_updates != expect_updates:
            errors.append(f"project_updates: got {has_updates}, expected {expect_updates}")
        if has_updates and "tasks" in result.get("project_updates", {}):
            tasks = result["project_updates"]["tasks"]
            for t in tasks:
                if not all(k in t for k in ["title", "priority", "assignee_role"]):
                    errors.append("tâche mal formée")
                    break

        return {"passed": passed, "elapsed_ms": round(elapsed, 0), "errors": errors}
    except Exception as e:
        return {"passed": False, "elapsed_ms": (time.perf_counter() - t0) * 1000, "errors": [str(e)]}


async def main():
    print("=" * 60)
    print("VAULT-PM — Benchmark capacités IA")
    print("=" * 60)

    # --- ANALYSE ---
    print("\n📊 ANALYSE PM EXPERT")
    print("-" * 40)
    analyze_results = []
    for i, test in enumerate(ANALYZE_TESTS):
        r = await run_analyze_test(test)
        analyze_results.append(r)
        status = "✅" if r["passed"] else "❌"
        print(f"  {status} {test['name']} — {r['elapsed_ms']:.0f}ms ({r['engine']})")
        for e in r.get("errors", []):
            print(f"      → {e}")

    # --- CHAT ---
    print("\n💬 CHAT PM")
    print("-" * 40)
    chat_results = []
    for i, test in enumerate(CHAT_TESTS):
        r = await run_chat_test(test)
        chat_results.append(r)
        status = "✅" if r["passed"] else "❌"
        print(f"  {status} {test['name']} — {r['elapsed_ms']:.0f}ms")
        for e in r.get("errors", []):
            print(f"      → {e}")

    # --- STRESS CHAT (15 tâches) ---
    print("\n🔥 STRESS — Chat avec 15 tâches")
    print("-" * 40)
    stress_test = {
        "name": "Stress 15 tâches",
        "messages": [],
        "user_message": "Change la priorité de la tâche 5 en Haute",
        "expect_updates": True,
    }
    r_stress = await run_chat_test(stress_test)
    status = "✅" if r_stress["passed"] else "❌"
    print(f"  {status} {stress_test['name']} — {r_stress['elapsed_ms']:.0f}ms")
    for e in r_stress.get("errors", []):
        print(f"      → {e}")

    # --- DÉBIT (optionnel) ---
    parallel_ok = None
    parallel_ms = None
    print("\n⚡ DÉBIT — 2 analyses en parallèle")
    print("-" * 40)
    t0 = time.perf_counter()
    try:
        r1, r2 = await asyncio.gather(
            run_analyze_test(ANALYZE_TESTS[0]),
            run_analyze_test(ANALYZE_TESTS[2]),
        )
        parallel_ms = (time.perf_counter() - t0) * 1000
        seq_est = analyze_results[0]["elapsed_ms"] + analyze_results[2]["elapsed_ms"]
        parallel_ok = r1["passed"] and r2["passed"]
        print(f"  Temps total : {parallel_ms:.0f}ms (vs ~{seq_est:.0f}ms en séquentiel)")
        print("  ✅ OK" if parallel_ok else "  ⚠️ Rate limit ou erreur")
    except Exception as e:
        print(f"  ⚠️ {e}")

    # --- CONSTRUIRE LE RAPPORT EXPLOITABLE ---
    a_ok = sum(1 for x in analyze_results if x["passed"])
    c_ok = sum(1 for x in chat_results if x["passed"])
    stress_ok = 1 if r_stress["passed"] else 0
    a_total = len(analyze_results)
    c_total = len(chat_results)
    a_avg = sum(x["elapsed_ms"] for x in analyze_results) / a_total if a_total else 0
    c_avg = sum(x["elapsed_ms"] for x in chat_results) / c_total if c_total else 0
    total_ok = a_ok + c_ok + stress_ok
    total_all = a_total + c_total + 1

    report = {
        "date": datetime.now().isoformat(),
        "verdict": "OK" if total_ok == total_all else "ÉCHEC" if total_ok < total_all * 0.7 else "PARTIEL",
        "score": {"reussi": total_ok, "total": total_all, "pourcentage": round(100 * total_ok / total_all)},
        "analyse": {
            "reussi": a_ok,
            "total": a_total,
            "latence_moyenne_sec": round(a_avg / 1000, 2),
            "details": [{"test": t["name"], "ok": r["passed"], "ms": r["elapsed_ms"], "engine": r.get("engine")} for t, r in zip(ANALYZE_TESTS, analyze_results)],
        },
        "chat": {
            "reussi": c_ok,
            "total": c_total,
            "latence_moyenne_sec": round(c_avg / 1000, 2),
            "details": [{"test": t["name"], "ok": r["passed"], "ms": r["elapsed_ms"]} for t, r in zip(CHAT_TESTS, chat_results)],
        },
        "stress": {"ok": r_stress["passed"], "ms": r_stress["elapsed_ms"]},
        "parallele": {"ok": parallel_ok, "ms": round(parallel_ms, 0) if parallel_ms else None} if parallel_ok is not None else None,
    }

    out_path = _root / "eval" / "benchmark_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n📄 Rapport JSON : {out_path}")

    # --- SYNTHÈSE LISIBLE ---
    print("\n" + "=" * 60)
    print("RAPPORT EXPLOITABLE")
    print("=" * 60)
    print(f"\n  Verdict : {report['verdict']} ({report['score']['pourcentage']}% de réussite)")
    print(f"\n  Analyse PM : {a_ok}/{a_total} tests OK — latence moyenne {report['analyse']['latence_moyenne_sec']} s")
    print(f"  Chat PM    : {c_ok}/{c_total} tests OK — latence moyenne {report['chat']['latence_moyenne_sec']} s")
    print(f"  Stress     : {'OK' if stress_ok else 'ÉCHEC'} ({r_stress['elapsed_ms']/1000:.1f} s)")

    # Interprétation
    print("\n  --- Ce que ça veut dire ---")
    if report["verdict"] == "OK":
        print("  → L'IA répond correctement dans tous les cas testés.")
    elif report["verdict"] == "PARTIEL":
        print("  → Certains cas échouent. Vérifier les tests en échec ci-dessus.")
    else:
        print("  → Problème majeur. Vérifier les clés API (GROQ_API_KEY) et la config.")

    if a_avg > 15000:
        print(f"  → Analyse lente ({a_avg/1000:.1f}s). Les inputs longs prennent plus de temps.")
    elif a_avg < 8000:
        print(f"  → Analyse rapide ({a_avg/1000:.1f}s). Bon pour l'UX.")
    if c_avg > 6000:
        print(f"  → Chat un peu lent ({c_avg/1000:.1f}s). Envisager un modèle plus léger.")
    else:
        print(f"  → Chat réactif ({c_avg/1000:.1f}s).")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
