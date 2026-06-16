import json
from pathlib import Path
from typing import Any, Dict, List


BASE_DIR = Path(__file__).resolve().parent
MAPPING_PATH = BASE_DIR / "lbox_mapping.json"
REPORT_PATH = BASE_DIR / "output" / "summarization_plus_validation_report.json"


def load_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def has_broken_korean(text: str) -> bool:
    # 대표적인 인코딩 깨짐 문자 체크
    broken_markers = ["�", "\ufffd"]
    return any(marker in text for marker in broken_markers)


def has_suspicious_newline(text: str) -> bool:
    # 줄바꿈 자체는 정상. 다만 과도한 빈 줄이나 깨진 escape 흔적만 체크
    return "\r" in text or "\\n\\n\\n" in text


def validate_item(
    item: Dict[str, str],
    min_input_length: int,
    min_output_length: int,
) -> List[str]:
    errors = []

    instruction = item.get("instruction", "")
    input_text = item.get("input", "")
    output_text = item.get("output", "")

    if not instruction.strip():
        errors.append("EMPTY_INSTRUCTION")

    if not input_text.strip():
        errors.append("EMPTY_INPUT")

    if not output_text.strip():
        errors.append("EMPTY_OUTPUT")

    if len(input_text.strip()) < min_input_length:
        errors.append("INPUT_TOO_SHORT")

    if len(output_text.strip()) < min_output_length:
        errors.append("OUTPUT_TOO_SHORT")

    if has_broken_korean(input_text) or has_broken_korean(output_text):
        errors.append("BROKEN_KOREAN_ENCODING")

    if has_suspicious_newline(input_text) or has_suspicious_newline(output_text):
        errors.append("SUSPICIOUS_NEWLINE")

    return errors


def convert_job(config: Dict[str, Any], job: Dict[str, str]) -> Dict[str, Any]:
    instruction = config["instruction"]
    source_input_field = config["source_fields"]["input"]
    source_output_field = config["source_fields"]["output"]

    min_input_length = config["validation"]["min_input_length"]
    min_output_length = config["validation"]["min_output_length"]

    source_path = BASE_DIR / job["source"]
    target_path = BASE_DIR / job["target"]
    target_path.parent.mkdir(parents=True, exist_ok=True)

    total = 0
    converted = 0
    skipped = 0
    error_counts: Dict[str, int] = {}
    samples: List[Dict[str, Any]] = []

    with source_path.open("r", encoding="utf-8") as fin, target_path.open(
        "w", encoding="utf-8"
    ) as fout:
        for line_no, line in enumerate(fin, start=1):
            total += 1

            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                error_counts["INVALID_JSON"] = error_counts.get("INVALID_JSON", 0) + 1
                continue

            input_text = str(row.get(source_input_field, "")).strip()
            output_text = str(row.get(source_output_field, "")).strip()

            item = {
                "instruction": instruction,
                "input": input_text,
                "output": output_text,
            }

            errors = validate_item(
                item,
                min_input_length=min_input_length,
                min_output_length=min_output_length,
            )

            if errors:
                for error in errors:
                    error_counts[error] = error_counts.get(error, 0) + 1

                if len(samples) < 20:
                    samples.append(
                        {
                            "line_no": line_no,
                            "errors": errors,
                            "input_preview": input_text[:120],
                            "output_preview": output_text[:120],
                        }
                    )

            # 학습 파일에는 비어있는 input/output만 제외하고 저장
            # 너무 짧은 summary 등은 report에는 남기되, 일단 학습 후보로 유지
            if not input_text or not output_text:
                skipped += 1
                continue

            fout.write(json.dumps(item, ensure_ascii=False) + "\n")
            converted += 1

    return {
        "name": job["name"],
        "source": str(source_path),
        "target": str(target_path),
        "total": total,
        "converted": converted,
        "skipped": skipped,
        "error_counts": error_counts,
        "sample_errors": samples,
    }


def main() -> None:
    config = load_json(MAPPING_PATH)

    reports = []
    for job in config["jobs"]:
        print(f"Processing: {job['name']}")
        report = convert_job(config, job)
        reports.append(report)
        print(
            f"  total={report['total']} "
            f"converted={report['converted']} "
            f"skipped={report['skipped']}"
        )
        print(f"  errors={report['error_counts']}")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8") as f:
        json.dump({"reports": reports}, f, ensure_ascii=False, indent=2)

    print(f"\nValidation report saved: {REPORT_PATH}")


if __name__ == "__main__":
    main()