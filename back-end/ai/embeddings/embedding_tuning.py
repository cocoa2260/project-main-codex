# !pip install sentence-transformers torch
# !pip install peft
# !pip install --upgrade torchao

# ----------------------------------------------------------- #

from sentence_transformers import SentenceTransformer
from transformers import AutoModel
from peft import LoraConfig, get_peft_model, TaskType

model_name = "dragonkue/snowflake-arctic-embed-l-v2.0-ko"

# 1. SentenceTransformer 모델 로드
model = SentenceTransformer(model_name)

# 2. SentenceTransformer 내부의 HuggingFace Transformer 모델 가져오기
# 일반적으로 SentenceTransformer는 여러 모듈로 구성되어 있으며,
# 첫 번째 모듈(model[0])이 Transformer 모델인 경우가 많다.
base_transformer_model = model[0].auto_model

# 3. LoRA 설정
lora_config = LoraConfig(
    r=8,  # LoRA의 저차원 행렬 차원(rank)
    lora_alpha=16,  # LoRA scaling 계수
    target_modules=["query", "value"],  # LoRA를 적용할 Attention 모듈
    lora_dropout=0.1,  # LoRA 레이어에 적용할 Dropout 비율
    bias="none",  # Bias는 학습하지 않음
    task_type=TaskType.FEATURE_EXTRACTION  # 임베딩 추출(Feature Extraction) 작업
)

# 4. Base Transformer 모델에 LoRA 적용
peft_model = get_peft_model(
    base_transformer_model,
    lora_config
)

print("LoRA 학습 대상 파라미터:")
peft_model.print_trainable_parameters()

# 5. SentenceTransformer 내부 Transformer를 LoRA 적용 모델로 교체
# 이후 Fine-tuning 시 전체 모델이 아닌 LoRA Adapter만 학습된다.
model[0].auto_model = peft_model

print(
    f"모델 '{model_name}' 에 LoRA 적용 완료. "
    f"현재 SentenceTransformer는 PEFT 방식으로 Fine-tuning 되도록 설정됨."
)

# ----------------------------------------------------------- #

from sentence_transformers import InputExample
from torch.utils.data import DataLoader

# Anchor(기준 문장)와 Positive(의미가 유사한 문장)로 구성된 학습 예시 데이터
data = [
    ("사과가 맛있다", "이 사과는 정말 맛있어.", 1),
    ("고양이가 귀엽다", "저 고양이는 너무 귀여워.", 1),
    ("강아지가 짖는다", "우리집 강아지는 멍멍 짖는다.", 1),
    ("책을 읽고 있다", "흥미로운 책을 읽는 중이다.", 1),
    ("날씨가 좋다", "오늘 날씨가 매우 화창하다.", 1)
]

# SentenceTransformer 학습에 사용할 InputExample 형식으로 변환
train_examples = []

for anchor, positive, label in data:
    train_examples.append(
        InputExample(
            texts=[anchor, positive],
            label=label
        )
    )

# 배치 단위로 데이터를 제공하기 위한 DataLoader 생성
train_dataloader = DataLoader(
    train_examples,
    shuffle=True,
    batch_size=4
)

print(
    f"{len(train_examples)}개의 학습 샘플 준비 완료"
)

# ----------------------------------------------------------- #

from sentence_transformers import losses

# MNR(Multiple Negatives Ranking) Loss 사용
# 입력 형식:
# [anchor, positive]
#
# 모델은 정답 유사도는 높이고,
# 오답 유사도는 낮추도록 학습

train_loss = losses.MultipleNegativesRankingLoss(
    model=model
)

# 학습 설정
num_epochs = 1

# Warmup Step 수 계산
# 전체 학습 스텝의 10%를 Warmup 구간으로 사용
warmup_steps = int(
    len(train_dataloader)
    * num_epochs
    * 0.1
)

print(
    f"{num_epochs} epoch 학습, "
    f"warmup step={warmup_steps}"
)

# 모델 학습 시작
model.fit(
    train_objectives=[
        (train_dataloader, train_loss)
    ],
    epochs=num_epochs,
    warmup_steps=warmup_steps,
    output_path="./output_model",
    show_progress_bar=True
)

print("Fine-tuning 완료")

# ----------------------------------------------------------- #

# LoRA Adapter만 저장
#
# 저장되는 파일:
# - adapter_model.safetensors
# - adapter_config.json

adapter_save_path = (
    "./fine_tuned_arctic_embed_ko_lora_adapter"
)

peft_model.save_pretrained(
    adapter_save_path
)

print(
    f"LoRA Adapter 저장 완료: "
    f"{adapter_save_path}"
)