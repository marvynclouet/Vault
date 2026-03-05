"""
Pipeline d'évaluation du PM Expert.
Lancer depuis la racine du projet : python eval/benchmark.py
Ou depuis backend : python -m eval.benchmark (avec PYTHONPATH=..)
"""
import asyncio
import json
import sys
from pathlib import Path

# Ajouter backend au path
_root = Path(__file__).resolve().parent.parent
_backend = _root / 'backend'
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

# Charger le .env du backend
_env = _backend / ".env"
if _env.exists():
    from dotenv import load_dotenv
    load_dotenv(_env)

from app.llm_router import analyze_project

TEST_CASES = [
    {
        "input": "Je veux créer une app pour que les freelances gèrent mieux leurs factures",
        "expected": {
            "type": "analysis",
            "min_stories": 2,
            "must_have_fields": ["problem", "lean_canvas", "verdict"],
            "verdict_range": [40, 90],
        },
    },
    {
        "input": "un truc cool",
        "expected": {
            "type": "clarification",
            "min_questions": 2,
        },
    },
    {
        "input": "Une marketplace de location de matériel de sport entre particuliers dans les villes moyennes françaises",
        "expected": {
            "type": "analysis",
            "min_stories": 2,
            "must_have_fields": ["problem", "lean_canvas", "verdict"],
            "verdict_range": [50, 85],
        },
    },
]


async def run_benchmark():
    results = {"total": 0, "passed": 0, "failed": 0, "details": []}

    for i, test in enumerate(TEST_CASES):
        results["total"] += 1

        try:
            result = await analyze_project(test["input"], user_plan="free")
            data = result["data"]
            expected = test["expected"]
            passed = True
            errors = []

            # Check type
            if data.get("type") != expected["type"]:
                passed = False
                errors.append(f"Type: got {data.get('type')}, expected {expected['type']}")

            # Check clarification
            if expected["type"] == "clarification":
                questions = data.get("questions", [])
                if len(questions) < expected.get("min_questions", 2):
                    passed = False
                    errors.append(
                        f"Questions: got {len(questions)}, expected >= {expected['min_questions']}"
                    )

            # Check analysis
            if expected["type"] == "analysis":
                for field in expected.get("must_have_fields", []):
                    if field not in data:
                        passed = False
                        errors.append(f"Missing field: {field}")

                stories = data.get("user_stories", [])
                if len(stories) < expected.get("min_stories", 3):
                    passed = False
                    errors.append(
                        f"Stories: got {len(stories)}, expected >= {expected['min_stories']}"
                    )

                score = data.get("verdict", {}).get("score", -1)
                vmin, vmax = expected.get("verdict_range", [0, 100])
                if not (vmin <= score <= vmax):
                    passed = False
                    errors.append(f"Score: got {score}, expected [{vmin}-{vmax}]")

            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"  Test {i + 1}: {status} ({result['engine']})")
            if errors:
                for e in errors:
                    print(f"    → {e}")

            if passed:
                results["passed"] += 1
            else:
                results["failed"] += 1

        except Exception as e:
            results["failed"] += 1
            print(f"  Test {i + 1}: 💥 ERROR - {e}")

    print(f"\n{'='*50}")
    print(f"RESULTS: {results['passed']}/{results['total']} passed")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(run_benchmark())
