from sentence_transformers import SentenceTransformer
from peft import PeftModel
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


BASE_MODEL = "dragonkue/snowflake-arctic-embed-l-v2.0-ko"

HF_LORA_MODEL = "skdiwlsdn5/snowflake-Lora-512"

LOCAL_ADAPTER_PATH = (
    "ai/embeddings/models/adapter"
)


#############################################
# 모델 로딩
#############################################

def load_base_model():

    model = SentenceTransformer(
        BASE_MODEL
    )

    return model


def load_hf_lora_model():

    model = SentenceTransformer(
        HF_LORA_MODEL
    )

    return model


def load_local_adapter_model():

    model = SentenceTransformer(
        BASE_MODEL
    )

    base_transformer = (
        model[0].auto_model
    )

    peft_model = (
        PeftModel.from_pretrained(
            base_transformer,
            LOCAL_ADAPTER_PATH
        )
    )

    merged_model = (
        peft_model.merge_and_unload()
    )

    model[0].auto_model = (
        merged_model
    )

    return model


#############################################
# 예시 데이터
#############################################

documents = [

    "제11조 제공기관은 가사서비스 이용계약 내용을 명확히 안내해야 한다.",

    "이용자는 계약 기간 동안 서비스 이용요금을 지급해야 한다.",

    "제15조 제공기관은 계약 위반 시 계약을 해지할 수 있다.",

    "이용자가 의무를 위반하면 서비스 이용이 제한될 수 있다.",

    "제20조 예외 사유가 존재하는 경우 계약 종료가 가능하다.",

    "가사근로자의 휴게시간 및 근로조건을 보장해야 한다.",

    "시스템 성능 개선을 위해 embedding model 학습을 진행한다."
]


question = """
제공기관이 계약을 해지할 수 있는 조건과
계약 종료 관련 예외사항을 알려줘
"""


#############################################
# 검색 함수
#############################################

def search(
    model,
    query,
    docs,
    top_k=5
):

    query_emb = model.encode(
        query,
        normalize_embeddings=True
    )

    doc_embs = model.encode(
        docs,
        normalize_embeddings=True
    )

    scores = cosine_similarity(
        [query_emb],
        doc_embs
    )[0]

    ranked = sorted(
        zip(
            docs,
            scores
        ),
        key=lambda x: x[1],
        reverse=True
    )

    return ranked[:top_k]


#############################################
# 결과 출력
#############################################

models = {

    "BASE":
        load_base_model(),

    "HF_LORA":
        load_hf_lora_model(),

    "LOCAL_ADAPTER":
        load_local_adapter_model(),
}


for name, model in models.items():

    print()
    print("=" * 80)
    print(name)
    print("=" * 80)

    results = search(
        model,
        question,
        documents
    )

    for rank, (
        doc,
        score
    ) in enumerate(
        results,
        start=1
    ):

        print(
            f"{rank}. "
            f"[{score:.4f}] "
            f"{doc}"
        )
