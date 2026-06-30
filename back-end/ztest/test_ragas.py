from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass

from db.database import SessionLocal

from tasks.search_tasks import process_search_chunks
from services.chat_service import answer_document_question

from core.config import settings


TOP_K = 5
COMPARE_TOP_N = 3
DOCUMENT_ID = "51cb3042-226d-41f0-8cfa-daec6382f765"
TASK_ID = "ragas-eval"
EMBEDDING_MODEL = "snowflake-ko-lora"


@dataclass
class EvalCase:
    question: str
    references: list[str]

@dataclass
class LLMEvalCase:
    question: str
    references: list[str]
    reference_answer: str


EVAL_CASES = [
    # 1. 문서 표현과 질문 표현이 거의 동일한 경우
    EvalCase(
        question="3·15의거의 진상규명 업무는 어느 기관에서 수행하는가?",
        references=[
            "진실ㆍ화해를 위한 과거사정리위원회",
            "진상규명",
            "제3조",
        ],
    ),

    # 2. 의미는 같지만 표현이 다른 경우
    EvalCase(
        question="3·15 민주운동 사건 조사 책임 기관은 어디인가?",
        references=[
            "진실ㆍ화해를 위한 과거사정리위원회",
            "3ㆍ15의거",
            "진상규명",
        ],
    ),

    # 3. 특별재심 관련 질의
    EvalCase(
        question="3·15의거 관련 사건으로 유죄 판결을 받은 사람은 재심 청구가 가능한가?",
        references=[
            "특별재심",
            "유죄의 확정판결",
            "재심을 청구할 수 있다",
            "제7조",
        ],
    ),

    # 4. 기념사업 및 재정지원
    EvalCase(
        question="국가가 3·15의거 정신 계승을 위해 해야 하는 일은 무엇인가?",
        references=[
            "기념사업",
            "3ㆍ15의거 정신",
            "제8조",
        ],
    ),

    # 5. 의도적 오탐지(문서에 없는 내용)
    EvalCase(
        question="3·15의거 참여자에게 국가 보상금 지급 기준은 무엇인가?",
        references=[],
    ),
]


EVAL_LLM_CASES = [
    LLMEvalCase(
        question="3·15의거의 진상규명 업무는 어느 기관에서 수행하는가?",
        references=[
            "진실ㆍ화해를 위한 과거사정리위원회",
            "진상규명",
            "제3조",
        ],
        reference_answer="""
        3·15의거의 진상규명은 「진실ㆍ화해를 위한 과거사정리 기본법」에 따라
        진실·화해를 위한 과거사정리위원회에서 수행한다.
        """
    ),

    LLMEvalCase(
        question="3·15 민주운동 사건 조사 책임 기관은 어디인가?",
        references=[
            "진실ㆍ화해를 위한 과거사정리위원회",
            "3ㆍ15의거",
            "진상규명",
        ],
        reference_answer="""
        3·15의거 사건의 조사 및 진상규명은
        진실·화해를 위한 과거사정리위원회가 담당한다.
        """
    ),

    LLMEvalCase(
        question="3·15의거 관련 사건으로 유죄 판결을 받은 사람은 재심 청구가 가능한가?",
        references=[
            "특별재심",
            "유죄의 확정판결",
            "재심을 청구할 수 있다",
            "제7조",
        ],
        reference_answer="""
        가능하다. 3·15의거와 관련한 행위로 유죄의 확정판결 또는
        면소판결을 선고받은 사람은 형사소송법 등의 일반 규정에도
        불구하고 재심을 청구할 수 있다.
        """
    ),

    LLMEvalCase(
        question="국가가 3·15의거 정신 계승을 위해 해야 하는 일은 무엇인가?",
        references=[
            "기념사업",
            "3ㆍ15의거 정신",
            "제8조",
        ],
        reference_answer="""
        국가는 3·15의거 정신을 계승하기 위한 기념사업을 추진해야 한다.
        """
    ),

    # Hallucination 평가용
    LLMEvalCase(
        question="3·15의거 참여자에게 국가 보상금 지급 기준은 무엇인가?",
        references=[],
        reference_answer="""
        제공된 법률에는 참여자 보상금 지급 기준에 관한 규정이 존재하지 않는다.
        """
    ),
]


def match_context(text: str, refs: list[str]) -> bool:
    text = "".join(text.lower().split())

    return any(
        "".join(ref.lower().split()) in text
        for ref in refs
    )


async def ragas_score(contexts: list[str], refs: list[str]):
    try:
        from ragas import SingleTurnSample
        from ragas.metrics import NonLLMContextPrecisionWithReference

        sample = SingleTurnSample(
            retrieved_contexts=contexts,
            reference_contexts=refs
        )

        metric = NonLLMContextPrecisionWithReference()

        return await metric.single_turn_ascore(sample)

    except Exception as e:
        print(f"RAGAS skipped: {e}")
        return None

async def ragas_answer_score(
    question: str,
    answer: str,
    reference_answer: str,
    retrieved_contexts: list[str],
):
    try:
        from ragas import SingleTurnSample
        from ragas.metrics import (
            AnswerCorrectness,
            Faithfulness,
        )

        from langchain_ollama import ChatOllama

        sample = SingleTurnSample(
            user_input=question,
            response=answer,
            reference=reference_answer,
            retrieved_contexts=retrieved_contexts,
        )

        evaluator_llm = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model="qwen3.5:4b",
            temperature=0,
            reasoning=False,
        )

        # 평가 규칙 설정

        # 의미 유사도(embedding)는 제거하고 정답과의 사실 일치 여부만 평가
        answer_metric = AnswerCorrectness(
            llm=evaluator_llm,
            weights=[1.0,0.0],
        )

        # 답변이 검색된 retrieval 내용만 사용했는지 평가
        faithfulness_metric = Faithfulness(
            llm=evaluator_llm,
        )

        # 평가 실행

        # 생성 답변과 정답의 일치 여부
        answer_score = await answer_metric.single_turn_ascore(
            sample
        )

        # 답변 생성이 retrieval 문서를 벗어나는지 평가
        faithfulness_score = await faithfulness_metric.single_turn_ascore(
            sample
        )

        # 단순 hallucination 판정
        hallucination = (
            faithfulness_score < 0.5
        )

        return {
            "answer_correctness": answer_score,
            "faithfulness": faithfulness_score,
            "hallucination": hallucination,
        }

    except Exception as e:
        print(f"Answer evaluation skipped: {e}")
        return None

async def evaluate(case: EvalCase):

    db = SessionLocal()

    # retrieval
    results = process_search_chunks(
        db = db,
        document_id=DOCUMENT_ID,
        task_id=TASK_ID,
        question=case.question,
        embedding_model=EMBEDDING_MODEL,
        top_k=TOP_K,
    )

    # 결과 정리
    contexts = [
        {
            "content": chunk["content"],
            "file_name": chunk.get("file_name"),
            "score": score
        }
        for chunk, score in results
    ]

    # ragas 입력
    retrieved_texts = [
        c["content"]
        for c in contexts
    ]

    ragas = await ragas_score(
        retrieved_texts,
        case.references
    )

    # 첫 매칭 위치
    first_rank = next(
        (
            i
            for i, c in enumerate(contexts, 1)
            if match_context(
                c["content"],
                case.references
            )
        ),
        None
    )

    # 출력
    print("\n===================")
    print("Question:", case.question)
    print("RAGAS:", ragas)
    print("First relevant rank:", first_rank)

    print("\nTop results")
    print("rank | score | matched | file")

    for i, c in enumerate(contexts[:COMPARE_TOP_N], 1):

        matched = match_context(
            c["content"],
            case.references
        )

        preview = (
            c["content"]
            .replace("\n", " ")[:100]
        )

        print(
            f"{i:>4} | "
            f"{c['score']:.4f} | "
            f"{matched} | "
            f"{c['file_name']}"
        )

        print(f"      {preview}")

   
async def evaluate_llm(case: LLMEvalCase):

    db = SessionLocal()

    USER_ID = "0b661179-8ca1-40ad-8d19-70137ac11612"
    SESSION_ID = None

    # 답변 생성
    chat_result = answer_document_question(
        db=db,
        document_id=DOCUMENT_ID,
        user_id=USER_ID,
        message=case.question,
        session_id=SESSION_ID,
    )

    answer = chat_result.answer

    print(answer, flush=True)

    # 검색 context도 가져오기
    results = process_search_chunks(
        db=db,
        document_id=DOCUMENT_ID,
        task_id=TASK_ID,
        question=case.question,
        embedding_model=EMBEDDING_MODEL,
        top_k=TOP_K,
    )

    retrieved_contexts = [
        chunk["content"]
        for chunk, _ in results
    ]

    scores = await ragas_answer_score(
        question=case.question,
        answer=answer,
        reference_answer=case.reference_answer,
        retrieved_contexts=retrieved_contexts,
    )

    print("\nLLM evaluation")

    print("Question: ", case.question)

    if scores:
        print(
            "AnswerCorrectness:",
            scores["answer_correctness"]
        )

        print(
            "Faithfulness:",
            scores["faithfulness"]
        )

        print(
            "Hallucination:",
            scores["hallucination"]
        )

    print("\nGenerated answer:")
    print(answer[:500])



async def main():
    # for case in EVAL_CASES:
    #     await evaluate(case)

    for case in EVAL_LLM_CASES:
        await evaluate_llm(case)


if __name__ == "__main__":
    asyncio.run(main())